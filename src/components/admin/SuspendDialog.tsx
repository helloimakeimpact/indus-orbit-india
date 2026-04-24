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

export function SuspendDialog({
  open,
  onOpenChange,
  userId,
  userName,
  actorId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  userName: string;
  actorId: string | null;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!actorId) return;
    if (reason.trim().length < 5) return toast.error("Reason required (5+ chars)");
    setBusy(true);
    const { error } = await supabase.from("member_suspensions").insert({
      user_id: userId,
      actor_id: actorId,
      reason: reason.trim(),
    });
    if (!error) {
      // Hide from directory as part of suspension
      await supabase.from("profiles").update({ is_public: false }).eq("user_id", userId);
      await supabase.from("audit_log").insert({
        actor_id: actorId,
        action: "member.suspend",
        target_type: "profile",
        target_id: userId,
        reason: reason.trim(),
      });
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${userName} suspended`);
    setReason("");
    onOpenChange(false);
    onDone?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend {userName}?</DialogTitle>
          <DialogDescription>
            They will be hidden from the directory and blocked from sending requests, posting, or endorsing.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason (visible to admins only)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Working…" : "Suspend"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}