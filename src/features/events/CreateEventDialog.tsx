import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  discoverCommunities,
  submitEventDraft,
  updateEventDraft,
  type CommunitySummary,
  type EventDraft,
  type EventEdit,
} from "./event-client";
import { getErrorMessage } from "@/lib/errors";
import { EventCover } from "./EventCover";
const initial: EventDraft = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  timezone: "Asia/Kolkata",
  locationType: "virtual",
  location: "",
  link: "",
  publicLocation: "",
  chapterId: "",
  coverTemplate: "dawn",
  visibility: "public",
  registrationScope: "public",
  capacity: "",
  requiresApproval: false,
};
export function CreateEventDialog({
  onClose,
  onSubmitted,
  edit,
  returnFocusTo,
}: {
  onClose: () => void;
  onSubmitted: () => void;
  edit?: EventEdit;
  returnFocusTo?: HTMLElement;
}) {
  const { user } = useAuth();
  const [opener] = useState(
    () => returnFocusTo ?? (typeof document === "undefined" ? null : document.activeElement),
  );
  const [draft, setDraft] = useState<EventDraft>(
    () =>
      edit?.draft ?? {
        ...initial,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
  );
  const [reason, setReason] = useState("");
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const submission = useRef({ fingerprint: "", id: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void discoverCommunities()
      .then((rows) => {
        if (active) setCommunities(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const change = (key: keyof EventDraft, value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
        }}
        className="event-create-dialog max-w-2xl max-h-[90svh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">
            {edit ? "Update your gathering." : "Bring people together."}
          </DialogTitle>
          <DialogDescription>
            {edit
              ? "Update the invitation or reschedule. Registration conditions stay fixed. Let your guests know about changes to the time or place."
              : "Free events, open to everyone by default. New hosts and chapter submissions go through review."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const fingerprint = JSON.stringify({ draft, reason });
              if (submission.current.fingerprint !== fingerprint)
                submission.current = { fingerprint, id: crypto.randomUUID() };
              if (edit) {
                await updateEventDraft(edit, draft, reason, user!.id, submission.current.id);
                if (!alive.current) return;
                toast.success("Your event is updated.");
                onSubmitted();
                onClose();
                return;
              }
              const result = await submitEventDraft(draft, user!.id, submission.current.id);
              if (!alive.current) return;
              toast.success(
                result.status === "approved"
                  ? "Your event is published."
                  : "Your event is submitted for review.",
              );
              onSubmitted();
              onClose();
            } catch (err) {
              if (alive.current) setError(getErrorMessage(err));
            } finally {
              if (alive.current) setBusy(false);
            }
          }}
          className="event-create-form"
        >
          <fieldset disabled={busy}>
            <legend className="sr-only">Event details</legend>
            <label>
              Event name
              <input
                required
                minLength={3}
                maxLength={160}
                value={draft.title}
                onChange={(e) => change("title", e.target.value)}
                placeholder="Give your gathering a name"
              />
            </label>
            <label>
              What will happen?
              <textarea
                required
                minLength={10}
                maxLength={10000}
                rows={4}
                value={draft.description}
                onChange={(e) => change("description", e.target.value)}
                placeholder="Who is it for? What should people expect? Keep private links and addresses in the access fields below."
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Starts
                <input
                  required
                  type="datetime-local"
                  value={draft.startTime}
                  onChange={(e) => change("startTime", e.target.value)}
                />
              </label>
              <label>
                Ends
                <input
                  required
                  type="datetime-local"
                  value={draft.endTime}
                  onChange={(e) => change("endTime", e.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter times in your device timezone:{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}. Set the invitation’s display
              timezone separately below.
            </p>
            <label>
              Invitation timezone
              <input
                required
                maxLength={100}
                value={draft.timezone}
                onChange={(e) => change("timezone", e.target.value)}
                placeholder="Asia/Kolkata"
              />
            </label>
            <label>
              Format
              <select
                value={draft.locationType}
                onChange={(e) => change("locationType", e.target.value)}
              >
                <option value="virtual">Online</option>
                <option value="irl">In person</option>
              </select>
            </label>
            <label>
              Public city or location label
              <input
                maxLength={160}
                value={draft.publicLocation}
                onChange={(e) => change("publicLocation", e.target.value)}
                placeholder={draft.locationType === "virtual" ? "Online" : "Bengaluru, India"}
              />
            </label>
            {draft.locationType === "irl" && (
              <label>
                Private venue and address
                <input
                  required
                  maxLength={1000}
                  value={draft.location}
                  onChange={(e) => change("location", e.target.value)}
                />
              </label>
            )}
            <label>
              {draft.locationType === "virtual"
                ? "Private online join link"
                : "Optional access link"}
              <input
                required={draft.locationType === "virtual"}
                type="url"
                pattern="https://.*"
                maxLength={2048}
                value={draft.link}
                onChange={(e) => change("link", e.target.value)}
                placeholder="https://…"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Access details are shared with confirmed guests. Public descriptions should contain
              only information you want everyone to see.
            </p>
            <label>
              Community
              <select
                disabled={Boolean(edit)}
                value={draft.chapterId}
                onChange={(e) => {
                  change("chapterId", e.target.value);
                  if (!e.target.value && draft.registrationScope === "chapter")
                    change("registrationScope", "community");
                }}
              >
                <option value="">Indus Orbit</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Discovery
                <select
                  disabled={Boolean(edit)}
                  value={draft.visibility}
                  onChange={(e) => {
                    change("visibility", e.target.value);
                    if (e.target.value === "members" && draft.registrationScope === "public")
                      change("registrationScope", "community");
                  }}
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted — people with the link</option>
                  <option value="members">Members only</option>
                </select>
              </label>
              <label>
                Who can register?
                <select
                  disabled={Boolean(edit)}
                  value={draft.registrationScope}
                  onChange={(e) => change("registrationScope", e.target.value)}
                >
                  <option value="public">Everyone — name and email</option>
                  <option value="community">Active Indus Orbit members</option>
                  {draft.chapterId && (
                    <option value="chapter">Active members of this chapter</option>
                  )}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Guest capacity
                <input
                  disabled={Boolean(edit)}
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  value={draft.capacity}
                  onChange={(e) => change("capacity", e.target.value)}
                  placeholder="No limit"
                />
              </label>
              <label className="event-checkbox">
                <input
                  disabled={Boolean(edit)}
                  type="checkbox"
                  checked={draft.requiresApproval}
                  onChange={(e) => change("requiresApproval", e.target.checked)}
                />
                Approve each registration
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Choose a cover</legend>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {(["dawn", "lotus", "banyan"] as const).map((t) => (
                  <label key={t} className="event-cover-choice">
                    <input
                      type="radio"
                      name="cover"
                      value={t}
                      checked={draft.coverTemplate === t}
                      onChange={() => change("coverTemplate", t)}
                    />
                    <EventCover template={t} />
                    <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {edit && (
              <>
                <label>
                  Change reason
                  <textarea
                    required
                    minLength={8}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain what changed for the hosting team"
                  />
                </label>
                {edit.history.length > 0 && (
                  <details>
                    <summary>Recent changes</summary>
                    <ul>
                      {edit.history.map((change) => (
                        <li key={change.revision}>
                          Revision {change.revision} ·{" "}
                          {new Date(change.created_at).toLocaleString()} ·{" "}
                          {change.changed_fields.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : edit ? "Save changes" : "Submit event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
