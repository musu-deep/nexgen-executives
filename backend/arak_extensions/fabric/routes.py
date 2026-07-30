"""Administration APIs and idempotent Access Fabric initialization."""
import logging
from fastapi import Depends, HTTPException
from .. import core, _audit
from .catalog import *
from .engine import assign_primary_role, build_access_snapshot, evaluate_access, require_permission, _now, _parse_time
from .models import *

logger = logging.getLogger("nexgen-executives.access-fabric")

@core.api_router.get("/access/me")
async def my_access_profile(user=Depends(core.get_current_user)):
    snapshot = await build_access_snapshot(user)
    primary = next((item for item in snapshot["assignments"] if item.get("is_primary")), None)
    primary_role = snapshot["roles"].get(primary.get("role_id")) if primary else None
    return {
        "version": ACCESS_FABRIC_VERSION,
        "permissions": snapshot["permissions"],
        "groups": snapshot["groups"],
        "assignments": snapshot["assignments"],
        "roles": list(snapshot["roles"].values()),
        "delegations": snapshot["delegations"],
        "primary_role": primary_role,
    }


@core.api_router.get("/access/bootstrap")
async def access_bootstrap(admin=Depends(require_permission("access.manage"))):
    collections = {
        "organizations": core.db.organizations,
        "units": core.db.organization_units,
        "groups": core.db.access_groups,
        "memberships": core.db.group_memberships,
        "roles": core.db.access_roles,
        "permissions": core.db.permission_catalog,
        "assignments": core.db.role_assignments,
        "delegations": core.db.delegations,
        "relations": core.db.resource_relations,
        "policies": core.db.policy_rules,
        "classifications": core.db.data_classifications,
        "approval_limits": core.db.approval_limits,
    }
    result = {name: await collection.find({}, {"_id": 0}).to_list(2000) for name, collection in collections.items()}
    result["users"] = await core.db.users.find({}, {"_id": 0, "password_hash": 0, "invite_token_hash": 0}).to_list(1000)
    result["projects"] = await core.db.projects.find({}, {"_id": 0, "id": 1, "name": 1, "sector": 1, "unit_id": 1, "organization_id": 1}).to_list(2000)
    result["version"] = ACCESS_FABRIC_VERSION
    return result


@core.api_router.post("/access/organizations")
async def create_organization(payload: OrganizationInput, admin=Depends(require_permission("access.manage"))):
    item = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.organizations.insert_one(dict(item)); item.pop("_id", None)
    await _audit("organization_created", admin, None, item)
    return item


@core.api_router.post("/access/units")
async def create_unit(payload: UnitInput, admin=Depends(require_permission("access.manage"))):
    item = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.organization_units.insert_one(dict(item)); item.pop("_id", None)
    await _audit("organization_unit_created", admin, None, item)
    return item


