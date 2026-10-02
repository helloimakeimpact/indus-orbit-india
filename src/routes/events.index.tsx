import { createFileRoute } from "@tanstack/react-router";
import { EventDiscovery } from "@/features/events/EventDiscovery";
import { canonical } from "@/lib/seo";
export const Route = createFileRoute("/events/")({
  head: () => ({
    links: canonical("/events"),
    meta: [
      { title: "Events · Indus Orbit" },
      {
        name: "description",
        content:
          "Find gatherings across Indus Orbit communities. Meet people, share ideas, and build together. Free registration for Community members.",
      },
    ],
  }),
  component: () => <EventDiscovery />,
});
