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
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";
import { cn } from "@/lib/utils";

export function EndorseDialog({
  open,
  onOpenChange,
  endorseeId,
  endorseeName,
  endorserId,
  defaultSegment,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  endorseeId: string;
  endorseeName: string;
  endorserId: string | null;
  defaultSegment?: Segment | null;
}) {
  const [segment, setSegment] = useState<Segment>(defaultSegment ?? "founder");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!endorserId) return toast.error("Sign in first");
    setBusy(true);
    const { error } = await supabase.from("endorsements").insert({
      endorser_id: endorserId,
      endorsee_id: endorseeId,
      segment,
      note: note.trim() ? note.trim() : null,
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") return toast.error("You've already endorsed this member for that segment");
      return toast.error(error.message);
    }
    toast.success("Endorsement added");
    setNote("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Endorse {endorseeName}</DialogTitle>
          <DialogDescription>
            Vouch for them in a specific segment. Only verified members can endorse.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {SEGMENT_LIST.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs uppercase tracking-wider transition",
                segment === s
                  ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                  : "border-border hover:bg-foreground/5",
              )}
            >
              {SEGMENT_META[s].label}
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Optional: a sentence on why (max 140 chars)"
          value={note}
          maxLength={140}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Endorse"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}