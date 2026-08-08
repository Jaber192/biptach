export type UserRole = "owner" | "manager" | "dispatcher" | "technician";

export const ALL_ROLES: UserRole[] = ["owner", "manager", "dispatcher", "technician"];

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  company_id: string | null;
  owner_technician_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMembership {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type InvitationRole = "manager" | "dispatcher" | "technician";

export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  role: InvitationRole;
  invite_code: string;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface InvitationInput {
  email: string;
  role: InvitationRole;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInput = Omit<Customer, "id" | "created_at" | "updated_at">;

export type WorkOrderStatus = "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

export type WorkOrderJobType =
  | "repair"
  | "install"
  | "maintenance"
  | "inspection"
  | "emergency"
  | "other";

export interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  jobType: WorkOrderJobType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  customerId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  scheduledDate: string | null;
  clockInTime: string | null;
  clockOutTime: string | null;
  techNotes: string | null;
  photos: string[];
  signatureStorageId: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkOrderInput = Omit<
  WorkOrder,
  | "id"
  | "created_at"
  | "updated_at"
  | "clockInTime"
  | "clockOutTime"
  | "techNotes"
  | "photos"
  | "signatureStorageId"
>;

export interface Technician {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TechnicianInput = Omit<Technician, "id" | "created_at" | "updated_at">;

export type NotificationType =
  | "job_assigned"
  | "job_started"
  | "job_completed"
  | "job_cancelled"
  | "job_created"
  | "job_scheduled"
  | "job_clocked_in"
  | "job_clocked_out"
  | "customer_created"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  workOrderId: string | null;
  userId: string | null;
  recipientRole: UserRole;
  read: boolean;
  created_at: string;
}

export type NotificationInput = Omit<AppNotification, "id" | "read" | "created_at">;

export interface AuthContextValue {
  session: import("@supabase/supabase-js").Session | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithCompany: (name: string, email: string, password: string, companyName: string) => Promise<{ error: string | null }>;
  acceptInvitation: (inviteCode: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}
