"""Static permission, role, structure, classification and policy catalogues."""

ACCESS_FABRIC_VERSION = "2.0"
ROOT_ORG_ID = "org_araak"
ROOT_UNIT_ID = "unit_ceo_office"

PERMISSIONS = [
    ("platform.access", "Platform", "Access the institutional platform"),
    ("dashboard.view", "Dashboard", "View executive dashboards"),
    ("project.view", "Projects", "View projects"),
    ("project.create", "Projects", "Create projects"),
    ("project.update", "Projects", "Update projects"),
    ("project.delete", "Projects", "Delete projects"),
    ("task.view", "Tasks", "View tasks"),
    ("task.create", "Tasks", "Create tasks"),
    ("task.update", "Tasks", "Update tasks"),
    ("task.delete", "Tasks", "Delete tasks"),
    ("task.assign", "Tasks", "Assign tasks"),
    ("task.approve", "Tasks", "Approve completed work"),
    ("meeting.view", "Meetings", "View meetings"),
    ("meeting.create", "Meetings", "Create meetings"),
    ("meeting.update", "Meetings", "Update meetings"),
    ("meeting.decide", "Meetings", "Approve or reject meeting requests"),
    ("document.view", "Documents", "View documents"),
    ("document.upload", "Documents", "Upload documents"),
    ("document.update", "Documents", "Update document metadata"),
    ("document.download", "Documents", "Download documents"),
    ("document.classify", "Documents", "Classify sensitive documents"),
    ("message.view", "Communications", "View communications"),
    ("message.send", "Communications", "Send communications"),
    ("report.view", "Reports", "View reports"),
    ("report.generate", "Reports", "Generate reports"),
    ("ai.use", "AI", "Use executive AI agents"),
    ("voice.use", "AI", "Use the voice agent"),
    ("user.view", "Identity", "View user accounts"),
    ("user.invite", "Identity", "Invite users"),
    ("user.update", "Identity", "Update user accounts"),
    ("user.disable", "Identity", "Disable user accounts"),
    ("organization.manage", "Governance", "Manage organizational structure"),
    ("access.manage", "Governance", "Manage roles, groups, and policies"),
    ("delegation.manage", "Governance", "Manage temporary delegations"),
    ("audit.view", "Governance", "View security and authorization audit"),
    ("approval.override", "Governance", "Override approval limits"),
    ("classification.executive_secret", "Governance", "Access executive-secret records"),
]
ALL_PERMISSION_CODES = [item[0] for item in PERMISSIONS]

OPERATIONAL_VIEW = {
    "platform.access", "dashboard.view", "project.view", "task.view",
    "meeting.view", "document.view", "report.view", "ai.use",
}
OPERATIONAL_WRITE = {
    "project.create", "project.update", "task.create", "task.update", "task.assign",
    "meeting.create", "meeting.update", "document.upload", "document.update",
    "message.view", "message.send", "report.generate",
}

