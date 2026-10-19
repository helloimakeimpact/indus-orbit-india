import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Download, Loader2, ShieldAlert, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelMyAccountPrivacyRequest,
  getMyAccountExportDownload,
  listMyAccountPrivacyRequests,
  requestMyAccountPrivacyAction,
  type AccountPrivacyRequest,
  type AccountPrivacyRequestType,
} from "./account-privacy-client";

const cancellableStates = new Set(["submitted", "reviewing", "blocked", "ready"]);

export function AccountPrivacySettings() {
  const { user } = useAuth();
  return user ? <AccountPrivacySettingsForAccount key={user.id} userId={user.id} /> : null;
}

function AccountPrivacySettingsForAccount({ userId }: { userId: string }) {
  const active = useRef(true);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [requests, setRequests] = useState<AccountPrivacyRequest[]>([]);
  const [memberNote, setMemberNote] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [observedAt, setObservedAt] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setObservedAt(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMyAccountPrivacyRequests();
      if (active.current) setRequests(rows);
    } catch (error) {
      if (active.current)
        toast.error(error instanceof Error ? error.message : "Privacy requests could not load.");
    } finally {
      if (active.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function submit(type: AccountPrivacyRequestType) {
    if (busy) return;
    if (type === "deletion" && deletionConfirmation.trim() !== "DELETE MY ACCOUNT") {
      if (active.current) toast.error("Type DELETE MY ACCOUNT exactly before requesting deletion.");
      return;
    }
    const accepted = window.confirm(
      type === "export"
        ? "Request a portable copy of your Indus Orbit account data? This creates a reviewed request; it does not publish your data."
        : "Request deletion of your Indus Orbit account? This does not erase data immediately. A reviewed, reversible request is created first.",
    );
    if (!accepted) return;
    setBusy(type);
    try {
      await requestMyAccountPrivacyAction({
        expectedUserId: userId,
        type,
        memberNote,
        confirmationText: type === "deletion" ? deletionConfirmation : undefined,
      });
      if (!active.current) return;
      setMemberNote("");
      setDeletionConfirmation("");
      await load();
      if (active.current)
        toast.success(type === "export" ? "Data export requested." : "Account deletion requested.");
    } catch (error) {
      if (active.current)
        toast.error(error instanceof Error ? error.message : "Privacy request failed.");
    } finally {
      if (active.current) setBusy(null);
    }
  }

  async function cancel(request: AccountPrivacyRequest) {
    if (busy || !window.confirm("Cancel this privacy request?")) return;
    setBusy(request.id);
    try {
      await cancelMyAccountPrivacyRequest(request);
      if (!active.current) return;
      await load();
      if (active.current) toast.success("Privacy request cancelled.");
    } catch (error) {
      if (active.current)
        toast.error(
          error instanceof Error ? error.message : "Privacy request could not be cancelled.",
        );
    } finally {
      if (active.current) setBusy(null);
    }
  }

  async function download(request: AccountPrivacyRequest) {
    if (busy) return;
    setBusy(request.id);
    try {
      const href = await getMyAccountExportDownload(userId, request.id);
      if (!active.current) return;
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = "indus-orbit-account-export.json";
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      if (active.current)
        toast.error(
          error instanceof Error ? error.message : "Your download could not be prepared.",
        );
    } finally {
      if (active.current) setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--saffron-deep)]" />
          <p>
            Your export includes account records and file details as JSON. File contents and some
            financial or safety records may need help from our privacy team. Downloads expire after
            seven days. Deletion is reviewed, with at least seven days from your request before
            processing can begin. You can cancel until processing starts. Required financial and
            safety records may be retained.
          </p>
        </div>
      </div>

      <Textarea
        aria-label="Optional note for the privacy team"
        value={memberNote}
        onChange={(event) => setMemberNote(event.target.value)}
        maxLength={500}
        placeholder="Optional note for the privacy team"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void submit("export")}
        >
          {busy === "export" ? <Loader2 className="animate-spin" /> : <Download />}
          Request my data export
        </Button>
        <div className="space-y-2 rounded-xl border border-destructive/20 p-3">
          <Input
            value={deletionConfirmation}
            onChange={(event) => setDeletionConfirmation(event.target.value)}
            placeholder="Type DELETE MY ACCOUNT"
            aria-label="Account deletion confirmation"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            disabled={busy !== null || deletionConfirmation.trim() !== "DELETE MY ACCOUNT"}
            onClick={() => void submit("deletion")}
          >
            {busy === "deletion" ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Request account deletion
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">Request history</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? <Loader2 className="animate-spin" /> : null}
            Refresh
          </Button>
        </div>
        {requests.length ? (
          requests.map((request) => (
            <article key={request.id} className="rounded-xl border border-border p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold capitalize">{request.type} request</p>
                  <p className="mt-1 text-muted-foreground">
                    Submitted {new Date(request.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {request.state}
                  </Badge>
                  {request.type === "export" &&
                  request.state === "ready" &&
                  request.artifactExpiresAt &&
                  Date.parse(request.artifactExpiresAt) > observedAt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => void download(request)}
                    >
                      {busy === request.id ? <Loader2 className="animate-spin" /> : <Download />}
                      Download
                    </Button>
                  ) : null}
                  {cancellableStates.has(request.state) ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Cancel ${request.type} request`}
                      disabled={busy !== null}
                      onClick={() => void cancel(request)}
                    >
                      {busy === request.id ? <Loader2 className="animate-spin" /> : <X />}
                    </Button>
                  ) : null}
                </div>
              </div>
              {request.type === "export" &&
              request.state === "ready" &&
              request.artifactExpiresAt ? (
                <p className="mt-2 text-muted-foreground">
                  Download available until {new Date(request.artifactExpiresAt).toLocaleString()}.
                </p>
              ) : null}
              {request.operatorNote ? (
                <p className="mt-2 rounded-lg bg-muted/45 p-2 text-muted-foreground">
                  Privacy team: {request.operatorNote}
                </p>
              ) : null}
            </article>
          ))
        ) : !loading ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            No export or deletion requests yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
