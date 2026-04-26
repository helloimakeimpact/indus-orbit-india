import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestMentorSession } from "@/server/mentor.functions";

export function BookMentorDialog({
  open,
  onOpenChange,
  expertId,
  expertName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  expertId: string;
  expertName: string;
}) {
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState<"30" | "60">("30");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (message.trim().length < 20) return toast.error("Please provide a bit more context (20+ chars).");
    
    setBusy(true);
    try {
      await requestMentorSession({ data: { expertId, message: message.trim(), durationMins: parseInt(duration) } });
      toast.success("Mentorship session requested!");
      setMessage("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a session with {expertName}</DialogTitle>
          <DialogDescription>
            Experts pledge time each month. Be clear about what you're building and how they can help.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration</label>
            <Select value={duration} onValueChange={(v: "30"|"60") => setDuration(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">What do you want to discuss?</label>
            <Textarea
              rows={4}
              placeholder="Hi, I'm building..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Requesting…" : "Request Session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
