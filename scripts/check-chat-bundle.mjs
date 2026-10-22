import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const baselinePath = resolve(root, "scripts/chat-bundle-baseline.json");
const mode = process.argv[2];
const buildDirectory = resolve(process.argv[3] ?? resolve(root, "dist"));
const manifestPath = resolve(buildDirectory, ".vite/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function route(path) {
  const key = Object.keys(manifest).find((key) => key === `${path}?tsr-split=component`);
  if (!key) throw new Error(`Missing production route component: ${path}`);
  return key;
}

async function measure(entries) {
  const visited = new Set();
  const files = new Set();
  function walk(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Missing production manifest dependency: ${key}`);
    if (chunk.file.endsWith(".js")) files.add(chunk.file);
    for (const dependency of chunk.imports ?? []) walk(dependency);
  }
  for (const entry of entries) walk(entry);
  const assets = await Promise.all(
    [...files].sort().map(async (file) => {
      const bytes = await readFile(resolve(buildDirectory, file));
      return { file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
    }),
  );
  return {
    entries,
    javascriptAssets: assets.length,
    javascriptBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    javascriptGzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    assets,
  };
}

const initial = ["index.html", route("src/routes/app.tsx")];
const lazyChat = [
  "src/features/conversations/ConversationList.tsx",
  "src/features/conversations/ConversationSurface.tsx",
].filter((key) => manifest[key]);
const report = {
  schemaVersion: 1,
  measurement:
    "Sum of each separately gzip-compressed JavaScript asset in the unique static dependency graph; explicit quick-chat lazy roots included. No unrelated dynamic routes or CSS included.",
  modes: {
    messages: await measure([...initial, route("src/routes/app.messages.tsx")]),
    quickChat: await measure([...initial, ...lazyChat]),
  },
};

if (mode === "--record-baseline") {
  if (buildDirectory === resolve(root, "dist"))
    throw new Error("Record a baseline from an explicitly separate reference checkout/build.");
  const commit = process.argv[4];
  if (!/^[a-f0-9]{40}$/.test(commit ?? ""))
    throw new Error("A verified full reference commit is required.");
  await writeFile(
    baselinePath,
    JSON.stringify(
      { ...report, referenceCommit: commit, maximumIncrementalGzipBytes: 15 * 1024 },
      null,
      2,
    ) + "\n",
  );
  console.log(`Recorded reference chat dependency graphs at ${commit}.`);
} else {
  if (mode && mode !== "--check")
    throw new Error(
      "Usage: check-chat-bundle.mjs [--check [dist]] | --record-baseline <reference-dist> <commit>",
    );
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const failures = [];
  for (const [name, current] of Object.entries(report.modes)) {
    const delta = current.javascriptGzipBytes - baseline.modes[name].javascriptGzipBytes;
    console.log(
      `${name}: ${(current.javascriptGzipBytes / 1024).toFixed(2)} KiB gzip total; ${(delta / 1024).toFixed(2)} KiB increment / ${(baseline.maximumIncrementalGzipBytes / 1024).toFixed(0)} KiB budget (${current.javascriptAssets} assets).`,
    );
    if (delta > baseline.maximumIncrementalGzipBytes) failures.push(name);
    current.incrementalGzipBytes = delta;
  }
  await writeFile(
    resolve(dirname(manifestPath), "chat-bundle-report.json"),
    JSON.stringify(
      {
        ...report,
        referenceCommit: baseline.referenceCommit,
        maximumIncrementalGzipBytes: baseline.maximumIncrementalGzipBytes,
      },
      null,
      2,
    ) + "\n",
  );
  if (failures.length)
    throw new Error(`Chat dependency graph budget exceeded: ${failures.join(", ")}`);
}
