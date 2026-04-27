import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/chapters/propose")({
  component: ProposeChapterPage,
});

function ProposeChapterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [formData, setFormData] = useState({
    proposedName: "",
    city: "",
    country: "",
    targetAudience: "",
    expectedSize: "",
    rationale: "",
    background: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);

    try {
      const { error } = await supabase.from("chapter_proposals").insert({
        proposer_id: user.id,
        proposed_name: formData.proposedName,
        city: formData.city,
        country: formData.country,
        target_audience: formData.targetAudience,
        rationale: formData.rationale,
        proposer_background: formData.background,
        expected_size: parseInt(formData.expectedSize) || 0,
      });

      if (error) throw error;
      toast.success("Chapter proposal submitted successfully! Our team will review it shortly.");
      navigate({ to: "/app/chapters" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proposal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl py-8">
      <h1 className="font-display text-3xl font-medium mb-2">Propose a Chapter</h1>
      <p className="text-muted-foreground mb-8">
        Step up to lead an Indus Orbit chapter in your city or for your specific domain. Provide as much detail as possible so we can properly evaluate your proposal.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-3xl border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="proposedName">Chapter Name</Label>
            <Input id="proposedName" name="proposedName" required placeholder="e.g. San Francisco Founders" value={formData.proposedName} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input id="targetAudience" name="targetAudience" placeholder="e.g. AI Startups, Biotech Researchers" value={formData.targetAudience} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" required placeholder="San Francisco" value={formData.city} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required placeholder="USA" value={formData.country} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rationale">Why does this chapter need to exist?</Label>
          <Textarea 
            id="rationale" 
            name="rationale" 
            required 
            rows={4}
            placeholder="Explain the local ecosystem gap, the community demand, and the specific goals of this chapter."
            value={formData.rationale} 
            onChange={handleChange} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="background">Why are you the right person to lead this?</Label>
          <Textarea 
            id="background" 
            name="background" 
            required 
            rows={4}
            placeholder="Describe your background, community leadership experience, and network within this specific domain or region."
            value={formData.background} 
            onChange={handleChange} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedSize">Expected Member Size (Year 1)</Label>
          <Input id="expectedSize" name="expectedSize" type="number" min="5" required placeholder="e.g. 50" value={formData.expectedSize} onChange={handleChange} />
        </div>

        <div className="pt-4 flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => navigate({ to: "/app/chapters" })}>Cancel</Button>
          <Button type="submit" className="bg-[var(--indigo-night)] text-[var(--parchment)]" disabled={busy}>
            {busy ? "Submitting..." : "Submit Proposal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
