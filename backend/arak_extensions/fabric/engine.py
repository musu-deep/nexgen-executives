"""Hybrid RBAC + ABAC + ReBAC decision engine."""
from __future__ import annotations
import contextvars
import logging
import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException
from .. import core, _audit
from .catalog import *

logger = logging.getLogger("nexgen-executives.access-fabric")
_current_access: contextvars.ContextVar[Optional[dict]] = contextvars.ContextVar("araak_current_access", default=None)

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def _active_window(item: dict) -> bool:
    now = _now()
    starts = _parse_time(item.get("starts_at"))
    expires = _parse_time(item.get("expires_at"))
    return not ((starts and starts > now) or (expires and expires <= now) or item.get("active") is False)


def _public(item: Optional[dict]) -> Optional[dict]:
    if item is None:
        return None
    return {k: v for k, v in item.items() if k not in {"_id", "password_hash", "invite_token_hash"}}


async def require_permission(permission: str):
    async def dependency(user=Depends(core.get_current_user)):
        decision = await evaluate_access(user, permission)
        if not decision["allowed"]:
            raise HTTPException(status_code=403, detail={"message": "Access denied", "decision": decision})
        return user
    return dependency


async def _group_ids(user_id: str) -> list[str]:
    memberships = await core.db.group_memberships.find(
        {"user_id": user_id, "active": {"$ne": False}}, {"_id": 0, "group_id": 1}
    ).to_list(500)
    return [item["group_id"] for item in memberships]


async def _units_by_id() -> dict[str, dict]:
    units = await core.db.organization_units.find({}, {"_id": 0}).to_list(500)
    return {item["id"]: item for item in units}


def _descendant_unit_ids(unit_id: str, units: dict[str, dict]) -> set[str]:
    found = {unit_id}
    changed = True
    while changed:
        changed = False
        for item in units.values():
            if item.get("parent_id") in found and item["id"] not in found:
                found.add(item["id"])
                changed = True
    return found


def _sectors_for_unit(unit_id: str, units: dict[str, dict]) -> set[str]:
    result: set[str] = set()
    for child_id in _descendant_unit_ids(unit_id, units):
        result.update(units.get(child_id, {}).get("sector_keys") or [])
    return result


async def _resource_context(resource_type: Optional[str], resource_id: Optional[str], context: Optional[dict] = None) -> dict:
    result = dict(context or {})
    if not resource_type or not resource_id:
        return result
    collection_map = {
        "project": "projects", "task": "tasks", "document": "documents",
        "meeting": "meetings", "meeting_request": "meeting_requests", "user": "users",
    }
    collection_name = collection_map.get(resource_type)
    if not collection_name:
        return result
    document = await getattr(core.db, collection_name).find_one({"id": resource_id}, {"_id": 0})
    if not document:
        return result
    result.setdefault("resource", document)
    for key in ("organization_id", "unit_id", "sector", "project_id", "classification", "amount", "budget", "created_by", "owner_id", "assignee_id"):
        if key in document and key not in result:
            result[key] = document.get(key)
    if resource_type == "project":
        result.setdefault("project_id", resource_id)
    if result.get("project_id") and not result.get("sector"):
        project = await core.db.projects.find_one({"id": result["project_id"]}, {"_id": 0, "sector": 1, "unit_id": 1, "organization_id": 1})
        if project:
            result.setdefault("sector", project.get("sector"))
            result.setdefault("unit_id", project.get("unit_id"))
            result.setdefault("organization_id", project.get("organization_id"))
    return result


