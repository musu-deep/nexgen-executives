"""Compatibility loader, invitation-only identity, and ARAAK Access Fabric.

The legacy operational module is preserved. Account creation is replaced by
single-use invitations, then the hybrid authorization layer is loaded.
"""
from __future__ import annotations

import hashlib
import importlib.util
import logging
import os
import re
import secrets
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, EmailStr

# Preserve every existing platform route from the sibling legacy module.
_PACKAGE_PARENT = __name__.rpartition(".")[0]
_LEGACY_NAME = f"{_PACKAGE_PARENT}._legacy_arak_extensions" if _PACKAGE_PARENT else "_legacy_arak_extensions"
_LEGACY_PATH = Path(__file__).resolve().parent.parent / "arak_extensions.py"
_LEGACY_SPEC = importlib.util.spec_from_file_location(_LEGACY_NAME, _LEGACY_PATH)
if _LEGACY_SPEC is None or _LEGACY_SPEC.loader is None:  # pragma: no cover
    raise ImportError(f"Unable to load legacy extensions from {_LEGACY_PATH}")
_LEGACY_MODULE = importlib.util.module_from_spec(_LEGACY_SPEC)
sys.modules[_LEGACY_NAME] = _LEGACY_MODULE
_LEGACY_SPEC.loader.exec_module(_LEGACY_MODULE)

try:
    from .. import server as core
except (ImportError, ValueError):
    import server as core  # type: ignore

logger = logging.getLogger("nexgen-executives.secure-access")
INVITE_TTL_HOURS = max(1, int(os.getenv("INVITE_TTL_HOURS", "24")))
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://nexgen-executives.vercel.app").rstrip("/")
LEGACY_ROLE_VALUES = ("admin", "ceo", "vp_development", "vp_investment", "dev_manager", "tracker")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _new_invitation() -> tuple[str, str, str]:
    raw_token = secrets.token_urlsafe(36)
    expires_at = _iso(_utcnow() + timedelta(hours=INVITE_TTL_HOURS))
    activation_url = f"{FRONTEND_URL}/activate?token={raw_token}"
    return raw_token, expires_at, activation_url


def _public_user(user: dict) -> dict:
    hidden = {"_id", "password_hash", "invite_token_hash", "password_reset_token_hash"}
    return {key: value for key, value in user.items() if key not in hidden}


def _validate_password(password: str) -> None:
    failures: list[str] = []
    if len(password) < 12: failures.append("12 characters")
    if not re.search(r"[A-Z]", password): failures.append("one uppercase letter")
    if not re.search(r"[a-z]", password): failures.append("one lowercase letter")
    if not re.search(r"\d", password): failures.append("one number")
    if not re.search(r"[^A-Za-z0-9]", password): failures.append("one special character")
    if failures:
        raise HTTPException(status_code=422, detail="Password must contain " + ", ".join(failures) + ".")


async def _audit(event: str, actor: Optional[dict] = None, target: Optional[dict] = None, details: Optional[dict] = None) -> None:
    await core.db.security_events.insert_one({
        "id": core.new_id(), "event": event,
        "actor_id": actor.get("id") if actor else None,
        "actor_email": actor.get("email") if actor else None,
        "target_user_id": target.get("id") if target else None,
        "target_email": target.get("email") if target else None,
        "details": details or {}, "created_at": core.now_iso(),
    })


def _remove_route(path: str, method: str) -> None:
    method = method.upper()
    core.api_router.routes[:] = [
        route for route in core.api_router.routes
        if not (getattr(route, "path", None) == path and method in set(getattr(route, "methods", set()) or set()))
    ]


for _path, _method in (
    ("/users", "GET"), ("/users", "POST"),
    ("/users/{user_id}", "PATCH"), ("/users/{user_id}", "DELETE"),
):
    _remove_route(_path, _method)


