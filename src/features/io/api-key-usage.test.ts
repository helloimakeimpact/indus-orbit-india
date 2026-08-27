import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apiKeyLifecycle, parseIoApiKeyUsageRows, usagePercent } from "./api-key-usage.ts";

describe("I/O API-key usage evidence", () => {
  it("accepts exact current-window counters and drops malformed rows", () => {
    const parsed = parseIoApiKeyUsageRows([
      {
        api_key_id: "key-1",
        minute_request_count: 2,
        day_request_count: 12,
        month_request_count: 120,
        day_reserved_nanos: "100",
        day_spent_nanos: "900",
        month_reserved_nanos: "200",
        month_spent_nanos: "5000",
        minute_reset_at: "2026-08-27T12:01:00Z",
        day_reset_at: "2026-08-28T00:00:00Z",
        month_reset_at: "2026-09-01T00:00:00Z",
      },
      { api_key_id: "bad", minute_request_count: -1 },
    ]);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.monthSpentNanos, "5000");
  });

  it("marks active keys for rotation seven days before expiry", () => {
    const now = Date.parse("2026-08-27T00:00:00Z");
    assert.equal(apiKeyLifecycle("active", "2026-09-20T00:00:00Z", now).rotateSoon, false);
    assert.equal(apiKeyLifecycle("active", "2026-09-03T00:00:00Z", now).rotateSoon, true);
    assert.equal(apiKeyLifecycle("active", "2026-08-26T00:00:00Z", now).effectiveStatus, "expired");
  });

  it("bounds usage percentages for safe progress display", () => {
    assert.equal(usagePercent(5, 20), 25);
    assert.equal(usagePercent("12", "10"), 100);
    assert.equal(usagePercent("900719925474099312345", "1801439850948198624690"), 50);
    assert.equal(usagePercent(1, 0), 0);
  });
});
