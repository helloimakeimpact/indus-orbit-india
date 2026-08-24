import { GatewayError } from "./errors.ts";

type JsonSchema = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function matchesType(value: unknown, type: string) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isRecord(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function validateNode(
  value: unknown,
  schema: JsonSchema,
  path: string,
  depth: number,
): string | null {
  if (depth > 24) return `${path} exceeds the supported schema depth`;
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    return `${path} is not one of the allowed values`;
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const declaredTypes = types.filter((type): type is string => typeof type === "string");
  if (declaredTypes.length && !declaredTypes.some((type) => matchesType(value, type))) {
    return `${path} has the wrong type`;
  }
  if (Array.isArray(value) && isRecord(schema.items)) {
    for (let index = 0; index < value.length; index += 1) {
      const issue = validateNode(value[index], schema.items, `${path}[${index}]`, depth + 1);
      if (issue) return issue;
    }
  }
  if (isRecord(value)) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === "string")
      : [];
    for (const key of required) {
      if (!(key in value)) return `${path}.${key} is required`;
    }
    if (schema.additionalProperties === false) {
      const unknown = Object.keys(value).find((key) => !(key in properties));
      if (unknown) return `${path}.${unknown} is not allowed`;
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (!(key in value) || !isRecord(childSchema)) continue;
      const issue = validateNode(value[key], childSchema, `${path}.${key}`, depth + 1);
      if (issue) return issue;
    }
  }
  return null;
}

export function assertStructuredOutput(content: string, schema: JsonSchema) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new GatewayError(
      "upstream_failure",
      502,
      "The provider returned invalid structured JSON.",
    );
  }
  const issue = validateNode(parsed, schema, "$", 0);
  if (issue) {
    throw new GatewayError(
      "upstream_failure",
      502,
      `The provider response did not match the requested JSON schema: ${issue}.`,
    );
  }
}
