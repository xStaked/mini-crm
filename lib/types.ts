export const COMPANY_STATUSES = [
  "prospect",
  "contacted",
  "negotiation",
  "client",
] as const;

export const COMPANY_PRIORITIES = ["low", "medium", "high"] as const;

export const ACTIVITY_TYPES = [
  "note",
  "call",
  "email",
  "meeting",
  "status_change",
  "reassignment",
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];
export type CompanyPriority = (typeof COMPANY_PRIORITIES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type UserRole = "admin" | "agent";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  office_id: string;
  office_name?: string;
  is_active: boolean;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  rfc: string;
  rfc_normalized: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: CompanyStatus;
  priority: CompanyPriority;
  next_action_at: string | null;
  assigned_to: string;
  office_id: string;
  created_at: string;
  updated_at: string;
};

export type CompanyActivity = {
  id: string;
  company_id: string;
  user_id: string;
  type: ActivityType;
  content: string;
  created_at: string;
  users?: { name: string }[] | null;
};
