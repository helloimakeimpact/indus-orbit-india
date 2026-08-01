import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Compatibility boundary for bookmarks from the former embedded admin area.
 * All administration now starts in the separate control-plane application.
 */
export const Route = createFileRoute("/app/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
