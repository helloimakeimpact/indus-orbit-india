import { createFileRoute } from "@tanstack/react-router";
import { IoOverview } from "@/features/io/IoOverview";

export const Route = createFileRoute("/app/io/")({
  component: IoOverview,
});
