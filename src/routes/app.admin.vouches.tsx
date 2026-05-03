import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";

export const Route = createFileRoute("/app/admin/vouches")({
  head: () => ({ meta: [{ title: "Vouch governance — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: AdminVouchesPage,
});

type Settings = { default_quota: number; code_ttl_days: number; window_days: number };
type RoleOverride = { id: string; role: "admin" | "member"; segment: Segment | null; quota: number };
type UserOverride = { user_id: string; quota: number; reason: string | null };
type Code = { id: string; code: string; issuer_id: string; status: string; expires_at: string; created_at: string };
type Event = { id: string; issuer_id: string; recipient_id: string | null; channel: string; created_at: string };

function AdminVouchesPage() {
  const { isAdmin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({ default_quota: 5, code_ttl_days: 14, window_days: 28 });
  const [roleOverrides, setRoleOverrides] = useState<RoleOverride[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);

  // Form state — role overrides
  const [newRoleSegment, setNewRoleSegment] = useState<Segment | "any">("any");
  const [newRoleQuota, setNewRoleQuota] = useState<number>(5);

  // Form state — user overrides
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<Array<{ user_id: string; display_name: string | null }>>([]);
  const [pickedUser, setPickedUser] = useState<{ user_id: string; name: string } | null>(null);
  const [newUserQuota, setNewUserQuota] = useState<number>(10);
  const [newUserReason, setNewUserReason] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/app" }); }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const [s, ro, uo, c, e] = await Promise.all([
      supabase.from("vouch_settings").select("*").eq("id", "global").maybeSingle(),
      supabase.from("vouch_role_overrides").select("*"),
      supabase.from("vouch_user_overrides").select("*"),
      supabase.from("vouch_codes").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("vouch_events").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (s.data) setSettings(s.data as never);
    setRoleOverrides((ro.data as never) ?? []);
    setUserOverrides((uo.data as never) ?? []);
    setCodes((c.data as never) ?? []);
    setEvents((e.data as never) ?? []);

    const ids = new Set<string>();
    ((c.data as Code[] | null) ?? []).forEach((x) => ids.add(x.issuer_id));
    ((e.data as Event[] | null) ?? []).forEach((x) => { ids.add(x.issuer_id); if (x.recipient_id) ids.add(x.recipient_id); });
    ((uo.data as UserOverride[] | null) ?? []).forEach((x) => ids.add(x.user_id));
    if (ids.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", Array.from(ids));
      const map: Record<string, string> = {};
      for (const p of (profs as { user_id: string; display_name: string | null }[] | null) ?? []) {
        map[p.user_id] = p.display_name ?? p.user_id.slice(0, 8);
      }
      setNames(map);
    }
    setBusy(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  // user search for overrides
  useEffect(() => {
    let active = true;
    if (userSearch.trim().length < 2) { setUserResults([]); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .ilike("display_name", `%${userSearch.trim()}%`)
        .limit(8);
      if (active) setUserResults((data as never) ?? []);
    })();
    return () => { active = false; };
  }, [userSearch]);

  async function saveSettings() {
    if (!user) return;
    const { error } = await supabase
      .from("vouch_settings")
      .update({
        default_quota: settings.default_quota,
        code_ttl_days: settings.code_ttl_days,
        window_days: settings.window_days,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "global");
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "vouch.settings_updated",
      target_type: "vouch_settings",
      metadata: settings as never,
    });
    toast.success("Settings saved");
  }

  async function addRoleOverride() {
    if (!user) return;
    const seg = newRoleSegment === "any" ? null : newRoleSegment;
    const segKey = seg ?? "__any__";
    const payload = { role: "member", segment: seg, quota: newRoleQuota, updated_by: user.id, segment_key: segKey };
    const { error } = await (supabase.from("vouch_role_overrides") as any)
      .upsert(payload, { onConflict: "role,segment_key" });
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "vouch.role_override_set",
      target_type: "vouch_role_override",
      metadata: { segment: seg, quota: newRoleQuota } as never,
    });
    toast.success("Role override saved");
    load();
  }

  async function deleteRoleOverride(id: string) {
    if (!user) return;
    const { error } = await supabase.from("vouch_role_overrides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({ actor_id: user.id, action: "vouch.role_override_deleted", target_type: "vouch_role_override", target_id: id });
    load();
  }

  async function addUserOverride() {
    if (!user || !pickedUser) return;
    const { error } = await supabase
      .from("vouch_user_overrides")
      .upsert({
        user_id: pickedUser.user_id,
        quota: newUserQuota,
        reason: newUserReason.trim() || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "vouch.user_override_set",
      target_type: "profile",
      target_id: pickedUser.user_id,
      reason: newUserReason || null,
      metadata: { quota: newUserQuota } as never,
    });
    toast.success("User override saved");
    setPickedUser(null); setUserSearch(""); setNewUserReason("");
    load();
  }

  async function deleteUserOverride(uid: string) {
    if (!user) return;
    const { error } = await supabase.from("vouch_user_overrides").delete().eq("user_id", uid);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({ actor_id: user.id, action: "vouch.user_override_deleted", target_type: "profile", target_id: uid });
    load();
  }

  async function revokeCode(id: string) {
    if (!user) return;
    const { error } = await supabase.from("vouch_codes").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({ actor_id: user.id, action: "vouch.code_revoked", target_type: "vouch_code", target_id: id });
    load();
  }

  const segmentOverrides = useMemo(
    () => roleOverrides.filter((r) => r.role === "member"),
    [roleOverrides],
  );

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="font-display text-3xl font-medium">Vouch governance</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Control how many vouches members can issue per rolling window.
      </p>

      {/* Global */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Global defaults</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Default quota">
            <Input type="number" min={0} value={settings.default_quota}
              onChange={(e) => setSettings({ ...settings, default_quota: Number(e.target.value) })} />
          </Field>
          <Field label="Code TTL (days)">
            <Input type="number" min={1} value={settings.code_ttl_days}
              onChange={(e) => setSettings({ ...settings, code_ttl_days: Number(e.target.value) })} />
          </Field>
          <Field label="Window (days)">
            <Input type="number" min={1} value={settings.window_days}
              onChange={(e) => setSettings({ ...settings, window_days: Number(e.target.value) })} />
          </Field>
        </div>
        <Button className="mt-4" onClick={saveSettings}>Save defaults</Button>
      </section>

      {/* Role / segment overrides */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Per-segment overrides</h2>
        <p className="mt-1 text-xs text-muted-foreground">Sets quota for all members in a segment. Overrides global default.</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Segment">
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={newRoleSegment}
              onChange={(e) => setNewRoleSegment(e.target.value as never)}
            >
              <option value="any">All segments</option>
              {SEGMENT_LIST.map((s) => (<option key={s} value={s}>{SEGMENT_META[s].label}</option>))}
            </select>
          </Field>
          <Field label="Quota">
            <Input type="number" className="w-24" min={0} value={newRoleQuota}
              onChange={(e) => setNewRoleQuota(Number(e.target.value))} />
          </Field>
          <Button onClick={addRoleOverride}>Save override</Button>
        </div>

        <div className="mt-4 space-y-2">
          {segmentOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : segmentOverrides.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{r.segment ? SEGMENT_META[r.segment].label : "All segments"}</Badge>
                <span className="text-sm">{r.quota} per window</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteRoleOverride(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* User overrides */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Per-user overrides</h2>
        <p className="mt-1 text-xs text-muted-foreground">Highest priority — beats segment and global.</p>

        <div className="mt-4">
          <Input placeholder="Search member by name…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          {userSearch.trim().length >= 2 && !pickedUser && (
            <div className="mt-2 space-y-1">
              {userResults.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => { setPickedUser({ user_id: u.user_id, name: u.display_name ?? "Member" }); setUserResults([]); }}
                  className="w-full rounded-lg border border-border p-2 text-left text-sm hover:bg-foreground/5"
                >
                  {u.display_name ?? "Member"}
                </button>
              ))}
              {userResults.length === 0 && <p className="text-xs text-muted-foreground">No matches.</p>}
            </div>
          )}
          {pickedUser && (
            <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
              <p className="text-sm">For <strong>{pickedUser.name}</strong></p>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Quota">
                  <Input type="number" className="w-24" min={0} value={newUserQuota}
                    onChange={(e) => setNewUserQuota(Number(e.target.value))} />
                </Field>
                <Field label="Reason (optional)">
                  <Input value={newUserReason} onChange={(e) => setNewUserReason(e.target.value)} />
                </Field>
                <Button onClick={addUserOverride}>Save</Button>
                <Button variant="ghost" onClick={() => setPickedUser(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {userOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : userOverrides.map((o) => (
            <div key={o.user_id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="font-medium">{names[o.user_id] ?? o.user_id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {o.quota} / window {o.reason ? `· ${o.reason}` : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteUserOverride(o.user_id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Active codes */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Recent codes</h2>
        {busy ? <p className="mt-2 text-sm text-muted-foreground">Loading…</p> : codes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center gap-3">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{c.code}</code>
                  <span className="text-muted-foreground">by {names[c.issuer_id] ?? c.issuer_id.slice(0, 8)}</span>
                  <Badge variant="secondary">{c.status}</Badge>
                  <span className="text-xs text-muted-foreground">expires {new Date(c.expires_at).toLocaleDateString()}</span>
                </div>
                {c.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => revokeCode(c.id)}>Revoke</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Events feed */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Recent vouch events</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl border border-border p-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{e.channel}</span>
                <span className="ml-3">{names[e.issuer_id] ?? "Member"}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span>{e.recipient_id ? (names[e.recipient_id] ?? e.recipient_id.slice(0, 8)) : "(unredeemed)"}</span>
                <span className="ml-3 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
