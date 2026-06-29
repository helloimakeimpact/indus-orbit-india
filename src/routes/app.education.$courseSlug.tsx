import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/education/$courseSlug")({
  component: CourseLayout,
});

function CourseLayout() {
  return <Outlet />;
}
