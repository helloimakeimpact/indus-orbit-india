import { createFileRoute } from "@tanstack/react-router";
import { EventInvitationPage } from "@/features/events/EventInvitationPage";
export const Route = createFileRoute("/app/events/$id")({
  head: () => ({
    meta: [{ title: "Event invitation · Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: MemberEventPage,
});

function MemberEventPage() {
  const { id } = Route.useParams();
  return <EventInvitationPage id={id} member />;
}
