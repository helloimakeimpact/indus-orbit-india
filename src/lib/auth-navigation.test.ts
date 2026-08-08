import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthSearch,
  parseAuthIntent,
  parseAuthTab,
  resolveAuthReturnPath,
} from "./auth-navigation";

test("auth intent defaults to I/O and accepts only the community alternative", () => {
  assert.equal(parseAuthIntent(undefined), "io");
  assert.equal(parseAuthIntent("io"), "io");
  assert.equal(parseAuthIntent("community"), "community");
  assert.equal(parseAuthIntent("admin"), "io");
});

test("auth tab accepts signup and otherwise defaults to sign in", () => {
  assert.equal(parseAuthTab("signup"), "signup");
  assert.equal(parseAuthTab("signin"), "signin");
  assert.equal(parseAuthTab("unexpected"), "signin");
});

test("auth returns are fixed to the selected product", () => {
  assert.equal(resolveAuthReturnPath("/io", "io"), "/io");
  assert.equal(resolveAuthReturnPath("/app", "community"), "/app");
  assert.equal(resolveAuthReturnPath("/app", "io"), "/io");
  assert.equal(resolveAuthReturnPath("/io", "community"), "/app");
  assert.equal(resolveAuthReturnPath("https://attacker.example", "io"), "/io");
  assert.equal(resolveAuthReturnPath("//attacker.example", "community"), "/app");
  assert.equal(resolveAuthReturnPath("javascript:alert(1)", "io"), "/io");
});

test("validated auth search is stable and safe", () => {
  assert.deepEqual(
    getAuthSearch({ tab: "signup", intent: "community", next: "https://attacker.example" }),
    { tab: "signup", intent: "community", next: "/app" },
  );
  assert.deepEqual(getAuthSearch({}), { tab: "signin", intent: "io", next: "/io" });
});
