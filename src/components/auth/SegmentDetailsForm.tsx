import type { Segment, SegmentDetails } from "./segments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SegmentDetailsForm({
  segment,
  value,
  onChange,
}: {
  segment: Segment;
  value: SegmentDetails;
  onChange: (v: SegmentDetails) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  const get = (k: string) => (value[k] as string | undefined) ?? "";

  switch (segment) {
    case "youth":
      return (
        <>
          <Field label="Where are you in your journey?">
            <Select value={get("stage")} onValueChange={(v) => set("stage", v)}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school">In school</SelectItem>
                <SelectItem value="college">In college</SelectItem>
                <SelectItem value="early-career">Early career</SelectItem>
                <SelectItem value="self-taught">Self-taught</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="What do you want to build?">
            <Input value={get("craft")} onChange={(e) => set("craft", e.target.value)} placeholder="e.g. AI agents, design, research…" />
          </Field>
          <Field label="One thing you want to learn">
            <Textarea rows={3} value={get("learn")} onChange={(e) => set("learn", e.target.value)} />
          </Field>
        </>
      );
    case "founder":
      return (
        <>
          <Field label="Company name">
            <Input value={get("company")} onChange={(e) => set("company", e.target.value)} />
          </Field>
          <Field label="Stage">
            <Select value={get("stage")} onValueChange={(v) => set("stage", v)}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="mvp">MVP</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="scaling">Scaling</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sector">
            <Input value={get("sector")} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. fintech, agri, health" />
          </Field>
          <Field label="What are you looking for?">
            <Input value={get("looking_for")} onChange={(e) => set("looking_for", e.target.value)} placeholder="mentors, hires, capital, distribution" />
          </Field>
          <Field label="Fundraising Status">
            <Select value={get("fundraising")} onValueChange={(v) => set("fundraising", v)}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="actively_raising">Actively raising</SelectItem>
                <SelectItem value="planning_to_raise">Planning to raise soon</SelectItem>
                <SelectItem value="not_raising">Not raising</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
    case "expert":
      return (
        <>
          <Field label="Years of experience">
            <Input type="number" min={0} max={70} value={get("years")} onChange={(e) => set("years", e.target.value)} />
          </Field>
          <Field label="Industries">
            <Input value={get("industries")} onChange={(e) => set("industries", e.target.value)} placeholder="BFSI, manufacturing, retail, health, tech…" />
          </Field>
          <Field label="Time you can give per month (hours)">
            <Input type="number" min={0} max={200} value={get("hours_per_month")} onChange={(e) => set("hours_per_month", e.target.value)} />
          </Field>
        </>
      );
    case "investor":
      return (
        <>
          <Field label="Firm (or 'Solo')">
            <Input value={get("firm")} onChange={(e) => set("firm", e.target.value)} />
          </Field>
          <Field label="Typical ticket size">
            <Input value={get("ticket")} onChange={(e) => set("ticket", e.target.value)} placeholder="e.g. ₹25L–₹2Cr or $100k–$1M" />
          </Field>
          <Field label="Stages">
            <Input value={get("stages")} onChange={(e) => set("stages", e.target.value)} placeholder="pre-seed, seed, Series A…" />
          </Field>
          <Field label="Sectors of interest">
            <Input value={get("sectors")} onChange={(e) => set("sectors", e.target.value)} />
          </Field>
        </>
      );
    case "diaspora":
      return (
        <>
          <Field label="Country of residence">
            <Input value={get("residence")} onChange={(e) => set("residence", e.target.value)} placeholder="e.g. United States" />
          </Field>
          <Field label="How would you like to contribute?">
            <Input value={get("contribution")} onChange={(e) => set("contribution", e.target.value)} placeholder="mentorship, capital, hiring, advocacy, giving" />
          </Field>
          <Field label="Connection to India">
            <Textarea rows={3} value={get("connection")} onChange={(e) => set("connection", e.target.value)} placeholder="Hometown, family roots, why this matters to you" />
          </Field>
        </>
      );
    case "partner":
      return (
        <>
          <Field label="Organisation name">
            <Input value={get("org")} onChange={(e) => set("org", e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={get("org_type")} onValueChange={(v) => set("org_type", v)}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="accelerator">Accelerator</SelectItem>
                <SelectItem value="ngo">NGO</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="What does partnership look like for you?">
            <Textarea rows={3} value={get("partnership")} onChange={(e) => set("partnership", e.target.value)} />
          </Field>
        </>
      );
    case "researcher":
      return (
        <>
          <Field label="Affiliation">
            <Input value={get("affiliation")} onChange={(e) => set("affiliation", e.target.value)} placeholder="Lab, university, institute" />
          </Field>
          <Field label="Field">
            <Input value={get("field")} onChange={(e) => set("field", e.target.value)} placeholder="e.g. NLP, policy, education research" />
          </Field>
          <Field label="Current focus">
            <Textarea rows={3} value={get("focus")} onChange={(e) => set("focus", e.target.value)} />
          </Field>
          <Field label="Open to collaboration?">
            <Select value={get("collab")} onValueChange={(v) => set("collab", v)}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="maybe">Maybe</SelectItem>
                <SelectItem value="no">Not right now</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}