ROLE_TEMPLATES = [
    {
        "id": "role_admin", "slug": "admin", "name_ar": "مدير النظام والمنصة",
        "name_en": "Platform Administrator", "compatibility_role": "admin",
        "description": "Manages identities, structures, policies and technical access without automatic ownership of executive content.",
        "permissions": ["platform.access", "user.view", "user.invite", "user.update", "user.disable", "organization.manage", "access.manage", "delegation.manage", "audit.view"], "system": True,
    },
    {
        "id": "role_ceo", "slug": "ceo", "name_ar": "الرئيس التنفيذي",
        "name_en": "Chief Executive Officer", "compatibility_role": "ceo",
        "description": "Full executive and operational visibility, approvals and sensitive classifications; identity administration remains separate.",
        "permissions": sorted(set(ALL_PERMISSION_CODES) - {"access.manage", "organization.manage", "user.invite", "user.update", "user.disable"}),
        "system": True,
    },
    {
        "id": "role_vp_development", "slug": "vp_development", "name_ar": "نائب الرئيس التنفيذي للتنمية",
        "name_en": "Executive VP - Development", "compatibility_role": "vp_development",
        "description": "Leads development portfolio within assigned organizational scope.",
        "permissions": sorted(OPERATIONAL_VIEW | OPERATIONAL_WRITE | {"task.approve", "meeting.decide", "document.download"}),
        "system": True,
    },
    {
        "id": "role_vp_investment", "slug": "vp_investment", "name_ar": "نائب الرئيس التنفيذي للاستثمار",
        "name_en": "Executive VP - Investment", "compatibility_role": "vp_investment",
        "description": "Leads investment portfolio within assigned organizational scope.",
        "permissions": sorted(OPERATIONAL_VIEW | OPERATIONAL_WRITE | {"task.approve", "meeting.decide", "document.download"}),
        "system": True,
    },
    {
        "id": "role_dev_manager", "slug": "dev_manager", "name_ar": "مدير تنفيذي / مدير وحدة",
        "name_en": "Business Unit Manager", "compatibility_role": "dev_manager",
        "description": "Manages projects and teams within one business unit.",
        "permissions": sorted(OPERATIONAL_VIEW | OPERATIONAL_WRITE | {"document.download"}),
        "system": True,
    },
    {
        "id": "role_tracker", "slug": "tracker", "name_ar": "مسؤول المتابعة التنفيذية",
        "name_en": "Executive Follow-up", "compatibility_role": "tracker",
        "description": "Tracks execution and reports without broad approval authority.",
        "permissions": sorted(OPERATIONAL_VIEW | {"task.update", "message.view", "message.send", "report.generate"}),
        "system": True,
    },
    {
        "id": "role_project_manager", "slug": "project_manager", "name_ar": "مدير مشروع",
        "name_en": "Project Manager", "compatibility_role": "tracker",
        "description": "Project-scoped delivery and task management.",
        "permissions": sorted({"platform.access", "dashboard.view", "project.view", "project.update", "task.view", "task.create", "task.update", "task.assign", "meeting.view", "meeting.create", "document.view", "document.upload", "document.download", "report.view", "report.generate", "ai.use"}),
        "system": True,
    },
    {
        "id": "role_technical_committee", "slug": "technical_committee", "name_ar": "عضو اللجنة الفنية",
        "name_en": "Technical Committee Member", "compatibility_role": "tracker",
        "description": "Reviews technical documents and assigned opportunities.",
        "permissions": sorted({"platform.access", "dashboard.view", "project.view", "task.view", "document.view", "document.download", "report.view", "message.view", "message.send", "ai.use"}),
        "system": True,
    },
    {
        "id": "role_financial_reviewer", "slug": "financial_reviewer", "name_ar": "مراجع مالي",
        "name_en": "Financial Reviewer", "compatibility_role": "tracker",
        "description": "Reviews financial material in assigned scopes.",
        "permissions": sorted({"platform.access", "dashboard.view", "project.view", "task.view", "document.view", "document.download", "report.view", "report.generate"}),
        "system": True,
    },
    {
        "id": "role_final_approver", "slug": "final_approver", "name_ar": "معتمد نهائي",
        "name_en": "Final Approver", "compatibility_role": "vp_development",
        "description": "Approves assigned work subject to limits and separation-of-duties policies.",
        "permissions": sorted(OPERATIONAL_VIEW | {"task.approve", "meeting.decide", "document.download", "report.generate"}),
        "system": True,
    },
    {
        "id": "role_viewer", "slug": "viewer", "name_ar": "مشاهد فقط",
        "name_en": "Read-only Viewer", "compatibility_role": "tracker",
        "description": "Read-only access within explicit scopes.",
        "permissions": sorted(OPERATIONAL_VIEW), "system": True,
    },
]

