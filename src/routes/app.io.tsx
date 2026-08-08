import { createFileRoute, Navigate } from "@tanstack/react-router";

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
  component: LegacyIoRedirect,
});

function LegacyIoRedirect() {
  return <Navigate to="/io" replace />;
}
