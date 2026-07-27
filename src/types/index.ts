export type UserRole = "admin" | "manager" | "technician";

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  recipientRole: UserRole;
  read: boolean;
  created_at: string;
}

export type NotificationInput = Omit<AppNotification, "id" | "read" | "created_at">;

export interface AuthContextValue {
  session: import("@supabase/supabase-js").Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}
