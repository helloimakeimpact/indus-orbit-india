import type { BrowserContext, Page } from "@playwright/test";
import { loadEnv } from "vite";

const environment = loadEnv("development", process.cwd(), "VITE_");
const apiUrl = process.env.VITE_SUPABASE_URL ?? environment.VITE_SUPABASE_URL;
const apiHost = new URL(apiUrl).host;
const storageKey = `sb-${new URL(apiUrl).hostname.split(".")[0]}-auth-token`;
const userId = "00000000-0000-4000-8000-000000000001";

function syntheticSession(accountId = userId) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: accountId, exp: expiresAt, role: "authenticated", aud: "authenticated" })}.synthetic-not-a-valid-signature`,
    refresh_token: "synthetic-not-a-valid-refresh-token",
    expires_at: expiresAt,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: accountId,
      aud: "authenticated",
      role: "authenticated",
      email: "member@example.invalid",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}

/** Browser-only UI evidence. All Supabase HTTP/WebSocket traffic is intercepted. */
export async function prepareMemberBrowser(context: BrowserContext, baseURL: string | undefined) {
  if (!baseURL || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
    throw new Error("The controlled member browser fixture requires a local application URL.");
  }
  const state = {
    communityAccess: true,
    accessUnavailable: false,
    accessChecks: 0,
    identityChecks: 0,
    unexpectedMutations: [] as string[],
    isSuperAdmin: false,
    holdNextIdentityCheck: null as Promise<void> | null,
    heldIdentityChecks: 0,
  };
  await context.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    { key: storageKey, session: syntheticSession() },
  );
  // Font availability is unrelated to continuity; keep this fixture network-isolated.
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.fulfill({ status: 204 }),
  );
  await context.route(
    (url) => url.host === apiHost,
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const rpc = path.startsWith("/rest/v1/rpc/") ? path.split("/").at(-1) : null;
      const reads = new Set([
        "get_my_product_access",
        "get_my_admin_access",
        "my_lead_summary",
        "get_my_location_preferences",
        "list_my_account_privacy_requests",
      ]);
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !reads.has(rpc ?? "")) {
        state.unexpectedMutations.push(`${request.method()} ${path}`);
        await route.fulfill({ status: 403, json: { message: "Synthetic fixture rejects writes" } });
        return;
      }
      if (rpc === "get_my_product_access") {
        state.accessChecks += 1;
        if (state.accessUnavailable) {
          await route.fulfill({ status: 503, json: { message: "Synthetic access outage" } });
          return;
        }
        await route.fulfill({
          json: {
            io_access: true,
            community_access: state.communityAccess,
            community_status: state.communityAccess ? "completed" : "paused",
            community_current_step: "complete",
            community_version: 1,
            measurement_consent: false,
          },
        });
      } else if (rpc === "get_my_admin_access") {
        state.identityChecks += 1;
        const projection = {
          isSuperAdmin: state.isSuperAdmin,
          isAdminTeam: state.isSuperAdmin,
          roles: [],
          capabilities: state.isSuperAdmin ? ["*"] : [],
        };
        const hold = state.holdNextIdentityCheck;
        state.holdNextIdentityCheck = null;
        if (hold) {
          state.heldIdentityChecks += 1;
          await hold;
        }
        await route.fulfill({ json: projection });
      } else if (rpc === "my_lead_summary") {
        await route.fulfill({ json: { chapter_lead_count: 0, mission_lead_count: 0 } });
      } else if (rpc === "get_my_location_preferences") {
        await route.fulfill({
          json: {
            countryCode: null,
            legacyCountryLabel: null,
            regionLabel: null,
            cityLabel: null,
            timezoneName: null,
            legacyTimezoneLabel: null,
            useForScheduling: false,
            useForRecommendations: false,
            source: null,
            consentVersion: null,
            consentedAt: null,
            shareAudience: null,
            sharePrecision: null,
          },
        });
      } else if (path === "/rest/v1/profiles") {
        await route.fulfill({
          json: [
            {
              user_id:
                new URL(request.url()).searchParams.get("user_id")?.replace(/^eq\./, "") ?? userId,
              orbit_segment: "youth",
              display_name: "Test member",
            },
          ],
        });
      } else if (path === "/auth/v1/user") {
        await route.fulfill({ json: syntheticSession().user });
      } else {
        await route.fulfill({ json: [], headers: { "content-range": "*/0" } });
      }
    },
  );
  await context.routeWebSocket(
    (url) => url.host === apiHost,
    (socket) => {
      socket.onMessage((message) => {
        const [joinRef, ref, topic, event, payload] = JSON.parse(String(message));
        if (event === "phx_join" || event === "heartbeat" || event === "phx_leave") {
          socket.send(
            JSON.stringify([
              joinRef,
              ref,
              topic,
              "phx_reply",
              {
                status: "ok",
                response: {
                  postgres_changes: (payload?.config?.postgres_changes ?? []).map(
                    (filter: Record<string, unknown>, id: number) => ({ ...filter, id }),
                  ),
                },
              },
            ]),
          );
        }
      });
    },
  );
  return state;
}

export async function broadcastMemberAuth(
  page: Page,
  event: "SIGNED_IN" | "TOKEN_REFRESHED" | "SIGNED_OUT",
  accountId = userId,
) {
  await page.evaluate(
    ({ key, event, session }) => {
      if (event === "SIGNED_OUT") window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(session));
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event, session });
      channel.close();
    },
    {
      key: storageKey,
      event,
      session: event === "SIGNED_OUT" ? null : syntheticSession(accountId),
    },
  );
}