@core.api_router.post("/access/groups")
async def create_group(payload: GroupInput, admin=Depends(require_permission("access.manage"))):
    item = {"id": core.new_id(), **payload.model_dump(), "active": True, "system": False, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.access_groups.insert_one(dict(item)); item.pop("_id", None)
    await _audit("access_group_created", admin, None, item)
    return item


@core.api_router.post("/access/groups/{group_id}/members")
async def add_group_member(group_id: str, payload: GroupMemberInput, admin=Depends(require_permission("access.manage"))):
    if not await core.db.access_groups.find_one({"id": group_id}): raise HTTPException(404, "Group not found")
    if not await core.db.users.find_one({"id": payload.user_id}): raise HTTPException(404, "User not found")
    await core.db.group_memberships.update_one(
        {"group_id": group_id, "user_id": payload.user_id},
        {"$set": {"active": True, "updated_at": core.now_iso(), "updated_by": admin["id"]}, "$setOnInsert": {"id": core.new_id(), "created_at": core.now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@core.api_router.delete("/access/groups/{group_id}/members/{user_id}")
async def remove_group_member(group_id: str, user_id: str, admin=Depends(require_permission("access.manage"))):
    await core.db.group_memberships.update_one({"group_id": group_id, "user_id": user_id}, {"$set": {"active": False, "updated_at": core.now_iso()}})
    return {"ok": True}


@core.api_router.post("/access/roles")
async def create_role(payload: RoleInput, admin=Depends(require_permission("access.manage"))):
    invalid = sorted(set(payload.permissions) - set(ALL_PERMISSION_CODES) - {"*"})
    if invalid: raise HTTPException(422, detail=f"Unknown permissions: {', '.join(invalid)}")
    item = {"id": core.new_id(), "slug": f"custom_{core.new_id()[:8]}", **payload.model_dump(), "system": False, "active": True, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.access_roles.insert_one(dict(item)); item.pop("_id", None)
    await _audit("access_role_created", admin, None, {"role_id": item["id"], "name": item["name_ar"]})
    return item


@core.api_router.put("/access/roles/{role_id}/permissions")
async def update_role_permissions(role_id: str, payload: RolePermissionsInput, admin=Depends(require_permission("access.manage"))):
    invalid = sorted(set(payload.permissions) - set(ALL_PERMISSION_CODES) - {"*"})
    if invalid: raise HTTPException(422, detail=f"Unknown permissions: {', '.join(invalid)}")
    result = await core.db.access_roles.update_one({"id": role_id}, {"$set": {"permissions": sorted(set(payload.permissions)), "updated_at": core.now_iso(), "updated_by": admin["id"]}})
    if not result.matched_count: raise HTTPException(404, "Role not found")
    await _audit("access_role_permissions_updated", admin, None, {"role_id": role_id, "permissions": payload.permissions})
    return await core.db.access_roles.find_one({"id": role_id}, {"_id": 0})


@core.api_router.post("/access/assignments")
async def create_assignment(payload: AssignmentInput, admin=Depends(require_permission("access.manage"))):
    if not await core.db.access_roles.find_one({"id": payload.role_id}): raise HTTPException(404, "Role not found")
    if payload.subject_type == "user" and not await core.db.users.find_one({"id": payload.subject_id}): raise HTTPException(404, "User not found")
    if payload.subject_type == "group" and not await core.db.access_groups.find_one({"id": payload.subject_id}): raise HTTPException(404, "Group not found")
    if payload.is_primary and payload.subject_type == "user":
        return await assign_primary_role(payload.subject_id, payload.role_id, admin, payload.scope_type, payload.scope_id)
    item = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.role_assignments.insert_one(dict(item)); item.pop("_id", None)
    await _audit("access_role_assigned", admin, None, item)
    return item


@core.api_router.delete("/access/assignments/{assignment_id}")
async def revoke_assignment(assignment_id: str, admin=Depends(require_permission("access.manage"))):
    assignment = await core.db.role_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment: raise HTTPException(404, "Assignment not found")
    await core.db.role_assignments.update_one({"id": assignment_id}, {"$set": {"active": False, "revoked_at": core.now_iso(), "revoked_by": admin["id"]}})
    await _audit("access_role_revoked", admin, None, {"assignment_id": assignment_id})
    return {"ok": True}


@core.api_router.post("/access/relations")
async def create_relation(payload: RelationInput, admin=Depends(require_permission("access.manage"))):
    item = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.resource_relations.insert_one(dict(item)); item.pop("_id", None)
    return item


@core.api_router.post("/access/delegations")
async def create_delegation(payload: DelegationInput, admin=Depends(require_permission("access.manage"))):
    if payload.grantor_user_id == payload.delegate_user_id: raise HTTPException(422, "Grantor and delegate must be different")
    expires = _parse_time(payload.expires_at)
    if not expires or expires <= _now(): raise HTTPException(422, "Delegation expiry must be in the future")
    item = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.delegations.insert_one(dict(item)); item.pop("_id", None)
    await _audit("delegation_created", admin, None, item)
    return item


@core.api_router.delete("/access/delegations/{delegation_id}")
async def revoke_delegation(delegation_id: str, admin=Depends(require_permission("access.manage"))):
    await core.db.delegations.update_one({"id": delegation_id}, {"$set": {"active": False, "revoked_at": core.now_iso(), "revoked_by": admin["id"]}})
    return {"ok": True}


@core.api_router.post("/access/policies")
async def create_policy(payload: PolicyInput, admin=Depends(require_permission("access.manage"))):
    item = {"id": core.new_id(), **payload.model_dump(), "system": False, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.policy_rules.insert_one(dict(item)); item.pop("_id", None)
    return item


@core.api_router.post("/access/approval-limits")
async def create_approval_limit(payload: ApprovalLimitInput, admin=Depends(require_permission("access.manage"))):
    item = {"id": core.new_id(), **payload.model_dump(), "active": True, "created_by": admin["id"], "created_at": core.now_iso()}
    await core.db.approval_limits.insert_one(dict(item)); item.pop("_id", None)
    return item


@core.api_router.post("/access/simulator")
async def simulate_access(payload: SimulationInput, admin=Depends(require_permission("access.manage"))):
    user = await core.db.users.find_one({"id": payload.user_id}, {"_id": 0, "password_hash": 0})
    if not user: raise HTTPException(404, "User not found")
    decision = await evaluate_access(user, payload.permission, payload.resource_type, payload.resource_id, payload.context, record=True)
    decision["user"] = {"id": user["id"], "name": user.get("name"), "email": user.get("email")}
    return decision


@core.api_router.get("/access/audit")
async def access_audit(limit: int = 200, admin=Depends(require_permission("audit.view"))):
    safe_limit = min(max(limit, 1), 1000)
    decisions = await core.db.authorization_decisions.find({}, {"_id": 0}).sort("created_at", -1).to_list(safe_limit)
    events = await core.db.security_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(safe_limit)
    return {"decisions": decisions, "events": events}


@core.app.on_event("startup")
async def initialize_access_fabric() -> None:
    index_specs = [
        (core.db.organizations, "id", True), (core.db.organization_units, "id", True),
        (core.db.access_groups, "id", True), (core.db.group_memberships, [("group_id", 1), ("user_id", 1)], True),
        (core.db.permission_catalog, "code", True), (core.db.access_roles, "id", True),
        (core.db.role_assignments, "id", True), (core.db.resource_relations, "id", True),
        (core.db.delegations, "id", True), (core.db.policy_rules, "id", True),
        (core.db.data_classifications, "id", True), (core.db.approval_limits, "id", True),
        (core.db.authorization_decisions, "created_at", False),
    ]
    for collection, keys, unique in index_specs:
        try:
            await collection.create_index(keys, unique=unique)
        except Exception as exc:
            logger.warning("Access Fabric index warning: %s", exc)

    for item in ORGANIZATIONS:
        await core.db.organizations.update_one({"id": item["id"]}, {"$set": item}, upsert=True)
    for item in ORG_UNITS:
        await core.db.organization_units.update_one({"id": item["id"]}, {"$set": item}, upsert=True)
    for item in GROUPS:
        await core.db.access_groups.update_one({"id": item["id"]}, {"$set": {**item, "active": True}}, upsert=True)
    for code, module, description in PERMISSIONS:
        await core.db.permission_catalog.update_one({"code": code}, {"$set": {"id": code, "code": code, "module": module, "description": description, "active": True}}, upsert=True)
    for role in ROLE_TEMPLATES:
        await core.db.access_roles.update_one({"id": role["id"]}, {"$set": {**role, "active": True}}, upsert=True)
    for item in CLASSIFICATIONS:
        await core.db.data_classifications.update_one({"id": item["id"]}, {"$set": {**item, "active": True}}, upsert=True)
    for item in DEFAULT_POLICIES:
        await core.db.policy_rules.update_one({"id": item["id"]}, {"$set": {**item, "system": True}}, upsert=True)

    users = await core.db.users.find({}, {"_id": 0}).to_list(2000)
    for user in users:
        legacy = user.get("role") or "tracker"
        role_id = f"role_{legacy}" if legacy in LEGACY_ROLE_SCOPE else "role_viewer"
        existing = await core.db.role_assignments.find_one({
            "subject_type": "user", "subject_id": user["id"], "active": {"$ne": False}
        })
        if not existing:
            scope_type, scope_id = LEGACY_ROLE_SCOPE.get(legacy, ("global", None))
            await assign_primary_role(user["id"], role_id, None, scope_type, scope_id)
        else:
            await core.db.users.update_one({"id": user["id"]}, {"$set": {"access_model": "fabric_v2", "updated_at": core.now_iso()}})

    logger.info("ARAAK Access Fabric %s initialized: RBAC + ABAC + ReBAC + scoped governance.", ACCESS_FABRIC_VERSION)
