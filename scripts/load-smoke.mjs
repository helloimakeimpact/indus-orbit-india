import { performance } from "node:perf_hooks";

const baseUrl = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:4173";
const path = process.env.LOAD_PATH ?? "/io-port";
const requests = positiveInteger(process.env.LOAD_REQUESTS, 100);
const concurrency = positiveInteger(process.env.LOAD_CONCURRENCY, 10);
const p95LimitMs = positiveInteger(process.env.LOAD_P95_LIMIT_MS, 1_500);

const timings = [];
let next = 0;
let failures = 0;

await Promise.all(
  Array.from({ length: Math.min(concurrency, requests) }, async () => {
    while (next < requests) {
      next += 1;
      const started = performance.now();
      try {
        const response = await fetch(new URL(path, baseUrl), {
          headers: { "user-agent": "indus-orbit-load-smoke/1.0" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) failures += 1;
        await response.arrayBuffer();
      } catch {
        failures += 1;
      } finally {
        timings.push(performance.now() - started);
      }
    }
  }),
);

timings.sort((a, b) => a - b);
const p95 = timings[Math.max(0, Math.ceil(timings.length * 0.95) - 1)] ?? Infinity;
const summary = { baseUrl, path, requests, concurrency, failures, p95Ms: Math.round(p95) };
console.log(JSON.stringify(summary));

if (failures > 0 || p95 > p95LimitMs) process.exitCode = 1;

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
