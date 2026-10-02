import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
export const Route = createFileRoute("/communities")({
  component: () => (
    <SiteShell>
      <div className="event-public-layout">
        <Outlet />
      </div>
    </SiteShell>
  ),
});
