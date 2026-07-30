"""Pydantic command models for ARAAK Access Fabric."""
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field
from .catalog import ROOT_ORG_ID, ROOT_UNIT_ID

class OrganizationInput(BaseModel):
    name_ar: str
    name_en: Optional[str] = ""
    type: str = "company"
    parent_id: Optional[str] = None


class UnitInput(BaseModel):
    organization_id: str = ROOT_ORG_ID
    parent_id: Optional[str] = ROOT_UNIT_ID
    name_ar: str
    name_en: Optional[str] = ""
    type: str = "department"
    sector_keys: list[str] = Field(default_factory=list)


class GroupInput(BaseModel):
    organization_id: str = ROOT_ORG_ID
    name_ar: str
    name_en: Optional[str] = ""
    type: str = "team"


class GroupMemberInput(BaseModel):
    user_id: str


class RoleInput(BaseModel):
    name_ar: str
    name_en: Optional[str] = ""
    description: Optional[str] = ""
    compatibility_role: Literal["admin", "ceo", "vp_development", "vp_investment", "dev_manager", "tracker"] = "tracker"
    permissions: list[str] = Field(default_factory=list)


class RolePermissionsInput(BaseModel):
    permissions: list[str]


class AssignmentInput(BaseModel):
    subject_type: Literal["user", "group"] = "user"
    subject_id: str
    role_id: str
    scope_type: Literal["global", "organization", "unit", "project", "resource"] = "global"
    scope_id: Optional[str] = None
    starts_at: Optional[str] = None
    expires_at: Optional[str] = None
    is_primary: bool = False


class RelationInput(BaseModel):
    subject_type: Literal["user", "group"] = "user"
    subject_id: str
    relation: Literal["owner", "member", "assignee", "reviewer", "approver"]
    resource_type: str
    resource_id: str
    expires_at: Optional[str] = None


class DelegationInput(BaseModel):
    grantor_user_id: str
    delegate_user_id: str
    permissions: list[str]
    scope_type: Literal["global", "organization", "unit", "project", "resource"] = "global"
    scope_id: Optional[str] = None
    starts_at: Optional[str] = None
    expires_at: str
    reason: Optional[str] = ""


class PolicyInput(BaseModel):
    name: str
    type: str
    effect: Literal["allow", "deny"] = "deny"
    permission: Optional[str] = None
    enabled: bool = True
    condition: dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = ""


class ApprovalLimitInput(BaseModel):
    subject_type: Literal["user", "role"]
    subject_id: str
    permission: str = "task.approve"
    currency: str = "SAR"
    max_amount: float
    scope_type: Literal["global", "organization", "unit", "project"] = "global"
    scope_id: Optional[str] = None


class SimulationInput(BaseModel):
    user_id: str
    permission: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    context: dict[str, Any] = Field(default_factory=dict)
