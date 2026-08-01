import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy bookmark: scoped access is managed in the separate control plane. */
export const Route = createFileRoute("/app/admin/roles")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/team" });
  },
});
