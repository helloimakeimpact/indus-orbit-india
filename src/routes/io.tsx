import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProductAuthGate } from "@/components/auth/ProductAuthGate";
import { IoProductShell } from "@/features/io/IoProductShell";

export const Route = createFileRoute("/io")({
  head: () => ({
    meta: [
      { title: "I/O Port workspace — Indus Orbit" },
      {
        name: "description",
        content: "Your Indus Orbit I/O workspace for model access, agent work and shared capacity.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IoProductLayout,
});

function IoProductLayout() {
  return (
    <ProductAuthGate intent="io" returnTo="/io" loadingLabel="Opening I/O Port…">
      <IoProductShell>
        <Outlet />
      </IoProductShell>
    </ProductAuthGate>
  );
}
