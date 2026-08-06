import { WorkOrder, Customer, Technician, AppNotification } from "../types";

// Type guard for WorkOrder
export function isWorkOrder(data: any): data is WorkOrder {
  return data && typeof data.id === "string" && typeof data.title === "string";
}

// Type guard for Customer
export function isCustomer(data: any): data is Customer {
  return data && typeof data.id === "string" && typeof data.name === "string";
}

// Type guard for Technician
export function isTechnician(data: any): data is Technician {
  return data && typeof data.id === "string" && typeof data.name === "string";
}

// Type guard for AppNotification
export function isAppNotification(data: any): data is AppNotification {
  return data && typeof data.id === "string" && typeof data.type === "string";
}

// Helper function to safely access properties
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  try {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null) return defaultValue;
      current = current[key];
    }
    return current !== undefined ? current : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}