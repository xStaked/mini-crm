export const COMPANY_STATUSES = [
  "prospect",
  "contacted",
  "negotiation",
] as const;

export const COMPANY_PRODUCTS = ["divisas", "bursatil", "ambos"] as const;

export const COMPANY_CONTRACT_STATUSES = ["activo", "inactivo"] as const;

export const COMPANY_CONTACT_SOURCES = [
  "referido",
  "google",
  "base_propia",
  "otro",
] as const;

export const ACTIVITY_TYPES = [
  "note",
  "call",
  "email",
  "meeting",
  "status_change",
  "reassignment",
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];
export type CompanyProduct = (typeof COMPANY_PRODUCTS)[number];
export type CompanyContractStatus = (typeof COMPANY_CONTRACT_STATUSES)[number];
export type CompanyContactSource = (typeof COMPANY_CONTACT_SOURCES)[number];
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
  product: CompanyProduct;
  contract_status: CompanyContractStatus;
  contact_source: CompanyContactSource;
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
