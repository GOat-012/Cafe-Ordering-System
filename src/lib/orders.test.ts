import { describe, expect, it } from "vitest";
import { isNextOrderStatus, ORDER_STATUSES, statusLabel } from "./orders";

describe("order status workflow", () => {
  it("moves through the customer tracking timeline in order", () => {
    expect(ORDER_STATUSES).toEqual(["PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED"]);
    expect(isNextOrderStatus("PLACED", "CONFIRMED")).toBe(true);
    expect(isNextOrderStatus("CONFIRMED", "PREPARING")).toBe(true);
    expect(isNextOrderStatus("PREPARING", "READY")).toBe(true);
    expect(isNextOrderStatus("READY", "SERVED")).toBe(true);
  });

  it("rejects skipped, reversed, terminal, and unknown transitions", () => {
    expect(isNextOrderStatus("PLACED", "PREPARING")).toBe(false);
    expect(isNextOrderStatus("READY", "PREPARING")).toBe(false);
    expect(isNextOrderStatus("SERVED", "SERVED")).toBe(false);
    expect(isNextOrderStatus("UNKNOWN", "PLACED")).toBe(false);
  });

  it("formats status labels for accessible customer timelines", () => {
    expect(statusLabel("PREPARING")).toBe("Preparing");
  });
});
