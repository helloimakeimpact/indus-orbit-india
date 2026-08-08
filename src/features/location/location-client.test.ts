import assert from "node:assert/strict";
import test from "node:test";
import { decodeLocationMutationResult, decodeLocationPreferences } from "./location-contract";

test("decodes a successful location mutation", () => {
  assert.deepEqual(decodeLocationMutationResult({ ok: true, changed: false }), {
    ok: true,
    changed: false,
  });
});

test("rejects malformed location mutation responses", () => {
  assert.throws(() => decodeLocationMutationResult(null), /invalid response/);
  assert.throws(
    () => decodeLocationMutationResult({ ok: false, changed: true }),
    /invalid response/,
  );
});

test("decodes private location preferences without inventing consent", () => {
  assert.deepEqual(
    decodeLocationPreferences({
      countryCode: "IN",
      legacyCountryLabel: null,
      regionLabel: "Maharashtra",
      cityLabel: "Pune",
      timezoneName: null,
      legacyTimezoneLabel: null,
      useForScheduling: false,
      useForRecommendations: true,
      source: "member",
      consentVersion: "community-location-v1",
      consentedAt: "2026-08-08T00:00:00Z",
      shareAudience: "members",
      sharePrecision: "country",
    }),
    {
      countryCode: "IN",
      legacyCountryLabel: null,
      regionLabel: "Maharashtra",
      cityLabel: "Pune",
      timezoneName: null,
      legacyTimezoneLabel: null,
      useForScheduling: false,
      useForRecommendations: true,
      source: "member",
      consentVersion: "community-location-v1",
      consentedAt: "2026-08-08T00:00:00Z",
      shareAudience: "members",
      sharePrecision: "country",
    },
  );
});

test("rejects unknown location preference policy values", () => {
  assert.throws(
    () =>
      decodeLocationPreferences({
        countryCode: null,
        legacyCountryLabel: null,
        regionLabel: null,
        cityLabel: null,
        timezoneName: null,
        legacyTimezoneLabel: null,
        useForScheduling: false,
        useForRecommendations: false,
        source: "inferred",
        consentVersion: null,
        consentedAt: null,
        shareAudience: null,
        sharePrecision: null,
      }),
    /invalid preferences/,
  );
});
