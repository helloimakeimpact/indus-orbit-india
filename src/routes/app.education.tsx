import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/education")({
  head: () => ({
    meta: [
      { title: "Academy — Indus Orbit" },
      { name: "description", content: "Courses, lessons, and resources for the Indus Orbit community." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});