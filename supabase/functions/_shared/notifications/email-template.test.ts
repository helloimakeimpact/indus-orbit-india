import assert from "node:assert/strict";
import test from "node:test";
import { renderEmailTemplate } from "./email-template.ts";

test("mentor acceptance renders a fixed Indus Orbit template", () => {
  const rendered = renderEmailTemplate("mentor_session_accepted", {
    mentor_name: "Ananya Rao",
    scheduled_for: "2026-08-10T12:30:00.000Z",
    meeting_url: "https://meet.example.test/session",
  });

  assert.equal(rendered.subject, "Mentorship accepted by Ananya Rao");
  assert.match(rendered.text, /Ananya Rao has accepted/);
  assert.match(rendered.html, /https:\/\/meet\.example\.test\/session/);
  assert.match(rendered.html, /https:\/\/indusorbit\.com\/app\/mentor/);
});

test("template escapes profile text and rejects unsafe meeting links", () => {
  const rendered = renderEmailTemplate("mentor_session_accepted", {
    mentor_name: '<img src=x onerror="alert(1)">',
    scheduled_for: "not-a-date",
    meeting_url: "javascript:alert(1)",
  });

  assert.doesNotMatch(rendered.html, /<img/);
  assert.doesNotMatch(rendered.html, /javascript:/);
  assert.doesNotMatch(rendered.html, /Scheduled for:/);
  assert.match(rendered.html, /&lt;img/);
});

test("unknown templates fail closed", () => {
  assert.throws(() => renderEmailTemplate("caller_supplied", {}), /Unsupported email template/);
});
