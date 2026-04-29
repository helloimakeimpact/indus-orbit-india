import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { 
  Users, Rocket, Zap, Globe2, ShieldCheck, MapPin, 
  Target, BookOpen, Cpu, Sparkles, Crown, Award,
  Radio, Flame, Network, PenTool, CheckCircle, Handshake,
  Mic, Workflow, LayoutDashboard, Compass, Signal, Building2, TrendingUp
} from "lucide-react";

export const Route = createFileRoute("/soda")({
  head: () => ({ meta: [{ title: "SODA — Startup Opportunities, Development & Action" }] }),
  component: SodaPage,
});

// Art Assets
const ART = {
  hero: "/soda-1.jpg", 
  group: "/soda-2.jpg", 
};

function SodaPage() {
  const [mode, setMode] = useState<"wing" | "cohort">("wing");

  return (
    <SiteShell navTone="dark">
      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden bg-[var(--indigo-night)] pt-32 pb-24 text-[var(--parchment)]">
        <div className="absolute inset-0 opacity-40">
          <img src={ART.hero} alt="SODA Vision" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--indigo-night)] via-[var(--indigo-night)]/80 to-transparent" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <Badge>Startup Opportunities, Development & Action</Badge>
          <h1 className="mt-6 font-display text-5xl font-light leading-tight md:text-7xl text-glow">
            SODA
          </h1>
          <h2 className="mt-4 font-display text-2xl font-light md:text-3xl text-[var(--saffron)] drop-shadow-md">
            The Communication Wing of Indus Orbit
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-[var(--parchment)]/90 tracking-wide font-medium">
            Stories. Signal. Systems.
          </p>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-[var(--parchment)]/80 leading-relaxed">
            SODA is the communication and visibility engine of Indus Orbit. 
            If Indus Orbit builds the intelligence layer for India’s builders, SODA is how that intelligence moves. 
            It exists to turn high-potential people, missions, and ideas into visible momentum.
          </p>

          {/* TOGGLE */}
          <div className="mx-auto mt-12 flex w-fit rounded-full bg-white/10 p-1.5 backdrop-blur shadow-xl border border-white/10">
            <button
              onClick={() => setMode("wing")}
              className={`relative rounded-full px-8 py-3 text-sm font-semibold transition-colors ${
                mode === "wing" ? "text-[var(--indigo-night)]" : "text-[var(--parchment)] hover:text-white"
              }`}
            >
              {mode === "wing" && (
                <div className="absolute inset-0 rounded-full bg-[var(--saffron)] shadow-md" />
              )}
              <span className="relative z-10">The Creative Wing</span>
            </button>
            <button
              onClick={() => setMode("cohort")}
              className={`relative rounded-full px-8 py-3 text-sm font-semibold transition-colors ${
                mode === "cohort" ? "text-[var(--indigo-night)]" : "text-[var(--parchment)] hover:text-white"
              }`}
            >
              {mode === "cohort" && (
                <div className="absolute inset-0 rounded-full bg-[var(--saffron)] shadow-md" />
              )}
              <span className="relative z-10">The Cohort Program</span>
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT AREA */}
      <div className="min-h-screen bg-background">
        {mode === "wing" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CreativeWing />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CohortProgram />
          </div>
        )}
      </div>
    </SiteShell>
  );
}

// ----------------------------------------------------------------------
// THE CREATIVE WING
// ----------------------------------------------------------------------

