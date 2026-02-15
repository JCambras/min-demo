/** Fire-and-forget event tracking. Never throws. */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
  }).catch(() => {}); // never block UI
}
