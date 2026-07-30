"""ARAAK Access Fabric: hybrid RBAC + scoped ABAC + relationship authorization."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from .. import server as core
except (ImportError, ValueError):
    import server as core  # type: ignore

CLASSIFICATION_RANK = {"internal": 1, "restricted": 2, "confidential": 3, "executive_secret": 4, "financial_sensitive": 4, "legal_privileged": 4}
LEGACY_ROLE_MAP = {"admin": "system_admin", "ceo": "chief_executive", "vp_development": "development_vp", "vp_investment": "investment_vp", "dev_manager": "unit_manager", "tracker": "executive_followup"}
DEFAULT_PERMISSIONS = [
    ("access.manage", "Manage access fabric", "security"), ("access.simulate", "Simulate decisions", "security"), ("audit.view", "View audit", "security"),
    ("user.invite", "Invite users", "identity"), ("user.disable", "Disable users", "identity"), ("organization.manage", "Manage structure", "organization"),
    ("project.view", "View projects", "project"), ("project.create", "Create projects", "project"), ("project.update", "Update projects", "project"), ("project.close", "Close projects", "project"),
    ("task.view", "View tasks", "task"), ("task.assign", "Assign tasks", "task"), ("task.approve", "Approve tasks", "task"),
    ("document.view", "View documents", "document"), ("document.upload", "Upload documents", "document"), ("document.download", "Download documents", "document"), ("document.classify", "Classify documents", "document"),
    ("tender.view", "View tenders", "tender"), ("tender.price.view", "View tender pricing", "tender"), ("tender.price.edit", "Edit tender pricing", "tender"), ("tender.submit", "Submit tender", "tender"), ("tender.approve", "Approve tender", "tender"),
    ("report.view", "View reports", "report"), ("report.approve", "Approve reports", "report"), ("meeting.manage", "Manage meetings", "meeting"),
]
DEFAULT_ROLES = {
    "system_admin": ("مدير النظام", "Identity and access administration", ["access.manage", "access.simulate", "audit.view", "user.invite", "user.disable", "organization.manage"]),
    "chief_executive": ("الرئيس التنفيذي", "Enterprise-wide executive authority", [p[0] for p in DEFAULT_PERMISSIONS if p[0] != "access.manage"]),
    "development_vp": ("نائب الرئيس للتنمية", "Development portfolio authority", ["project.view", "project.create", "project.update", "task.view", "task.assign", "task.approve", "document.view", "document.upload", "report.view", "report.approve", "meeting.manage"]),
    "investment_vp": ("نائب الرئيس للاستثمار", "Investment portfolio authority", ["project.view", "project.create", "project.update", "task.view", "task.assign", "task.approve", "document.view", "document.upload", "tender.view", "tender.price.view", "tender.price.edit", "report.view", "report.approve"]),
    "unit_manager": ("مدير وحدة", "Business-unit delivery authority", ["project.view", "project.update", "task.view", "task.assign", "document.view", "document.upload", "report.view"]),
    "executive_followup": ("المتابعة التنفيذية", "Cross-functional follow-up", ["project.view", "task.view", "task.assign", "document.view", "report.view", "meeting.manage"]),
    "viewer": ("مشاهد", "Read-only access", ["project.view", "task.view", "document.view", "report.view"]),
    "technical_committee": ("عضو لجنة فنية", "Scoped tender review", ["tender.view", "document.view", "report.view"]),
    "financial_reviewer": ("مراجع مالي", "Scoped financial review", ["tender.view", "tender.price.view", "report.view"]),
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def active_window(item: dict) -> bool:
    now = utcnow()
    if item.get("starts_at") and datetime.fromisoformat(str(item["starts_at"]).replace("Z", "+00:00")) > now: return False
    if item.get("expires_at") and datetime.fromisoformat(str(item["expires_at"]).replace("Z", "+00:00")) <= now: return False
    return item.get("active", True)


async def descendants(scope_id: Optional[str]) -> set[str]:
    if not scope_id: return set()
    seen, frontier = {scope_id}, [scope_id]
    while frontier:
        rows = await core.db.organization_units.find({"parent_id": {"$in": frontier}}, {"_id": 0, "id": 1}).to_list(1000)
        frontier = [r["id"] for r in rows if r["id"] not in seen]
        seen.update(frontier)
    return seen


async def effective_permissions(user: dict, resource: Optional[dict] = None) -> dict:
    assignments = await core.db.role_assignments.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    groups = await core.db.group_memberships.find({"user_id": user["id"], "active": True}, {"_id": 0}).to_list(500)
    group_ids = [g["group_id"] for g in groups]
    if group_ids:
        assignments += await core.db.role_assignments.find({"group_id": {"$in": group_ids}}, {"_id": 0}).to_list(500)
    assignments = [a for a in assignments if active_window(a)]
    role_ids = list({a["role_id"] for a in assignments})
    roles = await core.db.access_roles.find({"id": {"$in": role_ids}, "active": True}, {"_id": 0}).to_list(500) if role_ids else []
    role_map = {r["id"]: r for r in roles}
    granted, matched = set(), []
    resource_scope = (resource or {}).get("scope_id") or (resource or {}).get("unit_id")
    for assignment in assignments:
        role = role_map.get(assignment["role_id"])
        if not role: continue
        scope_type, scope_id = assignment.get("scope_type", "global"), assignment.get("scope_id")
        applies = scope_type == "global" or not resource
        if not applies and resource_scope and scope_id:
            applies = resource_scope in await descendants(scope_id)
        if applies:
            granted.update(role.get("permissions", [])); matched.append({"assignment": assignment, "role": role})
    return {"permissions": sorted(granted), "matches": matched}


async def evaluate(user: dict, action: str, resource: Optional[dict] = None, context: Optional[dict] = None) -> dict:
    context, resource = context or {}, resource or {}
    eff = await effective_permissions(user, resource)
    allowed = action in eff["permissions"]
    reasons = ["Permission granted by scoped role assignment." if allowed else "No active scoped role grants this permission."]
    classification = resource.get("classification", "internal")
    clearance = user.get("clearance", "internal")
    if CLASSIFICATION_RANK.get(classification, 1) > CLASSIFICATION_RANK.get(clearance, 1):
        allowed = False; reasons.append(f"Resource classification {classification} exceeds user clearance {clearance}.")
    policies = await core.db.policy_rules.find({"active": True, "$or": [{"action": action}, {"action": "*"}]}, {"_id": 0}).sort("priority", -1).to_list(500)
    for policy in policies:
        cond, matched = policy.get("conditions", {}), True
        if cond.get("require_mfa") and not context.get("mfa_verified"): matched = False
        if cond.get("max_amount") is not None and float(context.get("amount", 0)) > float(cond["max_amount"]): matched = False
        if cond.get("classification") and classification not in cond["classification"]: matched = False
        if matched:
            reasons.append(f"Policy {policy.get('name')} matched: {policy.get('effect')}.")
            allowed = policy.get("effect") == "allow"
            if policy.get("effect") == "deny": break
    delegations = await core.db.delegations.find({"delegate_id": user["id"], "active": True}, {"_id": 0}).to_list(200)
    for delegation in delegations:
        if active_window(delegation) and action in delegation.get("permissions", []):
            allowed = True; reasons.append("Permission granted by active temporary delegation.")
    decision = {"allowed": allowed, "action": action, "resource": resource, "reasons": reasons, "matched_roles": [m["role"].get("name") for m in eff["matches"]], "effective_permissions": eff["permissions"], "evaluated_at": core.now_iso()}
    await core.db.authorization_decisions.insert_one({"id": core.new_id(), "user_id": user["id"], **decision})
    return decision


class OrganizationInput(BaseModel):
    name: str
    code: str
    kind: Literal["group", "company", "department", "branch", "committee", "project", "team"] = "department"
    parent_id: Optional[str] = None
    active: bool = True


class RoleInput(BaseModel):
    name: str
    code: str
    description: str = ""
    permissions: list[str] = Field(default_factory=list)
    clearance: str = "internal"
    active: bool = True


class AssignmentInput(BaseModel):
    user_id: Optional[str] = None
    group_id: Optional[str] = None
    role_id: str
    scope_type: Literal["global", "organization", "unit", "project", "resource"] = "global"
    scope_id: Optional[str] = None
    starts_at: Optional[str] = None
    expires_at: Optional[str] = None


class GroupInput(BaseModel):
    name: str
    code: str
    description: str = ""
    unit_id: Optional[str] = None


class MembershipInput(BaseModel):
    user_id: str
    group_id: str


class DelegationInput(BaseModel):
    delegator_id: str
    delegate_id: str
    permissions: list[str]
    scope_id: Optional[str] = None
    starts_at: str
    expires_at: str
    exclusions: list[str] = Field(default_factory=list)


class PolicyInput(BaseModel):
    name: str
    action: str = "*"
    effect: Literal["allow", "deny"] = "deny"
    priority: int = 100
    conditions: dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class SimulationInput(BaseModel):
    user_id: str
    action: str
    resource: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)


def admin_only(user: dict) -> None:
    if user.get("role") != "admin": raise HTTPException(403, "Access Fabric administration is restricted to the system administrator.")


@core.api_router.get("/access/bootstrap")
async def access_bootstrap(user=Depends(core.get_current_user)):
    admin_only(user)
    return {"organizations": await core.db.organization_units.find({}, {"_id": 0}).sort("name", 1).to_list(1000), "roles": await core.db.access_roles.find({}, {"_id": 0}).sort("name", 1).to_list(1000), "permissions": await core.db.permissions.find({}, {"_id": 0}).sort("code", 1).to_list(1000), "assignments": await core.db.role_assignments.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000), "groups": await core.db.access_groups.find({}, {"_id": 0}).sort("name", 1).to_list(1000), "memberships": await core.db.group_memberships.find({"active": True}, {"_id": 0}).to_list(2000), "delegations": await core.db.delegations.find({"active": True}, {"_id": 0}).to_list(1000), "policies": await core.db.policy_rules.find({}, {"_id": 0}).sort("priority", -1).to_list(1000), "users": await core.db.users.find({}, {"_id": 0, "password_hash": 0, "invite_token_hash": 0}).to_list(1000)}


@core.api_router.get("/access/me")
async def my_access(user=Depends(core.get_current_user)):
    eff = await effective_permissions(user)
    return {"user_id": user["id"], "permissions": eff["permissions"], "roles": [m["role"] for m in eff["matches"]]}


@core.api_router.post("/access/organizations")
async def create_organization(payload: OrganizationInput, user=Depends(core.get_current_user)):
    admin_only(user); doc = {"id": core.new_id(), **payload.model_dump(), "created_at": core.now_iso(), "created_by": user["id"]}; await core.db.organization_units.insert_one(doc); doc.pop("_id", None); return doc


@core.api_router.patch("/access/organizations/{item_id}")
async def update_organization(item_id: str, payload: dict, user=Depends(core.get_current_user)):
    admin_only(user); payload["updated_at"] = core.now_iso(); await core.db.organization_units.update_one({"id": item_id}, {"$set": payload}); return await core.db.organization_units.find_one({"id": item_id}, {"_id": 0})


@core.api_router.post("/access/roles")
async def create_role(payload: RoleInput, user=Depends(core.get_current_user)):
    admin_only(user); doc = {"id": core.new_id(), **payload.model_dump(), "system": False, "created_at": core.now_iso(), "created_by": user["id"]}; await core.db.access_roles.insert_one(doc); doc.pop("_id", None); return doc


@core.api_router.patch("/access/roles/{role_id}")
async def update_role(role_id: str, payload: RoleInput, user=Depends(core.get_current_user)):
    admin_only(user); await core.db.access_roles.update_one({"id": role_id}, {"$set": {**payload.model_dump(), "updated_at": core.now_iso()}}); return await core.db.access_roles.find_one({"id": role_id}, {"_id": 0})


@core.api_router.post("/access/assignments")
async def create_assignment(payload: AssignmentInput, user=Depends(core.get_current_user)):
    admin_only(user)
    if bool(payload.user_id) == bool(payload.group_id): raise HTTPException(422, "Provide exactly one of user_id or group_id.")
    doc = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_at": core.now_iso(), "created_by": user["id"]}; await core.db.role_assignments.insert_one(doc); doc.pop("_id", None); return doc


@core.api_router.delete("/access/assignments/{assignment_id}")
async def revoke_assignment(assignment_id: str, user=Depends(core.get_current_user)):
    admin_only(user); await core.db.role_assignments.update_one({"id": assignment_id}, {"$set": {"active": False, "revoked_at": core.now_iso(), "revoked_by": user["id"]}}); return {"ok": True}


@core.api_router.post("/access/groups")
async def create_group(payload: GroupInput, user=Depends(core.get_current_user)):
    admin_only(user); doc = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_at": core.now_iso()}; await core.db.access_groups.insert_one(doc); doc.pop("_id", None); return doc


@core.api_router.post("/access/memberships")
async def add_membership(payload: MembershipInput, user=Depends(core.get_current_user)):
    admin_only(user); doc = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_at": core.now_iso()}; await core.db.group_memberships.update_one({"user_id": payload.user_id, "group_id": payload.group_id}, {"$set": doc}, upsert=True); return doc


@core.api_router.post("/access/delegations")
async def create_delegation(payload: DelegationInput, user=Depends(core.get_current_user)):
    admin_only(user); doc = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_at": core.now_iso(), "created_by": user["id"]}; await core.db.delegations.insert_one(doc); doc.pop("_id", None); return doc


@core.api_router.post("/access/policies")
async def create_policy(payload: PolicyInput, user=Depends(core.get_current_user)):
    admin_only(user); doc = {"id": core.new_id(), **payload.model_dump(), "created_at": core.now_iso(), "created_by": user["id"]}; await core.db.policy_rules.insert_one(doc); doc.pop("_id", None); return doc


@core.api_router.post("/access/simulate")
async def simulate(payload: SimulationInput, user=Depends(core.get_current_user)):
    admin_only(user); target = await core.db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not target: raise HTTPException(404, "User not found.")
    return await evaluate(target, payload.action, payload.resource, payload.context)


@core.api_router.post("/access/check")
async def check_current_access(payload: dict, user=Depends(core.get_current_user)):
    action = str(payload.get("action", ""))
    if not action: raise HTTPException(422, "action is required")
    return await evaluate(user, action, payload.get("resource") or {}, payload.get("context") or {})


@core.app.on_event("startup")
async def seed_access_fabric() -> None:
    await core.db.permissions.create_index("code", unique=True)
    await core.db.access_roles.create_index("code", unique=True)
    await core.db.organization_units.create_index("code", unique=True)
    await core.db.role_assignments.create_index("user_id")
    await core.db.group_memberships.create_index("user_id")
    await core.db.authorization_decisions.create_index("evaluated_at")
    for code, name, domain in DEFAULT_PERMISSIONS:
        await core.db.permissions.update_one({"code": code}, {"$set": {"code": code, "name": name, "domain": domain, "active": True}}, upsert=True)
    root = await core.db.organization_units.find_one({"code": "ARAAK-GROUP"}, {"_id": 0})
    if not root:
        root = {"id": core.new_id(), "name": "مجموعة اراك للتنمية", "code": "ARAAK-GROUP", "kind": "group", "parent_id": None, "active": True, "created_at": core.now_iso()}; await core.db.organization_units.insert_one(dict(root))
    for code, (name, description, permissions) in DEFAULT_ROLES.items():
        existing = await core.db.access_roles.find_one({"code": code}, {"_id": 0}); rid = existing["id"] if existing else core.new_id()
        await core.db.access_roles.update_one({"code": code}, {"$set": {"id": rid, "code": code, "name": name, "description": description, "permissions": permissions, "clearance": "executive_secret" if code in ("chief_executive", "system_admin") else "confidential", "active": True, "system": True, "updated_at": core.now_iso()}, "$setOnInsert": {"created_at": core.now_iso()}}, upsert=True)
    users = await core.db.users.find({}, {"_id": 0}).to_list(1000)
    roles = {r["code"]: r for r in await core.db.access_roles.find({}, {"_id": 0}).to_list(1000)}
    for user in users:
        code = LEGACY_ROLE_MAP.get(user.get("role"), "viewer"); role = roles.get(code)
        if role:
            await core.db.role_assignments.update_one({"user_id": user["id"], "role_id": role["id"], "scope_type": "global", "migration": True}, {"$set": {"active": True, "updated_at": core.now_iso()}, "$setOnInsert": {"id": core.new_id(), "user_id": user["id"], "role_id": role["id"], "scope_type": "global", "scope_id": root["id"], "migration": True, "created_at": core.now_iso()}}, upsert=True)
        clearance = "executive_secret" if user.get("role") in ("admin", "ceo") else "confidential"
        await core.db.users.update_one({"id": user["id"]}, {"$set": {"clearance": clearance}})
