import axios from "axios";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://nexgen-executives.onrender.com";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("arak_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export function formatApiError(detail) {
  if (detail == null) return "Unexpected error";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" • ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const SECTOR_LABELS = {
  development: "General Development",
  investment: "Investment",
  arak_development: "ARAAK Development - Egypt",
  academy: "Academy",
  digital: "Digital Transformation",
  corporate: "Corporate Support",
};

export const ROLE_LABELS = {
  admin: "System Administrator",
  ceo: "Chief Executive Officer",
  vp_development: "VP - Development",
  vp_investment: "VP - Investment",
  dev_manager: "ARAAK Development Manager - Egypt",
  tracker: "Executive Follow-up Officer",
};

export const STATUS_LABELS = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
  in_progress: "In Progress",
  awaiting_approval: "Awaiting Approval",
  delayed: "Delayed",
  scheduled: "Scheduled",
  rescheduled: "Rescheduled",
  approved: "Approved",
  rejected: "Rejected",
};

export const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};
