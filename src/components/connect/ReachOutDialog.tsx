import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "intro", label: "Introduce" },
  { value: "advice", label: "Advice" },
  { value: "collab", label: "Collab" },
  { value: "capital", label: "Capital" },
  { value: "other", label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

export function ReachOutDialog({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  senderId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipientId: string;
  recipientName: string;
  senderId: string | null;
}) {
  const [reason, setReason] = useState<Reason>("intro");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!senderId) return toast.error("Sign in first");
    const trimmed = note.trim();
    if (trimmed.length < 10) return toast.error("Note must be at least 10 chars");
    if (trimmed.length > 280) return toast.error("Note must be under 280 chars");
    setBusy(true);
    const { error } = await supabase.from("connection_requests").insert({
      sender_id: senderId,
      recipient_id: recipientId,
      reason,
      note: trimmed,
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") return toast.error("You already have a pending request to this member");
      return toast.error(error.message);
    }
    toast.success("Request sent");
    setNote("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reach out to {recipientName}</DialogTitle>
          <DialogDescription>
            Pick a reason and write a short note (max 280 chars). They'll see it and choose to accept or decline.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs uppercase tracking-wider transition",
                reason === r.value
                  ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                  : "border-border hover:bg-foreground/5",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Hi — I'd love to connect because…"
          value={note}
          maxLength={280}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground text-right">{note.length}/280</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}