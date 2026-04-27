import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { SEGMENT_META, SEGMENT_LIST, type Segment } from "@/components/auth/segments";
import { 
  Users, Rocket, Zap, Globe2, ShieldCheck, MapPin, 
  Target, BookOpen, Cpu, Sparkles, Crown, Award 
} from "lucide-react";

export const Route = createFileRoute("/what-is-indus-orbit")({
  head: () => ({ meta: [{ title: "What is Indus Orbit? — Guide & Wiki" }] }),
  component: WhatIsIndusOrbitPage,
});

// Art Assets (User will provide these in the public folder or adjust paths)
const ART = {
  hero: "/wiki-hero.jpg", // A wide, epic pixel-art scene of an enlightened futuristic Indian city at sunset
  wiki_banner: "/wiki-banner.jpg", // A panoramic artwork showing a glowing network of nodes connecting across India
  chapter: "/wiki-chapter.jpg", // Pixel art icon of a local community gathering around a glowing map
  mission: "/wiki-mission.jpg", // Pixel art icon of a rocket launching or a collaborative blueprint
  story: "/wiki-story.jpg", // Pixel art icon of a glowing book or digital terminal
};

type ViewMode = "guided" | "wiki";

function WhatIsIndusOrbitPage() {
  const [mode, setMode] = useState<ViewMode>("guided");

  return (
    <SiteShell navTone="dark">
      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden bg-[var(--indigo-night)] pt-32 pb-24 text-[var(--parchment)]">
        <div className="absolute inset-0 opacity-40">
          {/* User will provide wiki-hero.jpg */}
          <img src={ART.hero} alt="Indus Orbit Vision" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--indigo-night)] to-transparent" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <Badge>Platform Documentation</Badge>
          <h1 className="mt-6 font-display text-4xl font-light leading-tight md:text-6xl text-glow">
            What is Indus Orbit?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--parchment)]/80">
            A general intelligence company for India. We build the digital and physical gravity that pulls India’s next generation of builders into the same orbit.
          </p>

          {/* TOGGLE */}
          <div className="mx-auto mt-12 flex w-fit rounded-full bg-white/10 p-1.5 backdrop-blur">
            <button
              onClick={() => setMode("guided")}
              className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${
                mode === "guided" ? "text-[var(--indigo-night)]" : "text-[var(--parchment)] hover:text-white"
              }`}
            >
              {mode === "guided" && (
                <div className="absolute inset-0 rounded-full bg-[var(--saffron)]" />
              )}
              <span className="relative z-10">Guided Journey</span>
            </button>
            <button
              onClick={() => setMode("wiki")}
              className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${
                mode === "wiki" ? "text-[var(--indigo-night)]" : "text-[var(--parchment)] hover:text-white"
              }`}
            >
              {mode === "wiki" && (
                <div className="absolute inset-0 rounded-full bg-[var(--saffron)]" />
              )}
              <span className="relative z-10">Platform Wiki</span>
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT AREA */}
      <div className="min-h-screen bg-background">
        {mode === "guided" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GuidedJourney />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PlatformWiki />
          </div>
        )}
      </div>
    </SiteShell>
  );
}

// ----------------------------------------------------------------------
// GUIDED JOURNEY MODE
// ----------------------------------------------------------------------

