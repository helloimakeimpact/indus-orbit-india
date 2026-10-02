import ts from "typescript";

/** Compare schema types, ignoring generator metadata, formatting and helper aliases. */
export function publicTypeContract(source) {
  const file = ts.createSourceFile("types.ts", source, ts.ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length)
    throw new Error("Generated database types contain syntax errors");
  const database = file.statements.find(
    (node) => ts.isTypeAliasDeclaration(node) && node.name.text === "Database",
  );
  const publicMember =
    database && ts.isTypeLiteralNode(database.type)
      ? database.type.members.find((member) => member.name?.getText(file) === "public")
      : null;
  if (!publicMember?.type || !ts.isTypeLiteralNode(publicMember.type)) {
    throw new Error("Database.public type contract is missing");
  }
  const sections = publicMember.type.members.map((member) => member.name?.getText(file));
  for (const section of ["Tables", "Views", "Functions", "Enums", "CompositeTypes"]) {
    if (!sections.includes(section)) throw new Error(`Database.public.${section} is missing`);
  }
  const contract = {};
  const tokens = (node) => {
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      true,
      ts.LanguageVariant.Standard,
      node.getText(file),
    );
    const parts = [];
    let token;
    while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
      // Type-member terminators and tuple trailing commas vary between generators/formatters.
      if (token !== ts.SyntaxKind.SemicolonToken && token !== ts.SyntaxKind.CommaToken) {
        parts.push(scanner.getTokenText());
      }
    }
    return parts.join(" ");
  };
  const visit = (node, path) => {
    if (
      ts.isTypeLiteralNode(node) &&
      node.members.length &&
      node.members.every(ts.isPropertySignature)
    ) {
      for (const member of node.members) {
        if (!member.type || !member.name) throw new Error(`Invalid type property at ${path}`);
        const name = ts.isStringLiteral(member.name) ? member.name.text : member.name.getText(file);
        visit(member.type, `${path}.${name}${member.questionToken ? "?" : ""}`);
      }
    } else {
      contract[path] = tokens(node);
    }
  };
  visit(publicMember.type, "public");
  return contract;
}

export function typeContractDifferences(current, generated) {
  return [...new Set([...Object.keys(current), ...Object.keys(generated)])]
    .sort()
    .filter((path) => current[path] !== generated[path])
    .map((path) => ({ path, current: current[path] ?? null, generated: generated[path] ?? null }));
}

/** Match the complete reviewed replay delta; wildcards and missing deltas are forbidden. */
export function replayBoundaryDifferences(actual, expected) {
  if (!Array.isArray(expected)) throw new Error("Replay boundary differences must be an array");
  const reviewed = new Map();
  for (const entry of expected) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      !entry.path.startsWith("public.") ||
      entry.path.includes("*") ||
      ![entry.current, entry.generated].every(
        (value) => value === null || typeof value === "string",
      ) ||
      entry.current === entry.generated ||
      reviewed.has(entry.path)
    ) {
      throw new Error("Invalid or duplicate replay boundary contract");
    }
    reviewed.set(entry.path, entry);
  }
  const observed = new Map(actual.map((entry) => [entry.path, entry]));
  return [...new Set([...reviewed.keys(), ...observed.keys()])].sort().flatMap((path) => {
    const wanted = reviewed.get(path);
    const found = observed.get(path);
    if (!wanted) return [{ path, reason: "unreviewed drift" }];
    if (!found) return [{ path, reason: "reviewed delta missing; release boundary changed" }];
    if (wanted.current !== found.current || wanted.generated !== found.generated)
      return [{ path, reason: "reviewed delta changed" }];
    return [];
  });
}
