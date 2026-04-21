import type { LucideIcon } from "lucide-react";
import { GraduationCap, Rocket, Award, Coins, Globe2, Building2, FlaskConical } from "lucide-react";

export type Segment =
  | "youth"
  | "founder"
  | "expert"
  | "investor"
  | "diaspora"
  | "partner"
  | "researcher";

export const SEGMENT_LIST: Segment[] = [
  "youth",
  "founder",
  "expert",
  "investor",
  "diaspora",
  "partner",
  "researcher",
];

export const SEGMENT_META: Record<
  Segment,
  { label: string; blurb: string; icon: LucideIcon }
> = {
  youth: {
    label: "Youth",
    blurb: "Student or first-generation builder finding your craft.",
    icon: GraduationCap,
  },
  founder: {
    label: "Founder",
    blurb: "Building a company — at any stage, in any sector.",
    icon: Rocket,
  },
  expert: {
    label: "Expert",
    blurb: "Senior operator giving back time, judgement and access.",
    icon: Award,
  },
  investor: {
    label: "Investor",
    blurb: "Angel, fund or family office backing Indian builders.",
    icon: Coins,
  },
  diaspora: {
    label: "Diaspora",
    blurb: "NRI bridging India and the world — capital, talent or care.",
    icon: Globe2,
  },
  partner: {
    label: "Partner / Org",
    blurb: "Company, university, accelerator, NGO or government body.",
    icon: Building2,
  },
  researcher: {
    label: "Researcher",
    blurb: "Academic, policy or AI research — exploring what comes next.",
    icon: FlaskConical,
  },
};

export type SegmentDetails = Record<string, unknown>;