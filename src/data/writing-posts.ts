import blogAnnouncements from "@/assets/blog-announcements.jpg";
import blogVision from "@/assets/blog-vision.jpg";
import blogResearch from "@/assets/blog-research.jpg";
import blogPlaybooks from "@/assets/blog-playbooks.jpg";
import blogBharat from "@/assets/blog-bharat.jpg";
import blogCommunity from "@/assets/blog-community.jpg";

export type Tag =
  | "All"
  | "Announcements"
  | "Research"
  | "Vision"
  | "Playbooks"
  | "Bharat"
  | "Community";

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  tag: Exclude<Tag, "All">;
  date: string;
  readMin: number;
  gradient: string;
  body: string[];
};

export const tagImage: Record<Exclude<Tag, "All">, string> = {
  Announcements: blogAnnouncements,
  Vision: blogVision,
  Research: blogResearch,
  Playbooks: blogPlaybooks,
  Bharat: blogBharat,
  Community: blogCommunity,
};

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

type RawPost = Omit<Post, "slug" | "body"> & { body?: string[] };

const rawPosts: RawPost[] = [
  {
    title: "Announcing Indus Orbit",
    excerpt:
      "Why we are building a general intelligence company designed around India's people, industries and ambitions — and what an 'orbit' really means.",
    author: "The Orbit",
    tag: "Announcements",
    date: "Jul 22, 2026",
    readMin: 6,
    gradient: "from-[var(--saffron)]/80 via-[var(--gold)]/70 to-[var(--indigo-night)]",
  },
  {
    title: "An orbit, not a pyramid",
    excerpt:
      "Most ecosystems are drawn as pyramids with a few founders at the top. India looks more like an orbit — and that changes what we build.",
    author: "Founders",
    tag: "Vision",
    date: "Jul 14, 2026",
    readMin: 8,
    gradient: "from-[var(--indigo-night)] via-[var(--indigo-night)]/80 to-[var(--saffron)]/70",
  },
  {
    title: "What Indian SMBs actually want from agents",
    excerpt:
      "Field notes from twelve cities and forty businesses on where AI is genuinely useful — and where it is quietly in the way.",
    author: "Orbit Research",
    tag: "Research",
    date: "Jul 03, 2026",
    readMin: 12,
    gradient: "from-[var(--monsoon)]/80 via-[var(--indigo-night)]/90 to-[var(--indigo-night)]",
  },
  {
    title: "The diaspora as an engine, not an audience",
    excerpt:
      "How NRIs can move from cheering India on to actively compounding it — and the rails we are building to make that easier.",
    author: "Orbit Bridge",
    tag: "Vision",
    date: "Jun 21, 2026",
    readMin: 7,
    gradient: "from-[var(--gold)]/80 via-[var(--saffron)]/70 to-[var(--indigo-night)]/90",
  },
  {
    title: "Vernacular first, English second",
    excerpt:
      "Why the next billion users will not switch to English to use AI — and what that demands from the runtime, not just the interface.",
    author: "Orbit Build",
    tag: "Research",
    date: "Jun 09, 2026",
    readMin: 9,
    gradient: "from-[var(--indigo-night)]/90 via-[var(--monsoon)]/60 to-[var(--gold)]/50",
  },
  {
    title: "Build the loop, not the agent",
    excerpt:
      "A short playbook on why the durable unit of AI product work in India is the feedback loop — and how to design one that compounds.",
    author: "Orbit Build",
    tag: "Playbooks",
    date: "May 30, 2026",
    readMin: 10,
    gradient: "from-[var(--saffron)]/60 via-[var(--gold)]/50 to-[var(--indigo-night)]",
  },
  {
    title: "Kirana-scale AI: five patterns that actually stick",
    excerpt:
      "From WhatsApp catalogues to voice-first inventory, the shapes of AI that Indian shopkeepers keep using after the novelty wears off.",
    author: "Orbit Research",
    tag: "Bharat",
    date: "May 18, 2026",
    readMin: 11,
    gradient: "from-[var(--monsoon)]/70 via-[var(--saffron)]/60 to-[var(--indigo-night)]/80",
  },
  {
    title: "The Tier-2 founder is the story of this decade",
    excerpt:
      "Why the most interesting Indian companies of the next ten years will be built in Indore, Jaipur, Coimbatore and Bhubaneswar — and how we're wiring them in.",
    author: "Founders",
    tag: "Bharat",
    date: "May 05, 2026",
    readMin: 7,
    gradient: "from-[var(--gold)]/70 via-[var(--saffron)]/60 to-[var(--indigo-night)]/85",
  },
  {
    title: "The Model Observatory: why we built it",
    excerpt:
      "Charts of intelligence, speed, latency and price for every frontier model — indexed in USD and INR, made for builders who actually pay the bill.",
    author: "The Orbit",
    tag: "Announcements",
    date: "Apr 24, 2026",
    readMin: 5,
    gradient: "from-[var(--indigo-night)]/95 via-[var(--monsoon)]/60 to-[var(--saffron)]/50",
  },
  {
    title: "Trust travels through relationships",
    excerpt:
      "Why an Indian intelligence stack has to route through people, not just APIs — and what that means for how we design the Members directory.",
    author: "The Orbit",
    tag: "Vision",
    date: "Apr 11, 2026",
    readMin: 8,
    gradient: "from-[var(--saffron)]/70 via-[var(--indigo-night)]/80 to-[var(--indigo-night)]",
  },
  {
    title: "A playbook for shipping in a language you don't speak",
    excerpt:
      "Notes from six builders shipping vernacular products they can't natively read — the rituals, guardrails and native partners that make it work.",
    author: "Orbit Build",
    tag: "Playbooks",
    date: "Mar 28, 2026",
    readMin: 9,
    gradient: "from-[var(--indigo-night)]/85 via-[var(--gold)]/50 to-[var(--saffron)]/60",
  },
  {
    title: "We are hiring across product, research and partnerships",
    excerpt:
      "A small, deliberate team in Delhi and Bengaluru. If you care about India and intelligence, we'd love to hear from you.",
    author: "The Orbit",
    tag: "Announcements",
    date: "Mar 15, 2026",
    readMin: 3,
    gradient: "from-[var(--saffron)]/60 via-[var(--indigo-night)]/80 to-[var(--indigo-night)]",
  },
  {
    title: "The context window is the new office",
    excerpt:
      "Adapted for India: as models grow long-memory, the real design surface is not the prompt — it is what your team, tools and customers persistently share with the model.",
    author: "Orbit Build",
    tag: "Vision",
    date: "Mar 02, 2026",
    readMin: 8,
    gradient: "from-[var(--indigo-night)]/90 via-[var(--saffron)]/60 to-[var(--gold)]/50",
  },
  {
    title: "Evals are the new PRDs",
    excerpt:
      "A working note on why Indian AI teams should ship an evaluation set before a spec — and how to build one out of real WhatsApp conversations, call recordings and CRM notes.",
    author: "Orbit Research",
    tag: "Playbooks",
    date: "Feb 18, 2026",
    readMin: 9,
    gradient: "from-[var(--monsoon)]/70 via-[var(--indigo-night)]/85 to-[var(--saffron)]/60",
  },
  {
    title: "Small models, big Bharat",
    excerpt:
      "The frontier is loud, but a lot of India's compounding will happen on 3B–8B open models fine-tuned on local voice, forms and receipts. What that unlocks — and what it costs.",
    author: "Orbit Research",
    tag: "Research",
    date: "Feb 04, 2026",
    readMin: 11,
    gradient: "from-[var(--gold)]/70 via-[var(--saffron)]/60 to-[var(--indigo-night)]/85",
  },
  {
    title: "From prompt engineering to system engineering",
    excerpt:
      "Prompts are a UI. Systems are the product. A field guide for Indian teams graduating past clever prompts into retrieval, tools, memory and guardrails.",
    author: "Orbit Build",
    tag: "Playbooks",
    date: "Jan 22, 2026",
    readMin: 10,
    gradient: "from-[var(--indigo-night)]/90 via-[var(--monsoon)]/60 to-[var(--saffron)]/60",
  },
  {
    title: "The agent is not the moat — the workflow is",
    excerpt:
      "A response to the agent-everything hype, from the vantage point of Indian services businesses where the real leverage is codifying the workflow, not personifying it.",
    author: "Founders",
    tag: "Vision",
    date: "Jan 10, 2026",
    readMin: 7,
    gradient: "from-[var(--saffron)]/70 via-[var(--indigo-night)]/85 to-[var(--indigo-night)]",
  },
  {
    title: "How Indian teams should think about GPU spend in 2026",
    excerpt:
      "A pragmatic breakdown of when to rent, when to reserve, when to burst on Lovable AI Gateway, and when to walk away from a workload. In USD and INR.",
    author: "Orbit Build",
    tag: "Research",
    date: "Dec 20, 2025",
    readMin: 12,
    gradient: "from-[var(--indigo-night)]/95 via-[var(--gold)]/50 to-[var(--saffron)]/60",
  },
  {
    title: "The founder archetypes of Indus Orbit",
    excerpt:
      "Six recurring shapes of India-first founders we keep meeting — the diaspora returner, the tier-2 operator, the ex-services builder — and what each one needs from the orbit.",
    author: "The Orbit",
    tag: "Community",
    date: "Dec 06, 2025",
    readMin: 8,
    gradient: "from-[var(--saffron)]/60 via-[var(--indigo-night)]/85 to-[var(--monsoon)]/70",
  },
];

function defaultBody(p: RawPost): string[] {
  return [
    p.excerpt,
    `This is a working note from ${p.author} at Indus Orbit — part of an ongoing series on ${p.tag.toLowerCase()} for a general intelligence company built for India.`,
    `We publish these as they harden into something usable, not when they're finished. If a section here changes your mind (or you think we've got it wrong), write back — most of what ends up in the Orbit dispatch started as a reply from a reader.`,
    `Over the next few weeks we'll expand this piece with field notes, benchmarks and interviews from the members closest to the problem. Subscribe to the Orbit dispatch to get the next revision in your inbox.`,
  ];
}

export const posts: Post[] = rawPosts.map((p) => ({
  ...p,
  slug: slugify(p.title),
  body: p.body ?? defaultBody(p),
}));

export function findPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
