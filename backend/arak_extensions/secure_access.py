"""Invitation-only identity lifecycle for ARAAK CEO Office."""
from __future__ import annotations

import hashlib
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, EmailStr

try:
    from .. import server as core
except (ImportError, ValueError):
    import server as core  # type: ignore

logger = logging.getLogger("nexgen-executives.secure-access")
INVITE_TTL_HOURS = max(1, int(os.getenv("INVITE_TTL_HOURS", "24")))
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://nexgen-executives.vercel.app").rstrip("/")
ROLE_VALUES = ("admin", "ceo", "vp_development", "vp_investment", "dev_manager", "tracker")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _new_invitation() -> tuple[str, str, str]:
    token = secrets.token_urlsafe(36)
    expires_at = _iso(_utcnow() + timedelta(hours=INVITE_TTL_HOURS))
    return token, expires_at, f"{FRONTEND_URL}/activate?token={token}"


def _public_user(user: dict) -> dict:
    hidden = {"_id", "password_hash", "invite_token_hash", "password_reset_token_hash"}
    return {k: v for k, v in user.items() if k not in hidden}


def _validate_password(password: str) -> None:
    checks = [
        (len(password) >= 12, "12 characters"),
        (bool(re.search(r"[A-Z]", password)), "one uppercase letter"),
        (bool(re.search(r"[a-z]", password)), "one lowercase letter"),
        (bool(re.search(r"\d", password)), "one number"),
        (bool(re.search(r"[^A-Za-z0-9]", password)), "one special character"),
    ]
    missing = [label for ok, label in checks if not ok]
    if missing:
        raise HTTPException(422, "Password must contain " + ", ".join(missing) + ".")


async def _audit(event: str, actor: Optional[dict] = None, target: Optional[dict] = None, details: Optional[dict] = None) -> None:
    await core.db.security_events.insert_one({
        "id": core.new_id(),
        "event": event,
        "actor_id": actor.get("id") if actor else None,
        "actor_email": actor.get("email") if actor else None,
        "target_user_id": target.get("id") if target else None,
        "target_email": target.get("email") if target else None,
        "details": details or {},
        "created_at": core.now_iso(),
    })


def _remove_route(path: str, method: str) -> None:
    core.api_router.routes[:] = [
        route for route in core.api_router.routes
        if not (getattr(route, "path", None) == path and method.upper() in set(getattr(route, "methods", set()) or set()))
    ]


for path, method in (("/users", "GET"), ("/users", "POST"), ("/users/{user_id}", "PATCH"), ("/users/{user_id}", "DELETE")):
    _remove_route(path, method)


class InviteUserInput(BaseModel):
    email: EmailStr
    name: str
    role: Literal["admin", "ceo", "vp_development", "vp_investment", "dev_manager", "tracker"]
    title: Optional[str] = ""


class ActivateAccountInput(BaseModel):
    token: str
    password: str


class SecureUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["admin", "ceo", "vp_development", "vp_investment", "dev_manager", "tracker"]] = None
    title: Optional[str] = None
    active: Optional[bool] = None


async def _issue_invitation(user: dict, admin: dict, reset_access: bool = False) -> dict:
    raw_token, expires_at, activation_url = _new_invitation()
    updates = {
        "password_hash": core.hash_password(secrets.token_urlsafe(48)),
        "active": False,
        "invitation_status": "pending",
        "invite_token_hash": _token_hash(raw_token),
        "invite_expires_at": expires_at,
        "invited_at": core.now_iso(),
        "invited_by": admin["id"],
        "updated_at": core.now_iso(),
    }
    if reset_access:
        updates["access_revoked_at"] = core.now_iso()
    await core.db.users.update_one({"id": user["id"]}, {"$set": updates})
    refreshed = await core.db.users.find_one({"id": user["id"]}, {"_id": 0})
    await _audit("user_access_reset" if reset_access else "user_invited", admin, refreshed, {"expires_at": expires_at})
    return {"user": _public_user(refreshed or user), "activation_url": activation_url, "expires_at": expires_at, "delivery": "manual_secure_link"}


