"""Central route authorization middleware and scoped list filtering."""
import json
import re
from typing import Any, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse, Response
from .. import core
from .engine import (
    _current_access, _permission_granted, _relationship_grant, _scope_granted,
    _units_by_id, build_access_snapshot, evaluate_access,
)

PUBLIC_PATHS = {
    "/api/auth/login", "/api/auth/invitation", "/api/auth/activate", "/api/",
    "/api/health", "/api/healthz", "/api/auth/refresh", "/docs", "/openapi.json", "/redoc",
}


def _route_permission(method: str, path: str) -> tuple[str, Optional[str], Optional[str]]:
    method = method.upper()
    resource_id: Optional[str] = None
    resource_type: Optional[str] = None

    if path.startswith("/api/access/") or path == "/api/access":
        if path == "/api/access/me": return "platform.access", None, None
        if path.startswith("/api/access/audit"): return "audit.view", None, None
        if path.startswith("/api/access/delegations"): return "delegation.manage", None, None
        if path.startswith("/api/access/organizations") or path.startswith("/api/access/units"):
            return "organization.manage", None, None
        return "access.manage", None, None
    if path.startswith("/api/users"):
        if method == "GET": return "user.view", "user", None
        if "/invite" in path or path.endswith("/reset-invite"): return "user.invite", "user", _last_id(path, "users")
        if method == "DELETE": return "user.disable", "user", _last_id(path, "users")
        return "user.update", "user", _last_id(path, "users")
    if path.startswith("/api/projects"):
        resource_type, resource_id = "project", _last_id(path, "projects")
        return ({"GET": "project.view", "POST": "project.create", "PATCH": "project.update", "PUT": "project.update", "DELETE": "project.delete"}.get(method, "project.view"), resource_type, resource_id)
    if path.startswith("/api/tasks"):
        resource_type, resource_id = "task", _last_id(path, "tasks")
        if path.endswith("/approve"): return "task.approve", resource_type, resource_id
        return ({"GET": "task.view", "POST": "task.create", "PATCH": "task.update", "PUT": "task.update", "DELETE": "task.delete"}.get(method, "task.view"), resource_type, resource_id)
    if path.startswith("/api/documents"):
        resource_type, resource_id = "document", _last_id(path, "documents")
        if "download" in path: return "document.download", resource_type, resource_id
        return ({"GET": "document.view", "POST": "document.upload", "PATCH": "document.update", "PUT": "document.update", "DELETE": "document.update"}.get(method, "document.view"), resource_type, resource_id)
    if path.startswith("/api/meeting-requests"):
        resource_type, resource_id = "meeting_request", _last_id(path, "meeting-requests")
        if path.endswith("/decision"): return "meeting.decide", resource_type, resource_id
        return ({"GET": "meeting.view", "POST": "meeting.create", "PATCH": "meeting.update"}.get(method, "meeting.view"), resource_type, resource_id)
    if path.startswith("/api/meetings") or path.startswith("/api/calendar"):
        return ({"GET": "meeting.view", "POST": "meeting.create", "PATCH": "meeting.update", "PUT": "meeting.update", "DELETE": "meeting.update"}.get(method, "meeting.view"), "meeting", _last_id(path, "meetings"))
    if path.startswith("/api/messages"):
        return ("message.view" if method == "GET" else "message.send", None, None)
    if path.startswith("/api/reports") or path.startswith("/api/daily"):
        return ("report.view" if method == "GET" else "report.generate", None, None)
    if path.startswith("/api/ai"):
        return "ai.use", None, None
    if path.startswith("/api/voice"):
        return "voice.use", None, None
    if path.startswith("/api/dashboard"):
        return "dashboard.view", None, None
    return "platform.access", None, None


def _last_id(path: str, marker: str) -> Optional[str]:
    match = re.search(rf"/{re.escape(marker)}/([^/]+)", path)
    return match.group(1) if match else None


async def _request_context(request: Request) -> dict:
    context: dict[str, Any] = {
        "organization_id": request.headers.get("x-organization-id"),
        "unit_id": request.headers.get("x-org-unit-id"),
        "classification": request.headers.get("x-data-classification"),
    }
    if request.method in {"POST", "PUT", "PATCH"} and "application/json" in request.headers.get("content-type", ""):
        try:
            body = await request.json()
            if isinstance(body, dict):
                for key in ("organization_id", "unit_id", "sector", "project_id", "classification", "amount", "budget", "created_by", "assignee_id"):
                    if body.get(key) is not None:
                        context[key] = body.get(key)
        except Exception:
            pass
    return {key: value for key, value in context.items() if value is not None}


async def _filter_list(snapshot: dict, items: list[dict], permission: str, resource_type: str) -> list[dict]:
    if "*" in snapshot.get("permissions", []) or snapshot.get("global"):
        return items
    filtered: list[dict] = []
    await _units_by_id()
    for item in items:
        resource = dict(item)
        resource.setdefault("resource_id", item.get("id"))
        if resource_type == "project": resource.setdefault("project_id", item.get("id"))
        permission_ok, _ = _permission_granted(snapshot, permission)
        if not permission_ok:
            continue
        scope_ok, _ = await _scope_granted(snapshot, resource, permission)
        if scope_ok:
            filtered.append(item)
            continue
        relation_ok, _ = await _relationship_grant(snapshot, permission, resource_type, item.get("id"))
        if relation_ok:
            filtered.append(item)
    return filtered


@core.app.middleware("http")
async def access_fabric_middleware(request: Request, call_next):
    path = request.url.path
    if request.method == "OPTIONS" or not path.startswith("/api/") or path in PUBLIC_PATHS:
        return await call_next(request)
    try:
        user = await core.get_current_user(request)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    permission, resource_type, resource_id = _route_permission(request.method, path)
    context = await _request_context(request)
    decision = await evaluate_access(user, permission, resource_type, resource_id, context)
    if not decision["allowed"]:
        return JSONResponse(status_code=403, content={"detail": {"message": "Access denied", "decision": decision}})

    snapshot = await build_access_snapshot(user)
    token = _current_access.set(snapshot)
    try:
        response = await call_next(request)
        if request.method == "GET" and response.status_code == 200 and path in {"/api/projects", "/api/tasks", "/api/documents"}:
            raw = b"".join([chunk async for chunk in response.body_iterator])
            try:
                payload = json.loads(raw)
                if isinstance(payload, list):
                    kind = path.rsplit("/", 1)[-1].rstrip("s")
                    payload = await _filter_list(snapshot, payload, permission, kind)
                    headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
                    return Response(content=json.dumps(payload, ensure_ascii=False, default=str), status_code=response.status_code, headers=headers, media_type="application/json")
            except Exception:
                pass
            headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
            return Response(content=raw, status_code=response.status_code, headers=headers, media_type=response.media_type)
        return response
    finally:
        _current_access.reset(token)
