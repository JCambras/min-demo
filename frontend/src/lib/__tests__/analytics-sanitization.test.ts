// ─── Analytics PII Sanitization Tests ─────────────────────────────────────────
//
// Verifies that sanitizeStatsForAnalytics and sanitizeEventProperties
// strip PII before analytics data reaches Turso.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizeStatsForAnalytics,
  sanitizeEventProperties,
} from "@/lib/analytics";
import type { HomeStats } from "@/lib/home-stats";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a full HomeStats object with PII-laden array fields. */
function buildMockStats(overrides?: Partial<HomeStats>): HomeStats {
  return {
    overdueTasks: 3,
    openTasks: 12,
    readyForReview: 2,
    unsignedEnvelopes: 1,
    upcomingMeetings: 4,
    overdueTaskItems: [
      { subject: "Follow up", household: "Smith Family", url: "/task/1", daysOld: 5 },
    ],
    openTaskItems: [
      { subject: "Rebalance", household: "Jones Trust", url: "/task/2", daysOld: 2 },
    ],
    readyForReviewItems: [],
    unsignedItems: [],
    upcomingMeetingItems: [],
    recentItems: [
      { subject: "Call", household: "Adams LLC", url: "/recent/1", type: "task" },
    ],
    insights: [{ label: "High priority", value: 5, trend: "up" as const }],
    triageItems: [],
    ...overrides,
  } as HomeStats;
}

// ─── sanitizeStatsForAnalytics ────────────────────────────────────────────────

describe("sanitizeStatsForAnalytics", () => {
  it("passes through aggregate numeric fields", () => {
    const stats = buildMockStats();
    const result = sanitizeStatsForAnalytics(stats);
    expect(result).toEqual({
      overdueTasks: 3,
      openTasks: 12,
      readyForReview: 2,
      unsignedEnvelopes: 1,
      upcomingMeetings: 4,
    });
  });

  it("strips array fields containing PII (overdueTaskItems, openTaskItems, etc.)", () => {
    const result = sanitizeStatsForAnalytics(buildMockStats());
    expect(result).not.toHaveProperty("overdueTaskItems");
    expect(result).not.toHaveProperty("openTaskItems");
    expect(result).not.toHaveProperty("readyForReviewItems");
    expect(result).not.toHaveProperty("unsignedItems");
    expect(result).not.toHaveProperty("upcomingMeetingItems");
    expect(result).not.toHaveProperty("recentItems");
    expect(result).not.toHaveProperty("insights");
    expect(result).not.toHaveProperty("triageItems");
  });

  it("returns empty object for null stats", () => {
    expect(sanitizeStatsForAnalytics(null)).toEqual({});
  });

  it("returns empty object for undefined stats", () => {
    expect(sanitizeStatsForAnalytics(undefined)).toEqual({});
  });

  it("handles zero-value numeric fields", () => {
    const stats = buildMockStats({
      overdueTasks: 0,
      openTasks: 0,
      readyForReview: 0,
      unsignedEnvelopes: 0,
      upcomingMeetings: 0,
    });
    const result = sanitizeStatsForAnalytics(stats);
    expect(result).toEqual({
      overdueTasks: 0,
      openTasks: 0,
      readyForReview: 0,
      unsignedEnvelopes: 0,
      upcomingMeetings: 0,
    });
  });

  it("returns only numeric fields even if stats has extra properties", () => {
    const stats = buildMockStats();
    (stats as Record<string, unknown>).secretField = "should not appear";
    const result = sanitizeStatsForAnalytics(stats);
    expect(Object.keys(result)).toEqual([
      "overdueTasks",
      "openTasks",
      "readyForReview",
      "unsignedEnvelopes",
      "upcomingMeetings",
    ]);
  });
});

// ─── sanitizeEventProperties ──────────────────────────────────────────────────

