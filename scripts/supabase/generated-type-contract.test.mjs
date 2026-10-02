import assert from "node:assert/strict";
import test from "node:test";
import {
  publicTypeContract,
  typeContractDifferences,
  replayBoundaryDifferences,
} from "./generated-type-contract.mjs";

function schema(tables = "", functions = "", enums = "") {
  return `export type Database = { public: {
    Tables: { ${tables} }; Views: { [_ in never]: never };
    Functions: { ${functions} }; Enums: { ${enums} }; CompositeTypes: { [_ in never]: never };
  } }`;
}

test("type comparison ignores comments, layout and formatter separators", () => {
  const source = schema('sample: { Relationships: [{ columns: ["id"]; isOneToOne: false }] }');
  const formatted = source
    .replaceAll(";", "\n")
    .replace("isOneToOne: false }]", "isOneToOne: false },]");
  assert.deepEqual(publicTypeContract(source), publicTypeContract(`// generated\n${formatted}`));
});

test("column additions, removals, optionality and nullability are detected", () => {
  const before = publicTypeContract(
    schema("sample: { Row: { id: string; title: string | null } }"),
  );
  const after = publicTypeContract(
    schema("sample: { Row: { id?: string; added: number; title: string } }"),
  );
  const differences = typeContractDifferences(before, after);
  assert.deepEqual(
    differences.map((difference) => difference.path),
    [
      "public.Tables.sample.Row.added",
      "public.Tables.sample.Row.id",
      "public.Tables.sample.Row.id?",
      "public.Tables.sample.Row.title",
    ],
  );
  assert.equal(differences[0].current, null);
  assert.equal(differences[1].generated, null);
});

test("RPC arguments, returns, enum values and relationship targets are compared", () => {
  const before = publicTypeContract(
    schema(
      'sample: { Relationships: [{ referencedRelation: "profiles" }] }',
      "read: { Args: { limit?: number }; Returns: string[] }",
      'status: "ready"',
    ),
  );
  const after = publicTypeContract(
    schema(
      'sample: { Relationships: [{ referencedRelation: "users" }] }',
      "read: { Args: { limit?: string }; Returns: number[] }",
      'status: "ready" | "paused"',
    ),
  );
  assert.equal(typeContractDifferences(before, after).length, 4);
});

test("generator metadata outside the public schema is excluded", () => {
  const source = schema();
  const extra = source.replace(
    "Database = {",
    'Database = { __InternalSupabase: { PostgrestVersion: "14" };',
  );
  assert.deepEqual(publicTypeContract(source), publicTypeContract(extra));
});

test("malformed, empty and incomplete inputs fail closed", () => {
  for (const source of [
    "",
    "export type Database = { public:",
    "export type Database = { public: {} }",
  ]) {
    assert.throws(() => publicTypeContract(source));
  }
});

test("reviewed replay boundary requires the entire exact delta", () => {
  const expected = [
    { path: "public.Tables.sample.Row.id", current: "string", generated: "number" },
  ];
  assert.deepEqual(replayBoundaryDifferences(expected, expected), []);
  assert.equal(
    replayBoundaryDifferences([], expected)[0].reason,
    "reviewed delta missing; release boundary changed",
  );
  assert.equal(
    replayBoundaryDifferences([{ ...expected[0], generated: "boolean" }], expected)[0].reason,
    "reviewed delta changed",
  );
  assert.equal(
    replayBoundaryDifferences(
      [...expected, { path: "public.Enums.extra", current: null, generated: '"ready"' }],
      expected,
    )[0].reason,
    "unreviewed drift",
  );
});

test("malformed and duplicate replay allowances fail closed", () => {
  const entry = { path: "public.Enums.status", current: null, generated: '"ready"' };
  for (const expected of [
    null,
    [entry, entry],
    [{ ...entry, path: "public.*", generated: null }],
    [{ ...entry, current: undefined }],
    [{ ...entry, current: 5 }],
  ])
    assert.throws(() => replayBoundaryDifferences([], expected));
});