async def build_access_snapshot(user: dict) -> dict:
    groups = await _group_ids(user["id"])
    subject_query = {"$or": [
        {"subject_type": "user", "subject_id": user["id"]},
        {"subject_type": "group", "subject_id": {"$in": groups}},
    ]}
    assignments = [item for item in await core.db.role_assignments.find(subject_query, {"_id": 0}).to_list(1000) if _active_window(item)]
    role_ids = list({item["role_id"] for item in assignments})
    roles = await core.db.access_roles.find({"id": {"$in": role_ids}}, {"_id": 0}).to_list(500) if role_ids else []
    role_map = {item["id"]: item for item in roles}
    permissions: set[str] = set()
    for assignment in assignments:
        permissions.update(role_map.get(assignment["role_id"], {}).get("permissions") or [])

    delegations = [item for item in await core.db.delegations.find(
        {"delegate_user_id": user["id"], "active": {"$ne": False}}, {"_id": 0}
    ).to_list(500) if _active_window(item)]
    for delegation in delegations:
        permissions.update(delegation.get("permissions") or [])

    return {
        "version": ACCESS_FABRIC_VERSION,
        "user_id": user["id"],
        "legacy_role": user.get("role"),
        "groups": groups,
        "assignments": assignments,
        "roles": role_map,
        "delegations": delegations,
        "permissions": sorted(permissions),
        "global": any(item.get("scope_type") == "global" for item in assignments),
    }


def _permission_granted(snapshot: dict, permission: str) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if "*" in snapshot.get("permissions", []):
        return True, ["A system-administrator role grants all permissions."]
    if permission in snapshot.get("permissions", []):
        for assignment in snapshot.get("assignments", []):
            role = snapshot.get("roles", {}).get(assignment.get("role_id"), {})
            if permission in (role.get("permissions") or []):
                reasons.append(f"Role '{role.get('name_ar') or role.get('name_en') or role.get('slug')}' grants {permission}.")
        for delegation in snapshot.get("delegations", []):
            if permission in (delegation.get("permissions") or []):
                reasons.append("An active temporary delegation grants this permission.")
        return True, reasons or [f"An active role grants {permission}."]
    return False, [f"No active role, group assignment, relationship, or delegation grants {permission}."]


async def _scope_granted(snapshot: dict, resource: dict, permission: str) -> tuple[bool, list[str]]:
    units = await _units_by_id()
    resource_unit = resource.get("unit_id")
    resource_org = resource.get("organization_id") or ROOT_ORG_ID
    resource_project = resource.get("project_id")
    resource_sector = resource.get("sector")
    reasons: list[str] = []

    for assignment in snapshot.get("assignments", []):
        role = snapshot.get("roles", {}).get(assignment.get("role_id"), {})
        if permission not in (role.get("permissions") or []) and "*" not in (role.get("permissions") or []):
            continue
        scope_type = assignment.get("scope_type", "global")
        scope_id = assignment.get("scope_id")
        if scope_type == "global":
            return True, ["The role assignment has global scope."]
        if scope_type == "organization" and (not scope_id or scope_id == resource_org):
            return True, ["The resource belongs to the assigned organization."]
        if scope_type == "unit" and scope_id:
            descendants = _descendant_unit_ids(scope_id, units)
            sectors = _sectors_for_unit(scope_id, units)
            if resource_unit in descendants or (resource_sector and resource_sector in sectors):
                return True, ["The resource belongs to the assigned organizational unit or one of its descendants."]
        if scope_type == "project" and scope_id and scope_id == resource_project:
            return True, ["The role is assigned directly to this project."]
        if scope_type == "resource" and scope_id and scope_id == resource.get("resource_id"):
            return True, ["The role is assigned directly to this resource."]

    for delegation in snapshot.get("delegations", []):
        if permission not in (delegation.get("permissions") or []):
            continue
        scope_type = delegation.get("scope_type", "global")
        scope_id = delegation.get("scope_id")
        if scope_type == "global" or (scope_type == "organization" and scope_id == resource_org) or (scope_type == "unit" and scope_id == resource_unit) or (scope_type == "project" and scope_id == resource_project) or (scope_type == "resource" and scope_id == resource.get("resource_id")):
            return True, ["An active delegation covers this resource scope."]

    return False, reasons or ["The permission exists, but no active assignment covers this resource scope."]


