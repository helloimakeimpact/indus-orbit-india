import { createFileRoute } from "@tanstack/react-router";
import { CommunityDiscovery } from "@/features/events/CommunityDiscovery";
import { canonical } from "@/lib/seo";
export const Route = createFileRoute("/communities/")({
  head: () => ({
    links: canonical("/communities"),
    meta: [
      { title: "Communities · Indus Orbit" },
      {
        name: "description",
        content:
          "Find your people in Indus Orbit's communities. Explore local chapters and their upcoming gatherings.",
      },
    ],
  }),
  component: () => <CommunityDiscovery />,
});
