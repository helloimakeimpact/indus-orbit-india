import { createFileRoute, Outlet } from "@tanstack/react-router";
import { IoWorkspaceShell } from "@/features/io/IoWorkspaceShell";

export const Route = createFileRoute("/app/io")({
  head: () => ({
    meta: [
      { title: "I/O Port — Indus Orbit" },
      {
        name: "description",
        content: "An India-rooted workspace for model access, agent work and shared capacity.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IoLayout,
});

function IoLayout() {
  return (
    <IoWorkspaceShell>
      <Outlet />
    </IoWorkspaceShell>
  );
}
