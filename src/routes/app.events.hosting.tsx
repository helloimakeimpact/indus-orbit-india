import { createFileRoute } from "@tanstack/react-router";
import { EventHostWorkspace } from "@/features/events/EventHostWorkspace";
export const Route = createFileRoute("/app/events/hosting")({
  head: () => ({
    meta: [{ title: "Hosting · Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: EventHostWorkspace,
});
