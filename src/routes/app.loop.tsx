import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/app/loop")({ component: () => <Outlet /> });