@core.api_router.get("/users")
async def secure_list_users(admin=Depends(core.require_roles("admin"))):
    return await core.db.users.find({}, {"_id": 0, "password_hash": 0, "invite_token_hash": 0}).sort("created_at", -1).to_list(500)


@core.api_router.post("/users/invite")
async def invite_user(payload: InviteUserInput, admin=Depends(core.require_roles("admin"))):
    email, name = payload.email.strip().lower(), payload.name.strip()
    if not name:
        raise HTTPException(422, "Full name is required.")
    existing = await core.db.users.find_one({"email": email}, {"_id": 0})
    if existing and existing.get("invitation_status") == "active" and existing.get("active"):
        raise HTTPException(409, "This account is already active. Use Reset access instead.")
    if existing:
        await core.db.users.update_one({"id": existing["id"]}, {"$set": {"name": name, "role": payload.role, "title": payload.title or "", "updated_at": core.now_iso()}})
        user = await core.db.users.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        user = {
            "id": core.new_id(), "email": email, "password_hash": core.hash_password(secrets.token_urlsafe(48)),
            "name": name, "role": payload.role, "title": payload.title or "", "active": False,
            "invitation_status": "pending", "demo": False, "created_at": core.now_iso(), "updated_at": core.now_iso(),
        }
        await core.db.users.insert_one(dict(user))
    return await _issue_invitation(user, admin)


@core.api_router.post("/users")
async def direct_user_creation_blocked(admin=Depends(core.require_roles("admin"))):
    raise HTTPException(410, "Direct account creation is disabled. Use the invitation workflow.")


@core.api_router.post("/users/{user_id}/reset-invite")
async def reset_user_access(user_id: str, admin=Depends(core.require_roles("admin"))):
    if user_id == admin.get("id"):
        raise HTTPException(400, "You cannot reset your own active session.")
    user = await core.db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found.")
    return await _issue_invitation(user, admin, True)


@core.api_router.patch("/users/{user_id}")
async def secure_update_user(user_id: str, payload: SecureUserUpdate, admin=Depends(core.require_roles("admin"))):
    updates = payload.model_dump(exclude_none=True)
    if user_id == admin.get("id") and (updates.get("active") is False or updates.get("role", "admin") != "admin"):
        raise HTTPException(400, "You cannot disable or demote your own administrator account.")
    current = await core.db.users.find_one({"id": user_id}, {"_id": 0})
    if not current:
        raise HTTPException(404, "User not found.")
    if updates.get("active") is True and current.get("invitation_status") != "active":
        raise HTTPException(409, "The user must activate the invitation before the account can be enabled.")
    updates["updated_at"] = core.now_iso()
    await core.db.users.update_one({"id": user_id}, {"$set": updates})
    updated = await core.db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "invite_token_hash": 0})
    await _audit("user_updated", admin, updated, {"fields": sorted(updates)})
    return updated


@core.api_router.delete("/users/{user_id}")
async def secure_disable_user(user_id: str, admin=Depends(core.require_roles("admin"))):
    if user_id == admin.get("id"):
        raise HTTPException(400, "You cannot disable your own account.")
    user = await core.db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found.")
    await core.db.users.update_one({"id": user_id}, {"$set": {"active": False, "disabled_at": core.now_iso(), "updated_at": core.now_iso()}})
    await _audit("user_disabled", admin, user)
    return {"ok": True}


@core.api_router.get("/auth/invitation")
async def invitation_status(token: str):
    user = await core.db.users.find_one({"invite_token_hash": _token_hash(token.strip())}, {"_id": 0, "name": 1, "email": 1, "invite_expires_at": 1, "invitation_status": 1})
    if not user:
        raise HTTPException(404, "Invitation is invalid or has already been used.")
    expires_at = datetime.fromisoformat(user["invite_expires_at"].replace("Z", "+00:00"))
    if expires_at <= _utcnow():
        await core.db.users.update_one({"email": user["email"]}, {"$set": {"invitation_status": "expired", "active": False}})
        raise HTTPException(410, "Invitation has expired. Ask the administrator to issue a new one.")
    return {"name": user.get("name"), "email": user.get("email"), "expires_at": user.get("invite_expires_at"), "status": user.get("invitation_status")}