function CreativeWing() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-12 lg:grid-cols-[250px_1fr]">
        
        {/* Sticky TOC */}
        <div className="hidden lg:block">
          <div className="sticky top-32 space-y-6">
            <h4 className="font-display text-lg font-medium text-muted-foreground">Contents</h4>
            <nav className="flex flex-col space-y-3 text-sm font-medium">
              <a href="#intro" className="text-foreground hover:text-[var(--saffron)] transition">Introduction</a>
              <a href="#why-soda" className="text-foreground hover:text-[var(--saffron)] transition">1. Why SODA Exists</a>
              <a href="#what-soda-does" className="text-foreground hover:text-[var(--saffron)] transition">2. What SODA Does</a>
              <a href="#sponsorship" className="text-foreground hover:text-[var(--saffron)] transition">3. Sponsorship & Pillars</a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg prose-indigo max-w-none">
          
          <section id="intro" className="scroll-mt-32 mb-20">
            <p className="lead text-2xl font-light text-foreground/90 mb-8 leading-snug">
              We do not believe in passive networking, vanity content, or performative startup culture. We believe in documenting real builders, real execution, and real progress.
            </p>
            <p className="text-muted-foreground">
              SODA is the creative wing that ensures the right people are seen by the right people—founders by investors, youth builders by mentors, operators by collaborators, and ideas by those capable of turning them into companies. 
              <strong> It is where communication becomes infrastructure.</strong>
            </p>
          </section>

          <section id="why-soda" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-6">Why SODA Exists</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm">
                <Users className="h-8 w-8 text-[var(--indigo-night)] mb-4" />
                <h4 className="font-display text-xl mb-2">Invisible Talent</h4>
                <p className="text-sm text-muted-foreground m-0">Brilliant young builders often remain invisible. India does not suffer from a lack of talent. It suffers from a routing problem.</p>
              </div>
              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm">
                <Network className="h-8 w-8 text-[var(--saffron)] mb-4" />
                <h4 className="font-display text-xl mb-2">Missing Bridges</h4>
                <p className="text-sm text-muted-foreground m-0">Experts are willing to help, but the bridge does not exist. The connection between established operators and emerging talent is broken.</p>
              </div>
              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm">
                <ShieldCheck className="h-8 w-8 text-blue-600 mb-4" />
                <h4 className="font-display text-xl mb-2">Trust Deficit</h4>
                <p className="text-sm text-muted-foreground m-0">Investors seek conviction, but trust takes too long to form. Most platforms optimize for attention. We optimize for alignment.</p>
              </div>
            </div>
            <p className="text-muted-foreground text-lg">
              SODA exists to solve that. It is the storytelling, documentation, and public trust layer of Indus Orbit—designed to create signal in a noisy ecosystem. By combining media, mentorship, and public accountability, SODA helps exceptional people move faster.
            </p>
          </section>

          <section id="what-soda-does" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-8">What SODA Does</h2>
            <div className="space-y-8">
              
              <WikiCard 
                title="1. Communication" 
                icon={<Signal className="h-6 w-6 text-[var(--indigo-night)]" />}
                imageSrc={ART.group}
                description="We document and distribute high-signal stories from India’s builders. This includes founder journeys, mission progress, operator playbooks, and youth builder case studies. Distributed across YouTube, LinkedIn, X, Podcasts, and Newsletters. This is not content for attention. It is content for movement."
              />
              
              <div className="flex flex-col md:flex-row gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="shrink-0 flex items-center justify-center h-24 w-24 rounded-2xl bg-[var(--indigo-night)]/5 border border-[var(--indigo-night)]/10">
                  <ShieldCheck className="h-10 w-10 text-[var(--saffron)]" />
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl font-medium mb-3">
                    2. Credibility
                  </h3>
                  <p className="text-foreground/80 leading-relaxed m-0">
                    Visibility without trust creates noise. SODA works inside the Indus Orbit trust system to ensure stories are backed by real execution. Every founder featured is tied to actual work, actual progress, and real accountability. This creates sponsor confidence, investor confidence, and ecosystem trust. We do not amplify potential alone. We amplify proof.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="shrink-0 flex items-center justify-center h-24 w-24 rounded-2xl bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30">
                  <TrendingUp className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-display text-2xl font-medium mb-3">
                    3. Builder Development
                  </h3>
                  <p className="text-foreground/80 leading-relaxed m-0">
                    SODA is not only a media platform. It is an operator-driven system that runs the SODA Cohort Program. We identify high-potential young builders and help them move from ambition to execution. This is where storytelling meets outcomes.
                  </p>
                </div>
              </div>

            </div>
          </section>

          <section id="sponsorship" className="scroll-mt-32 mb-20">
            <div className="bg-[var(--saffron)]/10 border border-[var(--saffron)]/30 p-8 md:p-12 rounded-3xl mb-12 relative overflow-hidden">
              <Handshake className="absolute top-1/2 right-10 -translate-y-1/2 h-48 w-48 text-[var(--saffron)] opacity-10" />
              <h2 className="font-display text-4xl mb-4 relative z-10 text-[var(--indigo-night)]">Sponsor India’s Next Builders</h2>
              <p className="text-lg text-foreground/80 mb-6 max-w-2xl relative z-10">
                SODA is built for long-term ecosystem partners. Sponsors do not fund advertisements. They fund outcomes.
              </p>
              <ul className="grid sm:grid-cols-2 gap-3 text-sm font-medium text-foreground/80 relative z-10 max-w-2xl mb-6">
                <li>• Founder development</li>
                <li>• Youth innovation</li>
                <li>• High-trust communities</li>
                <li>• Startup pipelines</li>
                <li>• Public execution journeys</li>
                <li>• Next generation of Indian builders</li>
              </ul>
              <p className="text-xl font-medium text-[var(--indigo-night)] relative z-10">
                This is measurable, visible, and meaningful.<br/>
                Not impressions. Proof.
              </p>
            </div>

            <div className="mb-16">
              <h2 className="font-display text-3xl mb-6 text-center">Built on the Indus Orbit Pillars</h2>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <h4 className="font-display text-xl mb-2 text-[var(--indigo-night)]">Connection</h4>
                  <p className="text-muted-foreground text-sm">We bring the right people into the same room.</p>
                </div>
                <div>
                  <h4 className="font-display text-xl mb-2 text-[var(--saffron)]">Synergy</h4>
                  <p className="text-muted-foreground text-sm">We help talent compound talent.</p>
                </div>
                <div>
                  <h4 className="font-display text-xl mb-2 text-blue-600">Society</h4>
                  <p className="text-muted-foreground text-sm">We measure success by how much we lift others.</p>
                </div>
              </div>
              <p className="text-center mt-8 font-medium text-lg text-foreground/80">
                SODA is not separate from Indus Orbit.<br/>
                It is how the orbit becomes visible.
              </p>
            </div>

            <div className="border-t border-border pt-16 pb-8 text-center max-w-3xl mx-auto">
              <h2 className="font-display text-4xl mb-8 leading-tight">
                The future should not belong only to those with access. <br/>
                <span className="text-[var(--saffron)]">It should belong to those willing to build.</span>
              </h2>
              <div className="flex justify-center gap-6 mb-8 text-lg font-medium text-[var(--indigo-night)]">
                <span>We identify them.</span>
                <span>We support them.</span>
                <span>We document them.</span>
                <span>We help them move.</span>
              </div>
              <p className="text-2xl font-light text-foreground mb-4">
                This is not content.<br/>
                <strong className="font-medium">This is founder infrastructure.</strong>
              </p>
              <div className="mt-12 inline-flex items-center gap-3">
                <img src="/logo.png" alt="Indus Orbit" className="h-8 w-8 opacity-80" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="font-display text-xl uppercase tracking-widest text-muted-foreground font-semibold">
                  This is SODA by Indus Orbit
                </span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// THE COHORT PROGRAM
