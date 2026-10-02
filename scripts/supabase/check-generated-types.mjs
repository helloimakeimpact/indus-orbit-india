import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  publicTypeContract,
  typeContractDifferences,
  replayBoundaryDifferences,
} from "./generated-type-contract.mjs";

const args = process.argv.slice(2);
const replay = args.length === 3 && args[2] === "--replay-boundary";
if (args[0] !== "--generated" || !args[1] || (args.length !== 2 && !replay)) {
  console.error(
    "Usage: npm run check:supabase-types -- --generated /absolute/path/generated.types.ts [--replay-boundary]",
  );
  process.exitCode = 2;
} else {
  try {
    const currentPath = fileURLToPath(
      new URL("../../src/integrations/supabase/types.ts", import.meta.url),
    );
    const [current, generated] = await Promise.all([
      readFile(currentPath, "utf8"),
      readFile(args[1], "utf8"),
    ]);
    const differences = typeContractDifferences(
      publicTypeContract(current),
      publicTypeContract(generated),
    );
    let failures = differences.map(({ path }) => ({ path, reason: "public type drift" }));
    if (replay) {
      const boundary = JSON.parse(
        await readFile(new URL("./replay-type-boundary.json", import.meta.url), "utf8"),
      );
      if (boundary.version !== 1 || !/^[0-9]{14}_[a-z0-9_]+\.sql$/.test(boundary.migration))
        throw new Error("Invalid replay migration boundary");
      const migration = await readFile(
        new URL(`../../supabase/migrations/${boundary.migration}`, import.meta.url),
      );
      if (createHash("sha256").update(migration).digest("hex") !== boundary.sha256)
        throw new Error("Reviewed replay migration hash changed");
      failures = replayBoundaryDifferences(differences, boundary.differences);
    }
    if (failures.length) {
      console.error(
        `Public schema type drift: ${failures.length} unreviewed contract differences.`,
      );
      for (const { path, reason } of failures) console.error(`  ${path}: ${reason}`);
      console.error("Review the schema/migration boundary before replacing browser declarations.");
      process.exitCode = 1;
    } else {
      console.log(
        replay
          ? `Fresh replay matches the browser release contract plus ${differences.length} exact, hash-bound held Spaces differences.`
          : "Public schema types match (generator helpers and formatting excluded).",
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Type-contract check failed");
    process.exitCode = 2;
  }
}