function GuidedJourney() {
  const [activeSegment, setActiveSegment] = useState<Segment>("youth");

  type DetailedNarrative = {
    title: string;
    system: string;
    giveAndGet: string;
    leadCapabilities: string;
    impact: string;
  };

  const segmentNarratives: Record<Segment, DetailedNarrative> = {
    youth: {
      title: "Discover Your Craft",
      system: "For the Youth, Indus Orbit acts as an accelerator for your ambitions. You join Chapters to find peers in your city, read Stories to learn raw truths about building, and receive direct Vouching from Mentors which acts as a verifiable credential of your capabilities.",
      giveAndGet: "You give your raw energy, time, and grassroots insights. In return, you receive unprecedented access to verified Mentors, skill-building opportunities, and direct pathways to early-stage capital that was previously gated by elite networks.",
      leadCapabilities: "Youth members can propose and become Chapter Leads for their city or university. As a Lead, you are responsible for organizing local events, moderating discussions, and acting as the physical anchor for the platform in your area. You gain high visibility and leadership credibility.",
      impact: "We envision a world where a 19-year-old in a tier-2 city doesn't need to move to a tech hub to be discovered. By participating in Missions and proving your skills, you flatten the geographic barriers of India.",
    },
    founder: {
      title: "Scale Your Vision",
      system: "Founders utilize 'Missions' — time-bound campaigns where you explicitly ask for what you need: Capital, Mentorship, or Hiring. The intelligence layer matches your specific needs with Experts, Investors, and Diaspora members who possess those exact resources.",
      giveAndGet: "You give the ecosystem ambition, execution, and job creation. You receive targeted financial capital, specialized domain mentorship, and access to a verified talent pool (Youth) ready to join your journey.",
      leadCapabilities: "Founders automatically become Mission Leads when they launch a campaign. As a Mission Lead, you steer the direction of the project, approve contributors, manage the timeline, and publish execution Updates. You also have the power to seamlessly remove unhelpful members, maintaining a high-signal workspace.",
      impact: "Building a company is isolating. By decentralizing support through Missions and local Chapters, we ensure that when you hit a roadblock, the entire ecosystem swarms to help you overcome it.",
    },
    expert: {
      title: "Give Back With High Leverage",
      system: "As an Expert, your time is your most valuable asset. The platform curates high-signal Founders and Youth. You can browse Missions and offer 'Mentorship & Time'. Additionally, you possess the power to 'Vouch' for emerging talent.",
      giveAndGet: "You give your domain knowledge, strategic network access, and credibility (via Vouching). You receive the profound satisfaction of giving back efficiently, access to pre-vetted innovators, and a noise-free environment.",
      leadCapabilities: "Experts frequently become Leads of specialized thematic Chapters (e.g., 'AI in Healthcare Hub') or step up as Mission Leads for highly technical open-source campaigns, defining the gold standard for others to follow.",
      impact: "We want to make giving back seamless. Instead of fielding random LinkedIn messages, you are algorithmically connected with builders who are exactly at the stage where your specific domain expertise can alter their trajectory.",
    },
    investor: {
      title: "Discover Verifiable Talent",
      system: "Investors get access to a curated pipeline of Founders operating within Missions. Because the platform enforces a strict 'Vouching' system, the signal-to-noise ratio is incredibly high. You track progress through 'Updates' before deploying capital.",
      giveAndGet: "You give financial capital, strategic scaling advice, and global networks. You receive algorithmically verified deal flow and real-time execution logs, significantly de-risking early-stage investments.",
      leadCapabilities: "While Investors typically participate as high-value Contributors, you can also sponsor and act as Mission Leads for macro-campaigns (e.g., 'Web3 Accelerator Program') to actively source and incubate talent under your own thesis.",
      impact: "By shifting the focus from polished pitch decks to verifiable execution, we help you deploy capital into builders who are genuinely executing, lowering risk and increasing ecosystem velocity.",
    },
    diaspora: {
      title: "Bridge The Geography",
      system: "The Diaspora can participate remotely by joining Missions as 'Contributors'. Whether you want to invest capital from the US, or offer weekend mentorship from Europe, the platform handles the matching and status tracking.",
      giveAndGet: "You give global capital, international market access, and mature ecosystem frameworks. You receive a seamless, frictionless way to contribute to your homeland and see the verified impact of your efforts.",
      leadCapabilities: "Diaspora members are uniquely positioned to become Chapter Leads for international hubs (e.g., 'Bay Area Indus Orbit'). You organize physical meetups to bridge local NRIs with remote Indian founders, creating powerful global corridors.",
      impact: "The Indian diaspora holds immense intellectual and financial capital. We envision Indus Orbit as the primary bridge, turning brain-drain into a brain-network, allowing you to directly impact the next generation.",
    },
    partner: {
      title: "Institutional Synergy",
      system: "Partners (Universities, Accelerators, NGOs) can launch overarching Missions or sponsor Chapters. You act as macro-nodes in the network, providing resources at scale to cohorts of Founders or Youth.",
      giveAndGet: "You give institutional resources, bulk capital, physical infrastructure, and policy support. You receive organized distribution of those resources and precise metrics tracking your impact on the grassroots ecosystem.",
      leadCapabilities: "Partners are the ultimate Chapter Sponsors. You can provision physical spaces for local chapters and act as top-level administrators for large-scale corporate or civic Missions, managing dozens of sub-contributors.",
      impact: "We provide the digital infrastructure for your offline initiatives. Instead of managing cohorts in isolated silos, you integrate them into a nationwide grid, amplifying their exposure and success rate.",
    },
    researcher: {
      title: "Analyze & Inform",
      system: "Researchers gain access to the collective pulse of the ecosystem. By observing the trends in Missions and Stories, you can identify what the ecosystem lacks, publishing insights that guide the actions of Investors and Experts.",
      giveAndGet: "You give deep data analysis, trend identification, intellectual frameworks, and policy papers. You receive unprecedented access to real-time grassroots data and a verified, highly-engaged audience for your findings.",
      leadCapabilities: "Researchers often lead 'Research Missions' where they coordinate with the community to gather data, or act as Chapter Leads for 'Think Tank' style thematic chapters driving policy discussions.",
      impact: "You provide the map. By analyzing the data flowing through the network, you help steer the collective intelligence of the platform toward the most pressing problems in the country.",
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl font-medium">How do you fit into the Orbit?</h2>
        <p className="mt-4 text-muted-foreground">Select your role to see how the system is designed for you.</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[300px_1fr]">
        {/* Sidebar Selector */}
        <div className="space-y-2 flex flex-row overflow-x-auto lg:flex-col pb-4 lg:pb-0 hide-scrollbar">
          {SEGMENT_LIST.map((segment) => {
            const meta = SEGMENT_META[segment];
            const Icon = meta.icon;
            const isActive = activeSegment === segment;
            return (
              <button
                key={segment}
                onClick={() => setActiveSegment(segment)}
                className={`flex w-full min-w-[200px] items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                  isActive 
                    ? "border-[var(--indigo-night)] bg-[var(--indigo-night)]/5 shadow-md" 
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-[var(--indigo-night)] text-[var(--parchment)]" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className={`font-semibold ${isActive ? "text-[var(--indigo-night)]" : ""}`}>{meta.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{meta.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Display */}
        <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-sm">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-[var(--indigo-night)]/5 px-4 py-2 text-[var(--indigo-night)]">
            {(() => {
              const Icon = SEGMENT_META[activeSegment].icon;
              return <Icon className="h-5 w-5" />;
            })()}
            <span className="font-semibold uppercase tracking-widest text-sm">{SEGMENT_META[activeSegment].label}</span>
          </div>
          
          <h3 className="font-display text-3xl font-medium md:text-5xl mb-12">
            {segmentNarratives[activeSegment].title}
          </h3>

          <div className="space-y-10">
            {/* System Breakdown */}
            <div className="grid md:grid-cols-[1fr_2fr] gap-6">
              <h4 className="font-display text-xl font-medium text-muted-foreground flex items-center gap-2">
                <Cpu className="h-5 w-5" /> The System
              </h4>
              <p className="text-lg leading-relaxed text-foreground/80">
                {segmentNarratives[activeSegment].system}
              </p>
            </div>
            
            <div className="h-px w-full bg-border" />

            {/* Give and Get */}
            <div className="grid md:grid-cols-[1fr_2fr] gap-6">
              <h4 className="font-display text-xl font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Give & Receive
              </h4>
              <p className="text-lg leading-relaxed text-foreground/80">
                {segmentNarratives[activeSegment].giveAndGet}
              </p>
            </div>

            <div className="h-px w-full bg-border" />

            {/* Lead Capabilities */}
            <div className="grid md:grid-cols-[1fr_2fr] gap-6">
              <h4 className="font-display text-xl font-medium text-muted-foreground flex items-center gap-2">
                <Crown className="h-5 w-5 text-[var(--saffron)] drop-shadow-sm" /> Leadership
              </h4>
              <p className="text-lg leading-relaxed text-foreground/80">
                {segmentNarratives[activeSegment].leadCapabilities}
              </p>
            </div>

            <div className="h-px w-full bg-border" />

            {/* Impact */}
            <div className="grid md:grid-cols-[1fr_2fr] gap-6">
              <h4 className="font-display text-xl font-medium text-[var(--indigo-night)] drop-shadow-sm flex items-center gap-2">
                <Globe2 className="h-5 w-5" /> Ecosystem Impact
              </h4>
              <p className="text-lg leading-relaxed text-foreground/80">
                {segmentNarratives[activeSegment].impact}
              </p>
            </div>

            <div className="h-px w-full bg-border" />

            {/* Verification & Certification */}
            <div className="rounded-2xl bg-[var(--indigo-night)]/5 border border-[var(--indigo-night)]/10 p-8">
              <h4 className="font-display text-xl font-medium text-[var(--indigo-night)] flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-[var(--saffron)]" /> 
                Verification & Official Certification
              </h4>
              <p className="text-lg leading-relaxed text-foreground/80">
                Trust on Indus Orbit must be earned. When you are invited or verified by an existing platform member through our strict <strong>Vouching System</strong>, you unlock your official <strong>Platform Certificate</strong>. This dynamically generated credential serves as a verifiable proof of your identity (e.g., "Verified {SEGMENT_META[activeSegment].label}"), quantifying your exact leadership and contributions across all Chapters and Missions within the ecosystem.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// WIKI / REFERENCE MODE
// ----------------------------------------------------------------------

function PlatformWiki() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      
      {/* WIKI INLINE HERO */}
      <div className="relative mb-16 h-[300px] w-full overflow-hidden rounded-3xl border border-border shadow-2xl">
        <img src={ART.wiki_banner} alt="The Intelligence Layer" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--indigo-night)]/90 via-[var(--indigo-night)]/60 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-10 md:px-16 text-[var(--parchment)] max-w-2xl">
          <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-glow">The Reference Manual</h2>
          <p className="mt-4 text-lg text-[var(--parchment)]/80">
            A comprehensive breakdown of the mechanics, systems, and philosophies powering India's intelligence layer.
          </p>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[250px_1fr]">
        
        {/* Sticky TOC */}
        <div className="hidden lg:block">
          <div className="sticky top-32 space-y-6">
            <h4 className="font-display text-lg font-medium text-muted-foreground">Contents</h4>
            <nav className="flex flex-col space-y-3 text-sm font-medium">
              <a href="#philosophy" className="text-foreground hover:text-[var(--saffron)] transition">1. The Core Thesis</a>
              <a href="#elements" className="text-foreground hover:text-[var(--saffron)] transition">2. Architectural Elements</a>
              <a href="#trust" className="text-foreground hover:text-[var(--saffron)] transition">3. The Trust Protocol</a>
              <a href="#ai" className="text-foreground hover:text-[var(--saffron)] transition">4. Artificial Intelligence</a>
            </nav>
          </div>
        </div>

        {/* Wiki Content */}
        <div className="prose prose-lg prose-indigo max-w-none">
          
          <section id="philosophy" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-6">1. The Core Thesis</h2>
            <p className="lead text-2xl font-light text-foreground/90 mb-8 leading-snug">
              India does not suffer from a lack of talent or capital; it suffers from a routing problem. <br/>Indus Orbit exists to solve this.
            </p>
            <p className="text-muted-foreground">
              We operate on three foundational pillars: <strong>Connection, Synergy, and Society</strong>. 
              Traditional professional networks are designed as passive directories—they optimize for endless scrolling, algorithmic engagement farming, and superficial status signaling. 
            </p>
            <p className="text-muted-foreground">
              Indus Orbit is entirely different. It is an active, deterministic machine built for <strong>execution</strong>. We define ourselves as a "General Intelligence Company" because we refuse to separate human intuition from artificial scale. By fusing verified human networks (Founders, Experts, Diaspora) with an autonomous AI layer, we create an environment where high-leverage connections happen inevitably, not accidentally.
            </p>
          </section>

          <section id="elements" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-8">2. Architectural Elements</h2>
            <p className="text-muted-foreground mb-8">
              The platform is constructed through specialized primitives. These are not just UI components; they are the fundamental building blocks of the ecosystem's engine.
            </p>
            
            <div className="grid gap-8">
              <WikiCard 
                title="Chapters" 
                icon={<MapPin className="h-6 w-6 text-[var(--indigo-night)]" />}
                imageSrc={ART.chapter}
                description="The physical grounding of our digital gravity. Chapters are localized geographic or thematic hubs (e.g., 'Bengaluru Hardware Builders'). They decentralize the network, allowing Chapter Leads to host physical events, foster dense local connections, and act as the crucial 'last-mile' routers of talent."
              />
              
              <WikiCard 
                title="Missions" 
                icon={<Target className="h-6 w-6 text-[var(--saffron)] drop-shadow-sm" />}
                imageSrc={ART.mission}
                description="Missions are the kinetic energy of the platform. They are time-bounded, goal-oriented campaigns launched by Founders or Partners. Rather than vague networking, Missions demand specific asks: 'We need NLP researchers and Seed Capital.' Contributors then join the Mission, forming an elite strike team to accomplish the goal."
              />

              <WikiCard 
                title="Stories & Updates" 
                icon={<BookOpen className="h-6 w-6 text-blue-600" />}
                imageSrc={ART.story}
                description="The permanent knowledge layer. Stories bypass the noise of standard social media; they are long-form, high-signal artifacts written by verified builders. Updates, conversely, are micro-logs tied specifically to Missions—allowing Investors to track a Founder's relentless execution velocity over time before deploying capital."
              />
            </div>
          </section>

          <section id="trust" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-6">3. The Trust Protocol</h2>
            <p className="text-muted-foreground">
              A network's utility is inversely proportional to its noise. If anyone can claim to be an expert, the title loses all meaning. Indus Orbit protects its signal-to-noise ratio through a rigorous, immutable reputation mechanic.
            </p>
            <div className="my-8 rounded-2xl bg-muted/30 p-8 border border-[var(--saffron)]/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck className="h-48 w-48 text-[var(--saffron)]" />
              </div>
              <h4 className="flex items-center gap-3 font-display text-3xl mb-4 relative z-10">
                <ShieldCheck className="h-8 w-8 text-[var(--saffron)] drop-shadow-sm" />
                The Vouching System
              </h4>
              <p className="mb-6 relative z-10 text-foreground/90 text-lg">
                Trust on Indus Orbit cannot be bought; it must be earned. When a verified Expert "Vouches" for an emerging Youth builder or Founder, they are staking their own reputation. It acts as an on-platform, verifiable credential.
              </p>
              <ul className="space-y-3 list-none relative z-10">
                <li className="flex items-start gap-3">
                  <span className="text-[var(--saffron)] font-bold mt-1">✦</span>
                  <span><strong>Public Accountability:</strong> Every vouch is visible and permanently tied to the credibility of the voucher.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--saffron)] font-bold mt-1">✦</span>
                  <span><strong>Access Gating:</strong> Accumulating legitimate vouches unlocks higher platform permissions, allowing talent to rise entirely on merit.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--saffron)] font-bold mt-1">✦</span>
                  <span><strong>Symmetric Risk:</strong> Malicious actors or those who abuse the trust protocol face systemic penalization, ensuring the ecosystem remains pristine.</span>
                </li>
              </ul>
            </div>

            <div className="my-8 rounded-2xl bg-[var(--indigo-night)] text-[var(--parchment)] p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10">
                <Award className="h-64 w-64 text-[var(--saffron)] -mr-10 -mt-10" />
              </div>
              <h4 className="flex items-center gap-3 font-display text-3xl mb-4 relative z-10 text-glow">
                <Award className="h-8 w-8 text-[var(--saffron)]" />
                Official Certification
              </h4>
              <p className="mb-4 relative z-10 text-lg text-[var(--parchment)]/90">
                Once a user successfully passes the Vouching phase, they are minted as a Verified Member. This unlocks the ability to generate an official <strong>Indus Orbit Certificate</strong>.
              </p>
              <p className="relative z-10 text-lg text-[var(--parchment)]/80">
                This isn't a static image. The certificate queries the platform's database in real-time to quantify a member's exact ecosystem footprint—displaying their specific segment, their active Mission and Chapter count, and stamping them with "Platform Lead Status" if they manage any nodes. It is a highly shareable, QR-linked credential proving their legitimate contribution to India's intelligence layer.
              </p>
            </div>
          </section>

          <section id="ai" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-6">4. Artificial Intelligence</h2>
            <p className="text-muted-foreground text-lg">
              Indus Orbit does not view AI as a chatbot bolted onto a website. We treat Artificial Intelligence as the invisible infrastructure—the nervous system—routing capital and knowledge across the country at the speed of light.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 my-10">
              <div className="border border-border/50 bg-card p-8 rounded-3xl shadow-sm hover:shadow-md transition">
                <Cpu className="h-10 w-10 text-[var(--indigo-night)] mb-6" />
                <h4 className="font-display text-2xl font-medium mb-3">Algorithmic Matchmaking</h4>
                <p className="text-muted-foreground leading-relaxed">When a Mission requires a niche skill (e.g., 'Quantum Computing Hardware'), the intelligence layer parses the entire database of profiles, published stories, and vouches to recommend the exact Expert who can resolve the bottleneck, eliminating months of networking friction.</p>
              </div>
              <div className="border border-border/50 bg-card p-8 rounded-3xl shadow-sm hover:shadow-md transition">
                <Sparkles className="h-10 w-10 text-[var(--saffron)] drop-shadow-sm mb-6" />
                <h4 className="font-display text-2xl font-medium mb-3">Automated Diligence</h4>
                <p className="text-muted-foreground leading-relaxed">For Investors and Partners, the AI continuously synthesizes a Founder's historical Mission Updates into structured diligence reports. It shifts the evaluation paradigm from "Who has the best pitch deck?" to "Who has the most relentless execution trajectory?"</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function WikiCard({ title, description, icon, imageSrc }: { title: string, description: string, icon: React.ReactNode, imageSrc: string }) {
  return (
    <div className="flex flex-col md:flex-row gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="shrink-0">
        <div className="h-24 w-24 rounded-2xl bg-muted overflow-hidden border border-border/50">
          <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
        </div>
      </div>
      <div>
        <h3 className="flex items-center gap-2 font-display text-2xl font-medium mb-3">
          {icon} {title}
        </h3>
        <p className="text-foreground/80 leading-relaxed m-0">
          {description}
        </p>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--saffron)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--saffron)]">
      {children}
    </span>
  );
}