@core.api_router.post("/auth/activate")
async def activate_account(payload: ActivateAccountInput):
    token = payload.token.strip()
    _validate_password(payload.password)
    user = await core.db.users.find_one({"invite_token_hash": _token_hash(token)}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Invitation is invalid or has already been used.")
    expires_at = datetime.fromisoformat(user["invite_expires_at"].replace("Z", "+00:00"))
    if expires_at <= _utcnow():
        raise HTTPException(410, "Invitation has expired.")
    now = core.now_iso()
    await core.db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": core.hash_password(payload.password), "active": True, "invitation_status": "active", "activated_at": now, "password_changed_at": now, "updated_at": now}, "$unset": {"invite_token_hash": "", "invite_expires_at": "", "access_revoked_at": ""}})
    await _audit("user_activated", None, user)
    return {"ok": True, "message": "Account activated. You can now sign in."}


core.app.router.on_startup[:] = [h for h in core.app.router.on_startup if getattr(h, "__name__", "") != "seed_data"]


@core.app.on_event("startup")
async def secure_access_startup() -> None:
    await core.db.users.create_index("email", unique=True)
    await core.db.users.create_index("invite_token_hash", unique=True, sparse=True)
    await core.db.security_events.create_index("created_at")
    demo_enabled = os.getenv("ENABLE_DEMO_USERS", "false").lower() == "true"
    if demo_enabled:
        for seed in core.SEED_USERS:
            await core.db.users.update_one({"email": seed["email"].lower()}, {"$set": {"password_hash": core.hash_password(seed["password"]), "name": seed["name"], "role": seed["role"], "title": seed["title"], "active": True, "invitation_status": "active", "demo": True, "updated_at": core.now_iso()}, "$setOnInsert": {"id": core.new_id(), "created_at": core.now_iso()}}, upsert=True)
    else:
        demo_filter = {"$or": [{"demo": True}, {"email": {"$regex": r"@company\.demo$", "$options": "i"}}]}
        admins = await core.db.users.find({"role": "admin", "active": True}, {"_id": 0}).to_list(100)
        real_admin = next((u for u in admins if not u.get("demo") and not str(u.get("email", "")).endswith("@company.demo")), None)
        if real_admin:
            await core.db.users.update_many(demo_filter, {"$set": {"active": False, "demo": True, "migration_required": False, "updated_at": core.now_iso()}})
        else:
            await core.db.users.update_many(demo_filter, {"$set": {"demo": True, "migration_required": True, "updated_at": core.now_iso()}})
        pending = await core.db.users.find_one({"role": "admin", "invitation_status": "pending", "demo": {"$ne": True}}, {"_id": 0})
        if not real_admin and not pending:
            email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@araak.org").strip().lower()
            bootstrap = {"id": core.new_id(), "email": email, "password_hash": core.hash_password(secrets.token_urlsafe(48)), "name": os.getenv("BOOTSTRAP_ADMIN_NAME", "مدير النظام"), "role": "admin", "title": "مدير النظام والمنصة", "active": False, "invitation_status": "pending", "demo": False, "created_at": core.now_iso(), "updated_at": core.now_iso()}
            raw, expires, url = _new_invitation()
            bootstrap.update({"invite_token_hash": _token_hash(raw), "invite_expires_at": expires, "invited_at": core.now_iso(), "invited_by": "system-bootstrap"})
            await core.db.users.insert_one(bootstrap)
            logger.critical("BOOTSTRAP ADMIN INVITATION (one-time): %s", url)
    logger.info("Invitation-only identity initialized.")
