import { createFileRoute } from "@tanstack/react-router";
import { EventDiscovery } from "@/features/events/EventDiscovery";
export const Route = createFileRoute("/app/events/")({
  head: () => ({
    meta: [{ title: "Events · Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: () => <EventDiscovery member />,
});