class InviteUserInput(BaseModel):
    email: EmailStr
    name: str
    title: Optional[str] = ""
    role: Literal["admin", "ceo", "vp_development", "vp_investment", "dev_manager", "tracker"] = "tracker"
    access_role_id: Optional[str] = None
    scope_type: Literal["global", "organization", "unit", "project", "resource"] = "global"
    scope_id: Optional[str] = None


class ActivateAccountInput(BaseModel):
    token: str
    password: str


class SecureUserUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    active: Optional[bool] = None


async def _issue_invitation(user: dict, admin: dict, *, reset_access: bool) -> dict:
    raw_token, expires_at, activation_url = _new_invitation()
    updates = {
        "password_hash": core.hash_password(secrets.token_urlsafe(48)),
        "active": False, "invitation_status": "pending",
        "invite_token_hash": _token_hash(raw_token), "invite_expires_at": expires_at,
        "invited_at": core.now_iso(), "invited_by": admin["id"], "updated_at": core.now_iso(),
    }
    if reset_access: updates["access_revoked_at"] = core.now_iso()
    await core.db.users.update_one({"id": user["id"]}, {"$set": updates})
    refreshed = await core.db.users.find_one({"id": user["id"]}, {"_id": 0})
    await _audit("user_access_reset" if reset_access else "user_invited", admin, refreshed, {"expires_at": expires_at})
    return {
        "user": _public_user(refreshed or user), "activation_url": activation_url,
        "expires_at": expires_at, "delivery": "manual_secure_link",
    }


@core.api_router.get("/users")
async def secure_list_users(admin=Depends(core.require_roles("admin"))):
    return await core.db.users.find({}, {"_id": 0, "password_hash": 0, "invite_token_hash": 0}).sort("created_at", -1).to_list(1000)


@core.api_router.post("/users/invite")
async def invite_user(payload: InviteUserInput, admin=Depends(core.require_roles("admin"))):
    email = payload.email.strip().lower()
    name = payload.name.strip()
    if not name: raise HTTPException(status_code=422, detail="Full name is required.")

    compatibility_role = payload.role
    if payload.access_role_id:
        access_role = await core.db.access_roles.find_one({"id": payload.access_role_id}, {"_id": 0})
        if not access_role: raise HTTPException(status_code=404, detail="Access role not found.")
        compatibility_role = access_role.get("compatibility_role", "tracker")

    existing = await core.db.users.find_one({"email": email}, {"_id": 0})
    if existing and existing.get("invitation_status") == "active" and existing.get("active", False):
        raise HTTPException(status_code=409, detail="This account is already active. Use Reset access instead.")
    if existing:
        await core.db.users.update_one({"id": existing["id"]}, {"$set": {
            "name": name, "role": compatibility_role, "title": payload.title or "", "updated_at": core.now_iso(),
        }})
        user = await core.db.users.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        user = {
            "id": core.new_id(), "email": email,
            "password_hash": core.hash_password(secrets.token_urlsafe(48)),
            "name": name, "role": compatibility_role, "title": payload.title or "",
            "active": False, "invitation_status": "pending", "demo": False,
            "access_model": "fabric_v2", "created_at": core.now_iso(), "updated_at": core.now_iso(),
        }
        await core.db.users.insert_one(dict(user))

    if payload.access_role_id:
        from .access_fabric import assign_primary_role
        await assign_primary_role(user["id"], payload.access_role_id, admin, payload.scope_type, payload.scope_id)
    return await _issue_invitation(user, admin, reset_access=False)


@core.api_router.post("/users")
async def legacy_create_user_blocked(admin=Depends(core.require_roles("admin"))):
    raise HTTPException(status_code=410, detail="Direct account creation is disabled. Use the invitation workflow.")


