import { createFileRoute } from "@tanstack/react-router";
import { CommunityDiscovery } from "@/features/events/CommunityDiscovery";
export const Route = createFileRoute("/communities/$id")({
  head: () => ({ meta: [{ title: "Community · Indus Orbit" }] }),
  component: CommunityPage,
});

function CommunityPage() {
  const { id } = Route.useParams();
  return <CommunityDiscovery id={id} />;
}