async def _relationship_grant(snapshot: dict, permission: str, resource_type: Optional[str], resource_id: Optional[str]) -> tuple[bool, list[str]]:
    if not resource_type or not resource_id:
        return False, []
    relations = await core.db.resource_relations.find({
        "resource_type": resource_type,
        "resource_id": resource_id,
        "$or": [
            {"subject_type": "user", "subject_id": snapshot["user_id"]},
            {"subject_type": "group", "subject_id": {"$in": snapshot.get("groups", [])}},
        ],
        "active": {"$ne": False},
    }, {"_id": 0}).to_list(100)
    for relation in relations:
        if not _active_window(relation):
            continue
        if permission in RELATION_PERMISSIONS.get(relation.get("relation"), set()):
            return True, [f"The '{relation.get('relation')}' relationship grants this action on the resource."]
    return False, []


async def _classification_decision(snapshot: dict, resource: dict) -> tuple[bool, Optional[str]]:
    classification_id = resource.get("classification") or "public_internal"
    classification = await core.db.data_classifications.find_one({"id": classification_id}, {"_id": 0})
    rank = (classification or {}).get("rank", 10)
    if rank >= 50 and "*" not in snapshot.get("permissions", []) and "classification.executive_secret" not in snapshot.get("permissions", []):
        return False, "The resource is classified Executive Secret and the user lacks the explicit classification grant."
    return True, None


async def _approval_decision(snapshot: dict, permission: str, resource: dict) -> tuple[bool, Optional[str]]:
    if not permission.endswith(".approve") and permission != "meeting.decide":
        return True, None
    actor_id = snapshot["user_id"]
    raw = resource.get("resource") or {}
    if permission == "task.approve" and actor_id in {raw.get("created_by"), raw.get("assignee_id")}:
        return False, "Separation of duties: the creator or assignee cannot perform final approval."
    amount = resource.get("amount") or resource.get("budget")
    if amount is None or "*" in snapshot.get("permissions", []) or "approval.override" in snapshot.get("permissions", []):
        return True, None
    role_ids = list(snapshot.get("roles", {}).keys())
    limits = await core.db.approval_limits.find({
        "permission": permission,
        "$or": [
            {"subject_type": "user", "subject_id": actor_id},
            {"subject_type": "role", "subject_id": {"$in": role_ids}},
        ],
        "active": {"$ne": False},
    }, {"_id": 0}).to_list(100)
    max_amount = max([float(item.get("max_amount", 0)) for item in limits] or [0])
    if max_amount and float(amount) <= max_amount:
        return True, None
    return False, f"The requested approval amount ({amount}) exceeds the effective approval limit ({max_amount})."


async def _custom_policy_decision(snapshot: dict, permission: str, resource: dict) -> tuple[bool, list[str]]:
    policies = await core.db.policy_rules.find({
        "enabled": True,
        "$or": [{"permission": permission}, {"permission": None}, {"permission": {"$exists": False}}],
    }, {"_id": 0}).to_list(500)
    notes: list[str] = []
    for policy in policies:
        if policy.get("system") and policy.get("type") in {"default_deny", "separation_of_duties", "classification"}:
            continue
        condition = policy.get("condition") or {}
        matched = True
        equals = condition.get("context_equals") or {}
        for key, expected in equals.items():
            if resource.get(key) != expected:
                matched = False
                break
        if matched and condition.get("classification_in"):
            matched = resource.get("classification") in condition["classification_in"]
        if matched and condition.get("unit_ids"):
            matched = resource.get("unit_id") in condition["unit_ids"]
        if matched and condition.get("max_amount") is not None:
            amount = resource.get("amount") or resource.get("budget") or 0
            matched = float(amount) > float(condition["max_amount"])
        if matched and condition.get("requires_mfa"):
            matched = not bool((resource.get("user") or {}).get("mfa_verified"))
        if not matched:
            continue
        label = policy.get("name") or policy.get("id") or "custom policy"
        if policy.get("effect", "deny") == "deny":
            return False, [f"Policy '{label}' denies this request."]
        notes.append(f"Policy '{label}' explicitly supports this request.")
    return True, notes

