import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIST_DIRECTORY = new URL("../dist/", import.meta.url);
const LIMITS = new Map([
  [".js", 500 * 1024],
  [".css", 250 * 1024],
]);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat();
}

const distPath = fileURLToPath(DIST_DIRECTORY);
const measured = [];
for (const path of await listFiles(distPath)) {
  const extension = [...LIMITS.keys()].find((candidate) => path.endsWith(candidate));
  if (!extension) continue;
  measured.push({
    path: relative(distPath, path),
    bytes: (await stat(path)).size,
    limit: LIMITS.get(extension),
  });
}

if (!measured.length) throw new Error("No JavaScript or CSS production assets were found.");

const failures = measured.filter((asset) => asset.bytes > asset.limit);
const largest = [...measured].sort((left, right) => right.bytes - left.bytes).slice(0, 8);
console.log(
  largest
    .map(
      (asset) =>
        `${asset.path}: ${(asset.bytes / 1024).toFixed(2)} KiB / ${(asset.limit / 1024).toFixed(0)} KiB`,
    )
    .join("\n"),
);

if (failures.length) {
  throw new Error(
    `Production bundle budget exceeded by: ${failures.map((asset) => asset.path).join(", ")}`,
  );
}
