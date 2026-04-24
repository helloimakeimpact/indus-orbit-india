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

type Target = "profile" | "ask_offer" | "connection_request" | "endorsement";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  reporterId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetType: Target;
  targetId: string;
  reporterId: string | null;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reporterId) return toast.error("Sign in to report");
    const trimmed = reason.trim();
    if (trimmed.length < 5) return toast.error("Add a short reason (5+ chars)");
    if (trimmed.length > 500) return toast.error("Keep it under 500 characters");
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason: trimmed,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted. Thank you.");
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType.replace("_", " ")}</DialogTitle>
          <DialogDescription>
            Tell us briefly what's wrong. Admins review every report.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="What's the issue?"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}