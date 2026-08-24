import { createFileRoute } from "@tanstack/react-router";
import { FileWarning, LoaderCircle, RefreshCw, Scale, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  listMyModerationNotices,
  submitMyModerationAppeal,
  type MyModerationNotice,
} from "@/features/trust/moderation-client";

export const Route = createFileRoute("/app/moderation")({
  head: () => ({
    meta: [
      { title: "Safety notices and appeals — Indus Orbit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModerationNoticesPage,
});

function ModerationNoticesPage() {
  const [notices, setNotices] = useState<MyModerationNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyNoticeId, setBusyNoticeId] = useState<string | null>(null);
  const [appealReasons, setAppealReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotices(await listMyModerationNotices());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load safety notices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function submitAppeal(notice: MyModerationNotice) {
    const reason = appealReasons[notice.id]?.trim() ?? "";
    if (reason.length < 20) {
      toast.error("Explain the appeal in at least 20 characters.");
      return;
    }
    setBusyNoticeId(notice.id);
    try {
      await submitMyModerationAppeal(notice.id, reason);
      toast.success("Your appeal was submitted for an independent review.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the appeal.");
    } finally {
      setBusyNoticeId(null);
    }
  }

  return (
    <div className="app-ui space-y-4">
      <section className="app-glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="app-workspace-kicker">Trust and safety</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--indigo-night)]">
              Notices and appeals
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Review actions affecting your account or contributions. Eligible decisions can be
              appealed once and are assigned to a reviewer other than the original moderator.
            </p>
          </div>
          <Button variant="outline" disabled={loading} onClick={() => void load()}>
            {loading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            Refresh
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/45" />
      ) : notices.length === 0 ? (
        <section className="app-glass rounded-3xl p-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-emerald-700" />
          <h2 className="mt-3 font-semibold text-foreground">No moderation notices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            There are no safety actions recorded for your account.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const appealOpen = !notice.reversedAt && Date.parse(notice.appealDeadline) > Date.now();
            return (
              <article key={notice.id} className="app-glass rounded-3xl p-5">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                      <FileWarning className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-semibold capitalize text-foreground">
                        {notice.actionType.replaceAll("_", " ")}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {notice.targetType} · {new Date(notice.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {notice.reversedAt ? "reversed" : (notice.appeal?.status ?? "recorded")}
                  </Badge>
                </header>
                <p className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-4 text-sm leading-6 text-foreground">
                  {notice.reason}
                </p>
                {notice.appeal ? (
                  <div className="mt-4 rounded-2xl bg-muted/45 p-4 text-sm">
                    <div className="flex items-center gap-2 font-semibold capitalize">
                      <Scale className="h-4 w-4" /> Appeal {notice.appeal.status}
                    </div>
                    {notice.appeal.decisionNote && (
                      <p className="mt-2 leading-6 text-muted-foreground">
                        {notice.appeal.decisionNote}
                      </p>
                    )}
                  </div>
                ) : appealOpen ? (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={appealReasons[notice.id] ?? ""}
                      onChange={(event) =>
                        setAppealReasons((current) => ({
                          ...current,
                          [notice.id]: event.target.value,
                        }))
                      }
                      minLength={20}
                      maxLength={4000}
                      placeholder="Explain what should be reconsidered and add relevant context."
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Appeal by {new Date(notice.appealDeadline).toLocaleString()}
                      </p>
                      <Button
                        disabled={busyNoticeId === notice.id}
                        onClick={() => void submitAppeal(notice)}
                      >
                        {busyNoticeId === notice.id && <LoaderCircle className="animate-spin" />}
                        Submit appeal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">The appeal window is closed.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