// ----------------------------------------------------------------------

function CohortProgram() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-12 lg:grid-cols-[250px_1fr]">
        
        {/* Sticky TOC */}
        <div className="hidden lg:block">
          <div className="sticky top-32 space-y-6">
            <h4 className="font-display text-lg font-medium text-muted-foreground">Contents</h4>
            <nav className="flex flex-col space-y-3 text-sm font-medium">
              <a href="#program-intro" className="text-foreground hover:text-[var(--saffron)] transition">Program Overview</a>
              <a href="#core-idea" className="text-foreground hover:text-[var(--saffron)] transition">1. The Core Idea</a>
              <a href="#benefits" className="text-foreground hover:text-[var(--saffron)] transition">2. What Builders Receive</a>
              <a href="#structure" className="text-foreground hover:text-[var(--saffron)] transition">3. How It Works</a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg prose-indigo max-w-none">

          <section id="program-intro" className="scroll-mt-32 mb-20">
            <div className="rounded-3xl bg-[var(--indigo-night)] text-[var(--parchment)] p-10 md:p-14 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                <Rocket className="h-64 w-64 text-[var(--saffron)] -mr-10 -mt-10" />
              </div>
              <Badge>Run by SODA</Badge>
              <h2 className="font-display text-4xl md:text-5xl mt-6 mb-4 text-glow relative z-10">
                The SODA Cohort Program
              </h2>
              <h3 className="text-xl md:text-2xl text-[var(--saffron)] font-medium mb-8 relative z-10">
                Indus Orbit’s Founder Development Program for Builders Under 24
              </h3>
              <p className="text-lg text-[var(--parchment)]/90 leading-relaxed relative z-10 mb-6">
                The SODA Cohort is our flagship accelerator program designed to identify and support India’s highest-potential young builders. Every cohort selects 5 exceptional individuals under the age of 24.
              </p>
              <p className="text-xl font-medium text-white relative z-10 mb-8">
                Not students chasing credentials.<br/>
                Builders chasing outcomes.
              </p>
              <p className="text-lg text-[var(--parchment)]/80 leading-relaxed relative z-10">
                These are founders, operators, creators, researchers, and ambitious problem-solvers who are already moving—and need the right orbit around them. We give them exactly that.
              </p>
            </div>
          </section>

          <section id="core-idea" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-6">The Core Idea</h2>
            <div className="p-8 border-l-4 border-[var(--saffron)] bg-muted/30 rounded-r-2xl">
              <p className="text-xl font-light text-foreground/90 mb-4">
                Talent is everywhere. Structured access is not.
              </p>
              <p className="text-muted-foreground mb-4">
                Most young builders fail not because they lack intelligence, but because they lack the right mentors, feedback loops, execution systems, introductions, accountability, and belief from credible people.
              </p>
              <p className="font-medium text-foreground">
                SODA closes that gap. We create an environment where progress becomes inevitable.
              </p>
            </div>
          </section>

          <section id="benefits" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-8">What Selected Builders Receive</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              
              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm">
                <Crown className="h-8 w-8 text-[var(--saffron)] mb-4" />
                <h4 className="font-display text-xl font-medium mb-3">Elite Mentorship</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Direct access to founders, operators, experts, and industry veterans who have already built what others are still trying to understand. Not advice from the sidelines. Real strategic guidance.
                </p>
              </div>

              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm">
                <LayoutDashboard className="h-8 w-8 text-[var(--indigo-night)] mb-4" />
                <h4 className="font-display text-xl font-medium mb-3">Startup Design Support</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  We help shape strong businesses—not just ideas. This includes market clarity, founder positioning, business model design, customer understanding, and execution prioritization.
                </p>
              </div>

              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm">
                <Cpu className="h-8 w-8 text-blue-600 mb-4" />
                <h4 className="font-display text-xl font-medium mb-3">AI + Technology Access</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Access to the tools, systems, and workflows needed to operate like modern builders. Agent-native workflows, research systems, execution support. Build with intelligence, not just effort.
                </p>
              </div>

              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm">
                <Network className="h-8 w-8 text-[var(--saffron)] mb-4" />
                <h4 className="font-display text-xl font-medium mb-3">Founder Network Access</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Access to founders, experts, investors, operators, diaspora networks, and mission collaborators. Relationships are not random here. They are designed.
                </p>
              </div>

              <div className="border border-border/50 bg-card p-6 rounded-2xl shadow-sm sm:col-span-2">
                <Radio className="h-8 w-8 text-[var(--indigo-night)] mb-4" />
                <h4 className="font-display text-xl font-medium mb-3">Public Documentation</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Every journey is documented by the SODA communication wing. Progress is visible. Execution is public. Growth becomes proof. This creates trust, accountability, and opportunity. It also turns the builder into a signal others can recognize.
                </p>
              </div>

            </div>
          </section>

          <section id="structure" className="scroll-mt-32 mb-20">
            <h2 className="font-display text-4xl mb-6">How the Program Works</h2>
            
            <div className="flex flex-col md:flex-row gap-8 mb-10">
              <div className="flex-1 bg-[var(--indigo-night)]/5 border border-[var(--indigo-night)]/10 p-8 rounded-3xl text-center">
                <h3 className="font-display text-xl font-medium text-[var(--indigo-night)] mb-2">Cohort Based</h3>
                <p className="text-muted-foreground text-sm">Focused founder acceleration cycle.</p>
                <div className="mt-6 flex justify-center gap-4">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-sm border font-medium">5 Builders</div>
                  <div className="bg-white px-4 py-2 rounded-lg shadow-sm border font-medium">180 Days</div>
                  <div className="bg-[var(--indigo-night)] text-white px-4 py-2 rounded-lg shadow-sm font-medium">Publicly Built</div>
                </div>
              </div>
              
              <div className="flex-1 bg-muted/50 border border-border p-8 rounded-3xl">
                <h3 className="font-display text-xl font-medium mb-4">Weekly Structure</h3>
                <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground font-medium">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[var(--saffron)]"/> Founder reviews</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[var(--saffron)]"/> Mentor sessions</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[var(--saffron)]"/> Execution check-ins</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[var(--saffron)]"/> Strategic problem solving</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[var(--saffron)]"/> Public updates</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[var(--saffron)]"/> Ecosystem intros</li>
                </ul>
                <p className="mt-6 font-semibold text-foreground">This is not inspiration. It is operational pressure.</p>
              </div>
            </div>

            <div className="my-12">
              <h3 className="font-display text-3xl mb-6">Why It Matters</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl bg-card">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">For Builders</span>
                  <span className="font-medium">Clarity, access, credibility, speed</span>
                </div>
                <div className="p-4 border rounded-xl bg-card">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">For Mentors</span>
                  <span className="font-medium">High-quality emerging talent</span>
                </div>
                <div className="p-4 border rounded-xl bg-card">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">For Investors</span>
                  <span className="font-medium">Early visibility into real operators</span>
                </div>
                <div className="p-4 border rounded-xl bg-card">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">For Sponsors</span>
                  <span className="font-medium">Direct access to the next generation of founders</span>
                </div>
              </div>
              <p className="mt-6 text-center text-xl font-light text-foreground/80">
                For India: more people building meaningful things earlier. <br/>
                <strong className="font-medium text-[var(--indigo-night)]">This is how ecosystems grow.</strong>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------------

function WikiCard({ title, description, icon, imageSrc }: { title: string, description: string, icon: React.ReactNode, imageSrc: string }) {
  return (
    <div className="flex flex-col md:flex-row gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="shrink-0 hidden sm:block">
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
    <span className="inline-flex items-center rounded-full bg-[var(--saffron)]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--saffron)] border border-[var(--saffron)]/30 backdrop-blur-sm">
      {children}
    </span>
  );
}