@core.api_router.post("/users/{user_id}/reset-invite")
async def reset_user_access(user_id: str, admin=Depends(core.require_roles("admin"))):
    if user_id == admin.get("id"): raise HTTPException(status_code=400, detail="You cannot reset your own active session.")
    user = await core.db.users.find_one({"id": user_id}, {"_id": 0})
    if not user: raise HTTPException(status_code=404, detail="User not found.")
    return await _issue_invitation(user, admin, reset_access=True)


@core.api_router.patch("/users/{user_id}")
async def secure_update_user(user_id: str, payload: SecureUserUpdate, admin=Depends(core.require_roles("admin"))):
    updates = payload.model_dump(exclude_none=True)
    if not updates: return {"ok": True}
    if user_id == admin.get("id") and updates.get("active") is False:
        raise HTTPException(status_code=400, detail="You cannot disable your own account.")
    current = await core.db.users.find_one({"id": user_id}, {"_id": 0})
    if not current: raise HTTPException(status_code=404, detail="User not found.")
    if updates.get("active") is True and current.get("invitation_status") != "active":
        raise HTTPException(status_code=409, detail="The user must activate the invitation before the account can be enabled.")
    updates["updated_at"] = core.now_iso()
    await core.db.users.update_one({"id": user_id}, {"$set": updates})
    updated = await core.db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "invite_token_hash": 0})
    await _audit("user_updated", admin, updated, {"fields": sorted(k for k in updates if k != "updated_at")})
    return updated


@core.api_router.delete("/users/{user_id}")
async def secure_disable_user(user_id: str, admin=Depends(core.require_roles("admin"))):
    if user_id == admin.get("id"): raise HTTPException(status_code=400, detail="You cannot disable your own account.")
    user = await core.db.users.find_one({"id": user_id}, {"_id": 0})
    if not user: raise HTTPException(status_code=404, detail="User not found.")
    await core.db.users.update_one({"id": user_id}, {"$set": {"active": False, "disabled_at": core.now_iso(), "updated_at": core.now_iso()}})
    await _audit("user_disabled", admin, user)
    return {"ok": True}


@core.api_router.get("/auth/invitation")
async def invitation_status(token: str):
    token = token.strip()
    if not token: raise HTTPException(status_code=422, detail="Invitation token is required.")
    user = await core.db.users.find_one(
        {"invite_token_hash": _token_hash(token)},
        {"_id": 0, "name": 1, "email": 1, "invite_expires_at": 1, "invitation_status": 1},
    )
    if not user: raise HTTPException(status_code=404, detail="Invitation is invalid or has already been used.")
    expires_at = datetime.fromisoformat(user["invite_expires_at"].replace("Z", "+00:00"))
    if expires_at <= _utcnow():
        await core.db.users.update_one({"email": user["email"]}, {"$set": {"invitation_status": "expired", "active": False}})
        raise HTTPException(status_code=410, detail="Invitation has expired. Ask the administrator to issue a new one.")
    return {"name": user.get("name"), "email": user.get("email"), "expires_at": user.get("invite_expires_at"), "status": user.get("invitation_status")}


@core.api_router.post("/auth/activate")
async def activate_account(payload: ActivateAccountInput):
    token = payload.token.strip()
    if not token: raise HTTPException(status_code=422, detail="Invitation token is required.")
    _validate_password(payload.password)
    user = await core.db.users.find_one({"invite_token_hash": _token_hash(token)}, {"_id": 0})
    if not user: raise HTTPException(status_code=404, detail="Invitation is invalid or has already been used.")
    expires_at = datetime.fromisoformat(user["invite_expires_at"].replace("Z", "+00:00"))
    if expires_at <= _utcnow():
        await core.db.users.update_one({"id": user["id"]}, {"$set": {"invitation_status": "expired", "active": False}})
        raise HTTPException(status_code=410, detail="Invitation has expired. Ask the administrator to issue a new one.")
    activated_at = core.now_iso()
    await core.db.users.update_one(
        {"id": user["id"], "invite_token_hash": _token_hash(token)},
        {"$set": {
            "password_hash": core.hash_password(payload.password), "active": True,
            "invitation_status": "active", "activated_at": activated_at,
            "password_changed_at": activated_at, "updated_at": activated_at,
        }, "$unset": {"invite_token_hash": "", "invite_expires_at": "", "access_revoked_at": ""}},
    )
    activated = await core.db.users.find_one({"id": user["id"]}, {"_id": 0})
    await _audit("user_activated", None, activated)
    return {"ok": True, "message": "Account activated. You can now sign in."}


