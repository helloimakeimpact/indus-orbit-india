import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { redeemCode, requestVouch } from "@/server/vouch.functions";

export function VerificationCard({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function onRedeem() {
    if (code.trim().length < 6) return toast.error("Enter your code");
    setBusy(true);
    try {
      await redeemCode(code.trim().toUpperCase());
      toast.success("You're verified!");
      setCode("");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  async function onRequest() {
    if (message.trim().length < 10) return toast.error("Add a short message (10+ chars)");
    setBusy(true);
    try {
      await requestVouch(message.trim());
      toast.success("Request sent to admins");
      setMessage("");
      setRequestOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mt-6 rounded-3xl border border-[var(--saffron)]/40 bg-[var(--saffron)]/5 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-[var(--saffron)]" />
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">Get verified</p>
            <p className="mt-1 text-sm text-foreground/70">
              Two paths: redeem a vouch code from a verified member, or ask an admin to vouch for you.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[var(--indigo-night)]" />
                  <p className="text-sm font-medium">Have a code?</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="ABCD234EFG"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={20}
                  />
                  <Button onClick={onRedeem} disabled={busy}>Redeem</Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-[var(--indigo-night)]" />
                  <p className="text-sm font-medium">Ask for a vouch</p>
                </div>
                <p className="text-xs text-muted-foreground">Admins will see your request.</p>
                <Button variant="outline" onClick={() => setRequestOpen(true)}>Request</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a vouch</DialogTitle>
            <DialogDescription>Tell admins who you are and why you'd like to be verified.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={5}
            placeholder="A short message (10–500 chars)…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={onRequest} disabled={busy}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
