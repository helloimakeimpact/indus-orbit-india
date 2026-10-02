import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const container = process.argv[2];
if (!/^supabase_db_indus-community-launch-\d{8}$/.test(container ?? ""))
  throw new Error("Use only the dedicated Indus Orbit verification container");
function sql(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ]);
    let out = "",
      err = "";
    child.stdout.on("data", (b) => (out += b));
    child.stderr.on("data", (b) => (err += b));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(err))));
    child.stdin.end(statement);
  });
}
const host = "98500000-0000-4000-8000-000000000000";
const event = "98600000-0000-4000-8000-000000000001";
const members = Array.from(
  { length: 8 },
  (_, i) => `98500000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const guestEvent = "98600000-0000-4000-8000-000000000002";
try {
  await sql(
    `insert into auth.users(id,email) values ('${host}','concurrency-host@example.test'),${members.map((id, i) => `('${id}','concurrency-${i}@example.test')`).join(",")};insert into private.community_onboarding_state(user_id,status,current_step,started_at,completed_at) select id,'completed','completed',now(),now() from auth.users where id::text like '98500000%';insert into public.events(id,organizer_id,title,description,start_time,end_time,location_type,status,capacity,registration_scope) values ('${event}','${host}','Concurrency contract','Eight simultaneous callers, one place',now()+interval '1 hour',now()+interval '3 hours','virtual','approved',1,'community');`,
  );
  const states = await Promise.all(
    members.map((id) =>
      sql(
        `begin;set local role authenticated;set local "request.jwt.claim.sub"='${id}';select public.register_for_event('${event}','${id}')->>'status';commit;`,
      ),
    ),
  );
  assert.equal(states.filter((s) => s.split("\n").includes("confirmed")).length, 1);
  assert.equal(states.filter((s) => s.split("\n").includes("waitlisted")).length, 7);
  assert.equal(
    await sql(
      `select count(*) from private.event_registrations where event_id='${event}' and status='confirmed';`,
    ),
    "1",
  );
  console.log(
    "PASS: 8 simultaneous member registrations allocate exactly 1 confirmed place and 7 waitlist positions.",
  );
  await sql(
    `update auth.users set email_confirmed_at = now() where id::text like '98500000%';insert into public.events(id,organizer_id,title,description,start_time,end_time,location_type,status,capacity,registration_scope) values ('${guestEvent}','${host}','Guest concurrency','Four accounts and four email guests share one place',now()+interval '1 hour',now()+interval '3 hours','virtual','approved',1,'public');`,
  );
  const hashes = Array.from({ length: 4 }, (_, i) => String(i + 1).repeat(64));
  for (const [i, hash] of hashes.entries())
    await sql(
      `select public.request_event_guest_link('${guestEvent}','concurrency-guest-${i}@example.test','Synthetic guest ${i}','${hash}');`,
    );
  const mixed = await Promise.all([
    ...members
      .slice(0, 4)
      .map((id) =>
        sql(
          `begin;set local role authenticated;set local "request.jwt.claim.sub"='${id}';select public.register_for_event('${guestEvent}','${id}')->>'status';commit;`,
        ),
      ),
    ...hashes.map((hash) =>
      sql(
        `begin;set local role service_role;select public.event_guest_receipt('${guestEvent}','${hash}','confirm')->>'status';commit;`,
      ),
    ),
  ]);
  assert.equal(mixed.filter((s) => s.split("\n").includes("confirmed")).length, 1);
  assert.equal(mixed.filter((s) => s.split("\n").includes("waitlisted")).length, 7);
  assert.equal(
    await sql(
      `select count(*) from private.event_registrations where event_id='${guestEvent}' and status='confirmed';`,
    ),
    "1",
  );
  console.log(
    "PASS: 4 accounts and 4 verified email guests racing allocate exactly 1 confirmed place and 7 waitlist positions.",
  );
} finally {
  await sql(
    `delete from public.events where id in ('${event}','${guestEvent}');delete from private.community_onboarding_state where user_id::text like '98500000%';delete from auth.users where id::text like '98500000%';`,
  );
}