describe("sanitizeEventProperties", () => {
  it("passes safe primitives (string, number, boolean)", () => {
    const result = sanitizeEventProperties({
      screen: "home",
      count: 5,
      isNew: true,
    });
    expect(result).toEqual({ screen: "home", count: 5, isNew: true });
  });

  it("strips PII key: name", () => {
    const result = sanitizeEventProperties({ name: "John Doe", screen: "home" });
    expect(result).not.toHaveProperty("name");
    expect(result).toHaveProperty("screen", "home");
  });

  it("strips PII key: email", () => {
    const result = sanitizeEventProperties({ email: "john@example.com" });
    expect(result).not.toHaveProperty("email");
  });

  it("strips PII key: phone", () => {
    const result = sanitizeEventProperties({ phone: "555-1234" });
    expect(result).not.toHaveProperty("phone");
  });

  it("strips PII key: household", () => {
    const result = sanitizeEventProperties({ household: "Smith Family" });
    expect(result).not.toHaveProperty("household");
  });

  it("strips PII key: accountId", () => {
    const result = sanitizeEventProperties({ accountId: "001abc" });
    expect(result).not.toHaveProperty("accountId");
  });

  it("strips PII key: contactId", () => {
    const result = sanitizeEventProperties({ contactId: "003xyz" });
    expect(result).not.toHaveProperty("contactId");
  });

  it("strips PII key: ssn", () => {
    const result = sanitizeEventProperties({ ssn: "123-45-6789" });
    expect(result).not.toHaveProperty("ssn");
  });

  it("strips PII keys case-insensitively", () => {
    const result = sanitizeEventProperties({ Name: "Jane", EMAIL: "j@x.com", event: "click" });
    expect(result).not.toHaveProperty("Name");
    expect(result).not.toHaveProperty("EMAIL");
    expect(result).toHaveProperty("event", "click");
  });

  it("rejects nested objects", () => {
    const result = sanitizeEventProperties({ data: { nested: true }, screen: "home" });
    expect(result).not.toHaveProperty("data");
    expect(result).toHaveProperty("screen", "home");
  });

  it("rejects arrays", () => {
    const result = sanitizeEventProperties({ items: [1, 2, 3], count: 3 });
    expect(result).not.toHaveProperty("items");
    expect(result).toHaveProperty("count", 3);
  });

  it("truncates strings longer than 200 characters", () => {
    const longStr = "a".repeat(300);
    const result = sanitizeEventProperties({ description: longStr });
    expect((result.description as string).length).toBe(200);
  });

  it("preserves strings at exactly 200 characters", () => {
    const str200 = "b".repeat(200);
    const result = sanitizeEventProperties({ msg: str200 });
    expect(result.msg).toBe(str200);
  });

  it("drops null and undefined values", () => {
    const result = sanitizeEventProperties({ a: null, b: undefined, c: "ok" });
    expect(result).not.toHaveProperty("a");
    expect(result).not.toHaveProperty("b");
    expect(result).toHaveProperty("c", "ok");
  });

  it("returns empty object for null input", () => {
    expect(sanitizeEventProperties(null)).toEqual({});
  });

  it("returns empty object for undefined input", () => {
    expect(sanitizeEventProperties(undefined)).toEqual({});
  });

  it("returns empty object for non-object input", () => {
    expect(sanitizeEventProperties("string" as unknown as Record<string, unknown>)).toEqual({});
  });
});

// ─── trackEvent integration ───────────────────────────────────────────────────

describe("trackEvent", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("sanitizes properties before sending", async () => {
    const { trackEvent } = await import("@/lib/analytics");
    trackEvent("test_event", { screen: "home", name: "PII Name", nested: { a: 1 } });

    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.eventName).toBe("test_event");
    expect(body.properties).toEqual({ screen: "home" });
    expect(body.properties).not.toHaveProperty("name");
    expect(body.properties).not.toHaveProperty("nested");
  });

  it("sends undefined properties when none provided", async () => {
    const { trackEvent } = await import("@/lib/analytics");
    trackEvent("bare_event");

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.properties).toBeUndefined();
  });
});