async def evaluate_access(
    user: dict,
    permission: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    context: Optional[dict] = None,
    *,
    record: bool = True,
) -> dict:
    snapshot = await build_access_snapshot(user)
    resource = await _resource_context(resource_type, resource_id, context)
    resource.setdefault("resource_id", resource_id)

    permission_ok, reasons = _permission_granted(snapshot, permission)
    relation_ok, relation_reasons = await _relationship_grant(snapshot, permission, resource_type, resource_id)
    permission_ok = permission_ok or relation_ok
    reasons.extend(relation_reasons)

    if not permission_ok:
        decision = {"allowed": False, "permission": permission, "reason": reasons, "policy": "default_deny", "scope": None}
    else:
        if resource_type and resource_id:
            scope_ok, scope_reasons = await _scope_granted(snapshot, resource, permission)
            scope_ok = scope_ok or relation_ok
            reasons.extend(scope_reasons)
        else:
            scope_ok = True
        class_ok, class_reason = await _classification_decision(snapshot, resource)
        approval_ok, approval_reason = await _approval_decision(snapshot, permission, resource)
        custom_ok, custom_reasons = await _custom_policy_decision(snapshot, permission, resource)
        if class_reason:
            reasons.append(class_reason)
        if approval_reason:
            reasons.append(approval_reason)
        reasons.extend(custom_reasons)
        allowed = permission_ok and scope_ok and class_ok and approval_ok and custom_ok
        decision = {
            "allowed": allowed,
            "permission": permission,
            "reason": reasons,
            "policy": "explicit_grant" if allowed else "policy_or_scope_denial",
            "scope": {"resource_type": resource_type, "resource_id": resource_id},
        }

    if record and (not decision["allowed"] or permission in {"access.manage", "user.invite", "user.disable", "task.approve", "meeting.decide"} or os.getenv("AUTHZ_AUDIT_ALL", "false").lower() == "true"):
        await core.db.authorization_decisions.insert_one({
            "id": core.new_id(), "user_id": user["id"], "user_email": user.get("email"),
            "permission": permission, "resource_type": resource_type, "resource_id": resource_id,
            "allowed": decision["allowed"], "reason": decision["reason"], "policy": decision["policy"],
            "created_at": core.now_iso(),
        })
    return decision


async def assign_primary_role(
    user_id: str,
    role_id: str,
    actor: Optional[dict] = None,
    scope_type: str = "global",
    scope_id: Optional[str] = None,
) -> dict:
    role = await core.db.access_roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Access role not found.")
    await core.db.role_assignments.update_many(
        {"subject_type": "user", "subject_id": user_id, "is_primary": True, "active": {"$ne": False}},
        {"$set": {"is_primary": False, "active": False, "revoked_at": core.now_iso(), "updated_at": core.now_iso()}},
    )
    assignment = {
        "id": core.new_id(), "subject_type": "user", "subject_id": user_id,
        "role_id": role_id, "scope_type": scope_type, "scope_id": scope_id,
        "starts_at": None, "expires_at": None, "is_primary": True, "active": True,
        "created_by": actor.get("id") if actor else "system", "created_at": core.now_iso(),
    }
    await core.db.role_assignments.insert_one(dict(assignment))
    await core.db.users.update_one({"id": user_id}, {"$set": {
        "role": role.get("compatibility_role", "tracker"),
        "primary_access_role_id": role_id,
        "primary_scope_type": scope_type,
        "primary_scope_id": scope_id,
        "access_model": "fabric_v2",
        "updated_at": core.now_iso(),
    }})
    if actor:
        target = await core.db.users.find_one({"id": user_id}, {"_id": 0})
        await _audit("primary_access_role_assigned", actor, target, {"role_id": role_id, "scope_type": scope_type, "scope_id": scope_id})
    assignment.pop("_id", None)
    return assignment
