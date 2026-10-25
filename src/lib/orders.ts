export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
] as const;

export type TrackedOrderStatus = (typeof ORDER_STATUSES)[number];

const NEXT_STATUS: Partial<Record<TrackedOrderStatus, TrackedOrderStatus>> = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};

export function isNextOrderStatus(current: string, next: string): next is TrackedOrderStatus {
  return NEXT_STATUS[current as TrackedOrderStatus] === next;
}

export function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
