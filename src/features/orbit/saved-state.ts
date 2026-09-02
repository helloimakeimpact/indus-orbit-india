export type OrbitSavedItemType = "space" | "room" | "thread" | "message" | "chapter" | "mission";

export type OrbitSavedItem = {
  objectType: OrbitSavedItemType;
  objectId: string;
  title: string;
  note: string | null;
  spaceId: string | null;
  createdAt: string;
};

const itemTypes = new Set<OrbitSavedItemType>([
  "space",
  "room",
  "thread",
  "message",
  "chapter",
  "mission",
]);

export function parseOrbitSavedItems(value: unknown): OrbitSavedItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const row = candidate as Record<string, unknown>;
    if (
      typeof row.objectType !== "string" ||
      !itemTypes.has(row.objectType as OrbitSavedItemType) ||
      typeof row.objectId !== "string" ||
      typeof row.title !== "string" ||
      typeof row.createdAt !== "string"
    ) {
      return [];
    }
    return [
      {
        objectType: row.objectType as OrbitSavedItemType,
        objectId: row.objectId,
        title: row.title,
        note: typeof row.note === "string" ? row.note : null,
        spaceId: typeof row.spaceId === "string" ? row.spaceId : null,
        createdAt: row.createdAt,
      },
    ];
  });
}