# Remove destructive demo reset and replace it with safe, idempotent migration.
core.app.router.on_startup[:] = [handler for handler in core.app.router.on_startup if getattr(handler, "__name__", "") != "seed_data"]


@core.app.on_event("startup")
async def secure_access_startup() -> None:
    await core.db.users.create_index("email", unique=True)
    await core.db.users.create_index("invite_token_hash", unique=True, sparse=True)
    await core.db.projects.create_index("sector")
    await core.db.tasks.create_index("project_id")
    await core.db.security_events.create_index("created_at")

    demo_enabled = os.getenv("ENABLE_DEMO_USERS", "false").lower() == "true"
    if demo_enabled:
        for seed in core.SEED_USERS:
            await core.db.users.update_one(
                {"email": seed["email"].lower()},
                {"$set": {
                    "password_hash": core.hash_password(seed["password"]), "name": seed["name"],
                    "role": seed["role"], "title": seed["title"], "active": True,
                    "invitation_status": "active", "demo": True, "updated_at": core.now_iso(),
                }, "$setOnInsert": {"id": core.new_id(), "created_at": core.now_iso()}}, upsert=True,
            )
        logger.warning("Demo users are enabled by ENABLE_DEMO_USERS=true.")
    else:
        demo_filter = {"$or": [{"demo": True}, {"email": {"$regex": r"@company\.demo$", "$options": "i"}}]}
        active_admins = await core.db.users.find({"role": "admin", "active": True}, {"_id": 0}).to_list(100)
        non_demo_admin = next((item for item in active_admins if not item.get("demo") and not str(item.get("email", "")).lower().endswith("@company.demo")), None)
        if non_demo_admin:
            await core.db.users.update_many(demo_filter, {"$set": {"active": False, "demo": True, "migration_required": False, "updated_at": core.now_iso()}})
        else:
            await core.db.users.update_many(demo_filter, {"$set": {"demo": True, "migration_required": True, "updated_at": core.now_iso()}})
            logger.warning("Temporary migration access is active because no non-demo administrator exists yet.")

        pending_admin = await core.db.users.find_one({"role": "admin", "invitation_status": "pending", "demo": {"$ne": True}}, {"_id": 0})
        if not non_demo_admin and not pending_admin:
            bootstrap_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@araak.org").strip().lower()
            bootstrap = {
                "id": core.new_id(), "email": bootstrap_email,
                "password_hash": core.hash_password(secrets.token_urlsafe(48)),
                "name": os.getenv("BOOTSTRAP_ADMIN_NAME", "مدير النظام"),
                "role": "admin", "title": "مدير النظام والمنصة",
                "active": False, "invitation_status": "pending", "demo": False,
                "access_model": "fabric_v2", "created_at": core.now_iso(), "updated_at": core.now_iso(),
            }
            raw_token, expires_at, activation_url = _new_invitation()
            bootstrap.update({
                "invite_token_hash": _token_hash(raw_token), "invite_expires_at": expires_at,
                "invited_at": core.now_iso(), "invited_by": "system-bootstrap",
            })
            await core.db.users.insert_one(bootstrap)
            logger.critical("BOOTSTRAP ADMIN INVITATION (one-time): %s", activation_url)
    logger.info("Invitation-only identity initialized; public registration is disabled.")


# Load the data-driven authorization engine after identity routes are ready.
from . import access_fabric  # noqa: E402,F401