ORGANIZATIONS = [
    {"id": ROOT_ORG_ID, "name_ar": "مجموعة اراك للتنمية", "name_en": "ARAAK Development Group", "type": "group", "active": True},
]
ORG_UNITS = [
    {"id": ROOT_UNIT_ID, "organization_id": ROOT_ORG_ID, "parent_id": None, "name_ar": "مكتب الرئيس التنفيذي", "name_en": "CEO Office", "type": "office", "sector_keys": [], "active": True},
    {"id": "unit_development", "organization_id": ROOT_ORG_ID, "parent_id": ROOT_UNIT_ID, "name_ar": "قطاع التنمية", "name_en": "Development Portfolio", "type": "portfolio", "sector_keys": ["development", "arak_development", "academy", "digital", "corporate"], "active": True},
    {"id": "unit_investment", "organization_id": ROOT_ORG_ID, "parent_id": ROOT_UNIT_ID, "name_ar": "قطاع الاستثمار", "name_en": "Investment Portfolio", "type": "portfolio", "sector_keys": ["investment"], "active": True},
    {"id": "unit_arak_development", "organization_id": ROOT_ORG_ID, "parent_id": "unit_development", "name_ar": "اراك للتنمية والتشغيل", "name_en": "Operations and Delivery", "type": "business_unit", "sector_keys": ["arak_development"], "active": True},
    {"id": "unit_academy", "organization_id": ROOT_ORG_ID, "parent_id": "unit_development", "name_ar": "أكاديمية اراك", "name_en": "ARAAK Academy", "type": "business_unit", "sector_keys": ["academy"], "active": True},
    {"id": "unit_digital", "organization_id": ROOT_ORG_ID, "parent_id": "unit_development", "name_ar": "التحول الرقمي", "name_en": "Digital Transformation", "type": "department", "sector_keys": ["digital"], "active": True},
    {"id": "unit_corporate", "organization_id": ROOT_ORG_ID, "parent_id": ROOT_UNIT_ID, "name_ar": "الخدمات المؤسسية", "name_en": "Corporate Services", "type": "department", "sector_keys": ["corporate"], "active": True},
]
GROUPS = [
    {"id": "group_executive_committee", "organization_id": ROOT_ORG_ID, "name_ar": "اللجنة التنفيذية", "name_en": "Executive Committee", "type": "committee", "system": True},
    {"id": "group_technical_committee", "organization_id": ROOT_ORG_ID, "name_ar": "اللجنة الفنية", "name_en": "Technical Committee", "type": "committee", "system": True},
    {"id": "group_tender_committee", "organization_id": ROOT_ORG_ID, "name_ar": "لجنة المنافسات والتسعير", "name_en": "Tender and Pricing Committee", "type": "committee", "system": True},
]
CLASSIFICATIONS = [
    {"id": "public_internal", "name_ar": "عام داخلي", "name_en": "Internal", "rank": 10},
    {"id": "restricted", "name_ar": "مقيد", "name_en": "Restricted", "rank": 20},
    {"id": "confidential", "name_ar": "سري", "name_en": "Confidential", "rank": 30},
    {"id": "financial_sensitive", "name_ar": "مالي حساس", "name_en": "Financial Sensitive", "rank": 35},
    {"id": "legal_privileged", "name_ar": "قانوني محمي", "name_en": "Legal Privileged", "rank": 40},
    {"id": "executive_secret", "name_ar": "سري تنفيذي", "name_en": "Executive Secret", "rank": 50},
]
DEFAULT_POLICIES = [
    {
        "id": "policy_default_deny", "name": "Default deny", "type": "default_deny",
        "enabled": True, "effect": "deny", "description": "Deny requests without an explicit permission grant."
    },
    {
        "id": "policy_separation_task_approval", "name": "Task approval separation", "type": "separation_of_duties",
        "enabled": True, "effect": "deny", "permission": "task.approve",
        "condition": {"deny_if_actor_fields": ["created_by", "assignee_id"]},
        "description": "A task creator or assignee cannot be its final approver."
    },
    {
        "id": "policy_executive_secret", "name": "Executive secret classification", "type": "classification",
        "enabled": True, "effect": "deny", "minimum_rank": 50,
        "required_permission": "classification.executive_secret",
        "description": "Executive-secret records require an explicit classification grant."
    },
]

RELATION_PERMISSIONS = {
    "owner": {"project.view", "project.update", "task.view", "document.view"},
    "member": {"project.view", "task.view", "document.view", "meeting.view"},
    "assignee": {"task.view", "task.update", "document.view"},
    "reviewer": {"document.view", "document.download", "report.view"},
    "approver": {"task.view", "task.approve", "document.view", "report.view"},
}

LEGACY_ROLE_SCOPE = {
    "admin": ("global", None),
    "ceo": ("global", None),
    "vp_development": ("unit", "unit_development"),
    "vp_investment": ("unit", "unit_investment"),
    "dev_manager": ("unit", "unit_arak_development"),
    "tracker": ("global", None),
}
