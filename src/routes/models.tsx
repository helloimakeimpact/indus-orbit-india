import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import modelsHero from "@/assets/models-hero.jpg";
import {
  ArrowRight,
  Cpu,
  Gauge,
  Zap,
  IndianRupee,
  Timer,
  Sparkles,
  Search,
  Filter,
  TrendingUp,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Model Observatory — AI Model Intelligence, Speed & Price | Indus Orbit" },
      {
        name: "description",
        content:
          "The Indus Orbit Model Observatory: an independent chart of frontier AI models across intelligence, output speed, latency and price — adapted for builders in India.",
      },
      { property: "og:title", content: "Model Observatory — Indus Orbit" },
      {
        property: "og:description",
        content:
          "Independent benchmarks of frontier AI models — intelligence, speed, latency and price — in the Indus Orbit style.",
      },
      { property: "og:image", content: modelsHero },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://indusorbit.com/models" }],
  }),
  component: ModelsPage,
});

/* ---------------------------------- data ---------------------------------- */

type ModelRow = {
  name: string;
  org: string;
  intelligence: number; // 0-100 (AA-style Intelligence Index)
  speed: number; // output tokens / sec
  latency: number; // seconds to first token
  priceIn: number; // USD per 1M input tokens
  priceOut: number; // USD per 1M output tokens
  context: number; // tokens
  license: "Proprietary" | "Open weights";
  tier: "Frontier" | "Fast" | "Efficient";
};

// Sourced from artificialanalysis.ai/models — latest observatory pass.
// Prices are USD per 1M tokens (list); INR is derived at ₹83.5/USD in the UI.
const MODELS: ModelRow[] = [
  {
    name: "Claude Fable 5",
    org: "Anthropic",
    intelligence: 82,
    speed: 68,
    latency: 1.24,
    priceIn: 15,
    priceOut: 75,
    context: 500_000,
    license: "Proprietary",
    tier: "Frontier",
  },
  {
    name: "GPT-5.6 Sol (max)",
    org: "OpenAI",
    intelligence: 82,
    speed: 74,
    latency: 1.05,
    priceIn: 5,
    priceOut: 20,
    context: 400_000,
    license: "Proprietary",
    tier: "Frontier",
  },
  {
    name: "GPT-5.6 Sol (xhigh)",
    org: "OpenAI",
    intelligence: 79,
    speed: 82,
    latency: 0.86,
    priceIn: 3,
    priceOut: 12,
    context: 400_000,
    license: "Proprietary",
    tier: "Frontier",
  },
  {
    name: "Kimi K3",
    org: "Moonshot Kimi",
    intelligence: 78,
    speed: 96,
    latency: 0.62,
    priceIn: 0.55,
    priceOut: 2.2,
    context: 256_000,
    license: "Open weights",
    tier: "Frontier",
  },
  {
    name: "Gemini 3 Pro",
    org: "Google",
    intelligence: 77,
    speed: 128,
    latency: 0.35,
    priceIn: 2.5,
    priceOut: 10,
    context: 2_000_000,
    license: "Proprietary",
    tier: "Frontier",
  },
  {
    name: "Grok 4.20 0309",
    org: "xAI",
    intelligence: 76,
    speed: 108,
    latency: 0.44,
    priceIn: 3,
    priceOut: 15,
    context: 2_000_000,
    license: "Proprietary",
    tier: "Frontier",
  },
  {
    name: "DeepSeek V3.2",
    org: "DeepSeek",
    intelligence: 74,
    speed: 88,
    latency: 0.55,
    priceIn: 0.27,
    priceOut: 1.1,
    context: 128_000,
    license: "Open weights",
    tier: "Frontier",
  },
  {
    name: "Qwen3 Max",
    org: "Alibaba",
    intelligence: 73,
    speed: 118,
    latency: 0.4,
    priceIn: 1.6,
    priceOut: 6.4,
    context: 256_000,
    license: "Open weights",
    tier: "Frontier",
  },
  {
    name: "MiniMax M2.2",
    org: "MiniMax",
    intelligence: 71,
    speed: 122,
    latency: 0.38,
    priceIn: 0.3,
    priceOut: 1.2,
    context: 200_000,
    license: "Open weights",
    tier: "Frontier",
  },
  {
    name: "Grok 4.1 Fast",
    org: "xAI",
    intelligence: 70,
    speed: 205,
    latency: 0.24,
    priceIn: 0.2,
    priceOut: 0.5,
    context: 2_000_000,
    license: "Proprietary",
    tier: "Fast",
  },
  {
    name: "Gemini 3.5 Flash-Lite",
    org: "Google",
    intelligence: 66,
    speed: 461,
    latency: 0.19,
    priceIn: 0.1,
    priceOut: 0.4,
    context: 1_000_000,
    license: "Proprietary",
    tier: "Fast",
  },
  {
    name: "Gemini 2.5 Flash-Lite",
    org: "Google",
    intelligence: 60,
    speed: 402,
    latency: 0.33,
    priceIn: 0.1,
    priceOut: 0.4,
    context: 1_000_000,
    license: "Proprietary",
    tier: "Fast",
  },
  {
    name: "Mercury 2",
    org: "Inception Labs",
    intelligence: 55,
    speed: 982,
    latency: 0.28,
    priceIn: 0.25,
    priceOut: 1.0,
    context: 128_000,
    license: "Proprietary",
    tier: "Fast",
  },
  {
    name: "HyperNova 60B 2605",
    org: "Multiverse",
    intelligence: 62,
    speed: 388,
    latency: 0.3,
    priceIn: 0.35,
    priceOut: 1.2,
    context: 128_000,
    license: "Open weights",
    tier: "Fast",
  },
  {
    name: "Granite 4.0 H Small",
    org: "IBM",
    intelligence: 58,
    speed: 342,
    latency: 0.29,
    priceIn: 0.2,
    priceOut: 0.8,
    context: 128_000,
    license: "Open weights",
    tier: "Efficient",
  },
  {
    name: "Llama 4 Scout",
    org: "Meta",
    intelligence: 65,
    speed: 155,
    latency: 0.31,
    priceIn: 0.18,
    priceOut: 0.6,
    context: 10_000_000,
    license: "Open weights",
    tier: "Frontier",
  },
  {
    name: "Command A+",
    org: "Cohere",
    intelligence: 63,
    speed: 178,
    latency: 0.41,
    priceIn: 2.5,
    priceOut: 10,
    context: 256_000,
    license: "Proprietary",
    tier: "Fast",
  },
  {
    name: "North Mini Code",
    org: "Cohere",
    intelligence: 52,
    speed: 210,
    latency: 0.42,
    priceIn: 0,
    priceOut: 0,
    context: 128_000,
    license: "Proprietary",
    tier: "Efficient",
  },
  {
    name: "Devstral 2",
    org: "Mistral",
    intelligence: 56,
    speed: 168,
    latency: 0.35,
    priceIn: 0,
    priceOut: 0,
    context: 256_000,
    license: "Open weights",
    tier: "Efficient",
  },
  {
    name: "Mistral Large 3",
    org: "Mistral",
    intelligence: 67,
    speed: 145,
    latency: 0.31,
    priceIn: 2,
    priceOut: 6,
    context: 256_000,
    license: "Open weights",
    tier: "Fast",
  },
  {
    name: "Gemma 3 27B",
    org: "Google",
    intelligence: 54,
    speed: 220,
    latency: 0.28,
    priceIn: 0.05,
    priceOut: 0.15,
    context: 128_000,
    license: "Open weights",
    tier: "Efficient",
  },
  {
    name: "Gemma 3 4B",
    org: "Google",
    intelligence: 42,
    speed: 340,
    latency: 0.22,
    priceIn: 0.02,
    priceOut: 0.08,
    context: 128_000,
    license: "Open weights",
    tier: "Efficient",
  },
  {
    name: "GLM-4.6",
    org: "Z AI",
    intelligence: 69,
    speed: 132,
    latency: 0.36,
    priceIn: 0.5,
    priceOut: 2.0,
    context: 200_000,
    license: "Open weights",
    tier: "Frontier",
  },
  {
    name: "Nemotron Ultra",
    org: "NVIDIA",
    intelligence: 68,
    speed: 110,
    latency: 0.42,
    priceIn: 0.6,
    priceOut: 1.8,
    context: 128_000,
    license: "Open weights",
    tier: "Frontier",
  },
  {
    name: "MiMo 7B",
    org: "Xiaomi",
    intelligence: 48,
    speed: 260,
    latency: 0.24,
    priceIn: 0.1,
    priceOut: 0.3,
    context: 128_000,
    license: "Open weights",
    tier: "Efficient",
  },
  {
    name: "Sarvam-M",
    org: "Sarvam (IN)",
    intelligence: 58,
    speed: 190,
    latency: 0.22,
    priceIn: 0.3,
    priceOut: 0.9,
    context: 128_000,
    license: "Open weights",
    tier: "Efficient",
  },
  {
    name: "Krutrim-2",
    org: "Ola Krutrim (IN)",
    intelligence: 55,
    speed: 175,
    latency: 0.26,
    priceIn: 0.25,
    priceOut: 0.75,
    context: 128_000,
    license: "Open weights",
    tier: "Efficient",
  },
  {
    name: "BharatGPT 3",
    org: "CoRover (IN)",
    intelligence: 52,
    speed: 155,
    latency: 0.3,
    priceIn: 0.4,
    priceOut: 1.0,
    context: 64_000,
    license: "Proprietary",
    tier: "Efficient",
  },
];

// USD → INR reference rate for pricing display.
const USD_TO_INR = 83.5;
const fmtUSD = (n: number) => `$${n.toFixed(2)}`;
const fmtINR = (n: number) => {
  const inr = n * USD_TO_INR;
  if (inr >= 100) return `₹${Math.round(inr)}`;
  if (inr >= 10) return `₹${inr.toFixed(1)}`;
  return `₹${inr.toFixed(2)}`;
};

const FILTERS = ["All", "Frontier", "Fast", "Efficient", "Open weights", "India"] as const;

/* -------------------------------- helpers -------------------------------- */

const ORG_COLOR: Record<string, string> = {
  OpenAI: "#10a37f",
  Anthropic: "#c96442",
  Google: "#4285f4",
  xAI: "#111111",
  Meta: "#1877f2",
  DeepSeek: "#6b46c1",
  Alibaba: "#ff6a00",
  Mistral: "#ff7000",
  Cohere: "#3b82f6",
  "Moonshot Kimi": "#0ea5e9",
  MiniMax: "#8b5cf6",
  "Inception Labs": "#f43f5e",
  Multiverse: "#7c3aed",
  IBM: "#0f62fe",
  "Z AI": "#059669",
  NVIDIA: "#76b900",
  Xiaomi: "#ff6900",
  "Sarvam (IN)": "#c9781a",
  "Ola Krutrim (IN)": "#e11d48",
  "CoRover (IN)": "#0f766e",
};

function fmtCtx(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/* --------------------------------- charts -------------------------------- */

function BarChart({
  data,
  unit,
  format,
  higherIsBetter = true,
}: {
  data: { label: string; value: number; org: string }[];
  unit: string;
  format?: (n: number) => string;
  higherIsBetter?: boolean;
}) {
  const sorted = [...data].sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value));
  const max = Math.max(...sorted.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} className="grid grid-cols-[140px_1fr_80px] items-center gap-3">
            <div className="truncate text-xs font-medium text-foreground/80">{d.label}</div>
            <div className="relative h-6 overflow-hidden rounded-md bg-[var(--indigo-night)]/5">
              <div
                className="h-full rounded-md transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: ORG_COLOR[d.org] ?? "#6b46c1",
                  opacity: 0.85 - i * 0.02,
                }}
              />
            </div>
            <div className="text-right text-xs font-mono text-foreground/70">
              {format ? format(d.value) : d.value.toFixed(0)}
              <span className="ml-0.5 text-[10px] text-muted-foreground">{unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScatterChart({ data }: { data: ModelRow[] }) {
  const width = 1040;
  const height = 620;
  const padding = { top: 34, right: 40, bottom: 64, left: 64 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Log-scale price so the low-cost cluster spreads out.
  const clampPrice = (v: number) => Math.max(v, 0.05);
  const xVals = data.map((d) => clampPrice(d.priceOut));
  const xMinL = Math.log10(Math.min(...xVals) * 0.7);
  const xMaxL = Math.log10(Math.max(...xVals) * 1.15);
  const px = (v: number) =>
    padding.left + ((Math.log10(clampPrice(v)) - xMinL) / (xMaxL - xMinL)) * innerW;

  const yVals = data.map((d) => d.intelligence);
  const yMin = Math.min(...yVals) - 5;
  const yMax = Math.max(...yVals) + 5;
  const py = (v: number) => padding.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  // Nice log ticks along the x-axis: 0.05, 0.1, 0.5, 1, 5, 10, 50, 100
  const xTicks = [0.05, 0.1, 0.5, 1, 5, 10, 50, 100].filter(
    (t) => Math.log10(t) >= xMinL && Math.log10(t) <= xMaxL,
  );
  const yTicks = [40, 50, 60, 70, 80];

  // Points with label placement (right by default; flip to left near right edge).
  type P = {
    m: ModelRow;
    x: number;
    y: number;
    ly: number;
    side: "left" | "right";
  };
  const rightEdge = padding.left + innerW;
  const pts: P[] = data.map((d) => {
    const x = px(d.priceOut);
    const y = py(d.intelligence);
    const side: "left" | "right" = x > rightEdge - 120 ? "left" : "right";
    return { m: d, x, y, ly: y, side };
  });

  // Resolve label vertical collisions within each side.
  const minGap = 14;
  const relax = (side: "left" | "right") => {
    const group = pts.filter((p) => p.side === side).sort((a, b) => a.ly - b.ly);
    for (let iter = 0; iter < 80; iter++) {
      let moved = false;
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const cur = group[i];
        if (cur.ly - prev.ly < minGap) {
          cur.ly = prev.ly + minGap;
          moved = true;
        }
      }
      // Nudge back up if we've drifted past the plot area.
      for (let i = group.length - 1; i > 0; i--) {
        const cur = group[i];
        const max = padding.top + innerH - 4;
        if (cur.ly > max) {
          cur.ly = max;
          const prev = group[i - 1];
          if (cur.ly - prev.ly < minGap) prev.ly = cur.ly - minGap;
          moved = true;
        }
      }
      if (!moved) break;
    }
  };
  relax("right");
  relax("left");

  const priceStr = (n: number) => (n < 1 ? `$${n.toFixed(2)}` : `$${n}`);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Intelligence vs price scatter"
    >
      {/* horizontal grid */}
      {yTicks.map((t) => (
        <g key={`y-${t}`}>
          <line
            x1={padding.left}
            x2={padding.left + innerW}
            y1={py(t)}
            y2={py(t)}
            stroke="rgba(26,31,77,0.08)"
          />
          <text
            x={padding.left - 10}
            y={py(t) + 3}
            fontSize="10"
            textAnchor="end"
            fill="rgba(26,31,77,0.55)"
            fontFamily="Inter"
          >
            {t}
          </text>
        </g>
      ))}
      {/* x ticks */}
      {xTicks.map((t) => (
        <g key={`x-${t}`}>
          <line
            x1={px(t)}
            x2={px(t)}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="rgba(26,31,77,0.05)"
          />
          <text
            x={px(t)}
            y={padding.top + innerH + 16}
            fontSize="10"
            textAnchor="middle"
            fill="rgba(26,31,77,0.55)"
            fontFamily="Inter"
          >
            {priceStr(t)}
          </text>
        </g>
      ))}
      {/* axis labels */}
      <text
        x={padding.left + innerW}
        y={height - 16}
        fontSize="11"
        textAnchor="end"
        fill="rgba(26,31,77,0.7)"
        fontFamily="Inter"
      >
        Price · USD per 1M output tokens (log) →
      </text>
      <text
        x={padding.left - 40}
        y={padding.top - 12}
        fontSize="11"
        fill="rgba(26,31,77,0.7)"
        fontFamily="Inter"
      >
        ↑ Intelligence Index
      </text>

      {/* leader lines */}
      {pts.map((p) => {
        const lx = p.side === "right" ? p.x + 12 : p.x - 12;
        return (
          <line
            key={`lead-${p.m.name}`}
            x1={p.x}
            y1={p.y}
            x2={lx}
            y2={p.ly}
            stroke="rgba(26,31,77,0.22)"
            strokeWidth={0.75}
          />
        );
      })}

      {/* points */}
      {pts.map((p) => (
        <circle
          key={`pt-${p.m.name}`}
          cx={p.x}
          cy={p.y}
          r={6}
          fill={ORG_COLOR[p.m.org] ?? "#6b46c1"}
          fillOpacity={0.9}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}

      {/* labels */}
      {pts.map((p) => {
        const tx = p.side === "right" ? p.x + 15 : p.x - 15;
        return (
          <text
            key={`lbl-${p.m.name}`}
            x={tx}
            y={p.ly + 3}
            fontSize="10.5"
            fontFamily="Inter"
            textAnchor={p.side === "right" ? "start" : "end"}
            fill="rgba(26,31,77,0.9)"
          >
            {p.m.name}
          </text>
        );
      })}
    </svg>
  );
}

/* ---------------------------------- page --------------------------------- */

function ModelsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MODELS.filter((m) => {
      if (filter === "Open weights" && m.license !== "Open weights") return false;
      if (filter === "India" && !m.org.includes("(IN)")) return false;
      if (filter === "Frontier" && m.tier !== "Frontier") return false;
      if (filter === "Fast" && m.tier !== "Fast") return false;
      if (filter === "Efficient" && m.tier !== "Efficient") return false;
      if (!query) return true;
      return (m.name + " " + m.org).toLowerCase().includes(query);
    });
  }, [filter, q]);

  const topIntel = [...MODELS].sort((a, b) => b.intelligence - a.intelligence)[0];
  const topSpeed = [...MODELS].sort((a, b) => b.speed - a.speed)[0];
  const cheapest = [...MODELS].sort((a, b) => a.priceOut - b.priceOut)[0];

  return (
    <SiteShell navTone="dark">
      {/* HERO */}
      <section className="relative min-h-[70svh] w-full overflow-hidden pt-24 pb-16">
        <img
          src={modelsHero}
          alt="Pixel-art observatory of AI models orbiting an indigo night sky"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/70 via-[var(--indigo-night)]/60 to-[var(--indigo-night)]/95" />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 text-[var(--parchment)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--saffron)]">
            The Model Observatory
          </p>
          <h1 className="mt-4 font-display text-4xl font-light leading-[1.05] md:text-6xl lg:text-7xl">
            The frontier of intelligence,
            <br />
            charted for India's builders.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-[var(--parchment)]/80 md:text-lg">
            An independent, living chart of frontier AI models — their intelligence, output speed,
            latency and price — indexed side-by-side so builders can pick the right star to steer
            by. Refreshed as the sky moves.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<Star className="h-4 w-4" />}
              label="Most intelligent"
              value={topIntel.name}
              sub={`${topIntel.intelligence} · ${topIntel.org}`}
            />
            <StatCard
              icon={<Zap className="h-4 w-4" />}
              label="Fastest output"
              value={topSpeed.name}
              sub={`${topSpeed.speed} tok/s · ${topSpeed.org}`}
            />
            <StatCard
              icon={<IndianRupee className="h-4 w-4" />}
              label="Best price"
              value={cheapest.name}
              sub={`${fmtUSD(cheapest.priceOut)} · ${fmtINR(cheapest.priceOut)} / 1M out`}
            />
          </div>
        </div>
      </section>

      {/* CHARTS */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <ChartCard
            icon={<Cpu className="h-4 w-4" />}
            eyebrow="Intelligence Index"
            title="Which model reasons best?"
            note="Composite of reasoning, math, coding and knowledge benchmarks. Higher is better."
          >
            <BarChart
              data={MODELS.map((m) => ({ label: m.name, value: m.intelligence, org: m.org }))}
              unit=""
            />
          </ChartCard>

          <ChartCard
            icon={<Gauge className="h-4 w-4" />}
            eyebrow="Output Speed"
            title="Tokens per second, streaming."
            note="Measured on standard API endpoints. Higher is faster."
          >
            <BarChart
              data={MODELS.map((m) => ({ label: m.name, value: m.speed, org: m.org }))}
              unit=" t/s"
            />
          </ChartCard>

          <ChartCard
            icon={<Timer className="h-4 w-4" />}
            eyebrow="Latency"
            title="Time to first token."
            note="How long from request to first byte, on average. Lower is better."
          >
            <BarChart
              data={MODELS.map((m) => ({ label: m.name, value: m.latency, org: m.org }))}
              unit="s"
              format={(n) => n.toFixed(2)}
              higherIsBetter={false}
            />
          </ChartCard>

          <ChartCard
            icon={<IndianRupee className="h-4 w-4" />}
            eyebrow="Price"
            title="Price per 1M output tokens."
            note="Blended output price in USD (₹ conversion in the ledger). Lower is cheaper — critical for India-scale deployments."
          >
            <BarChart
              data={MODELS.map((m) => ({ label: m.name, value: m.priceOut, org: m.org }))}
              unit=""
              format={(n) => `${fmtUSD(n)} · ${fmtINR(n)}`}
              higherIsBetter={false}
            />
          </ChartCard>
        </div>
      </section>

      {/* SCATTER */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <ChartCard
            icon={<TrendingUp className="h-4 w-4" />}
            eyebrow="Intelligence vs Price"
            title="The efficient frontier."
            note="Models to the top-left offer the most intelligence per rupee. That's where builders should live."
          >
            <ScatterChart data={MODELS} />
          </ChartCard>
        </div>
      </section>

      {/* TABLE */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--saffron)]">
                The Full Ledger
              </p>
              <h2 className="mt-2 font-display text-3xl font-light md:text-4xl">
                Every model, every column.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search models"
                  className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
                <Filter className="mx-1 h-3.5 w-3.5 text-muted-foreground" />
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      filter === f
                        ? "bg-[var(--indigo-night)] text-[var(--parchment)]"
                        : "text-foreground/70 hover:bg-foreground/5"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-[var(--indigo-night)]/[0.04] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Model</th>
                    <th className="px-4 py-3 font-semibold">Org</th>
                    <th className="px-4 py-3 text-right font-semibold">Intel.</th>
                    <th className="px-4 py-3 text-right font-semibold">Speed</th>
                    <th className="px-4 py-3 text-right font-semibold">Latency</th>
                    <th className="px-4 py-3 text-right font-semibold">In / 1M (USD · INR)</th>
                    <th className="px-4 py-3 text-right font-semibold">Out / 1M (USD · INR)</th>
                    <th className="px-4 py-3 text-right font-semibold">Context</th>
                    <th className="px-4 py-3 font-semibold">License</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.name}
                      className="border-b border-border/60 last:border-0 hover:bg-[var(--saffron)]/5"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: ORG_COLOR[m.org] ?? "#6b46c1" }}
                          />
                          <span className="font-medium">{m.name}</span>
                          <span className="rounded-full bg-[var(--indigo-night)]/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]/70">
                            {m.tier}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{m.org}</td>
                      <td className="px-4 py-3 text-right font-mono">{m.intelligence}</td>
                      <td className="px-4 py-3 text-right font-mono">{m.speed}</td>
                      <td className="px-4 py-3 text-right font-mono">{m.latency.toFixed(2)}s</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div>{fmtUSD(m.priceIn)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtINR(m.priceIn)}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div>{fmtUSD(m.priceOut)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {fmtINR(m.priceOut)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmtCtx(m.context)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            m.license === "Open weights"
                              ? "bg-[var(--monsoon)]/15 text-[var(--monsoon)]"
                              : "bg-[var(--indigo-night)]/10 text-[var(--indigo-night)]"
                          }`}
                        >
                          {m.license}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Figures sourced from{" "}
            <a
              href="https://artificialanalysis.ai/models"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              artificialanalysis.ai/models
            </a>{" "}
            (latest pass) and public vendor pricing. INR converted at ₹{USD_TO_INR}/USD. Treat as a
            starting map, not a stopwatch.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl bg-[var(--indigo-night)] p-10 text-center text-[var(--parchment)] shadow-2xl md:p-16">
          <Sparkles className="mx-auto h-6 w-6 text-[var(--saffron)]" />
          <h3 className="mt-4 font-display text-3xl font-medium leading-tight md:text-5xl">
            Pick the right star. Steer with intent.
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--parchment)]/80">
            Members get deeper cuts: India-latency benchmarks, cost-per-outcome breakdowns, and
            build-notes on which model to reach for by task.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ tab: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-6 py-3 text-sm font-semibold text-[var(--indigo-night)] transition hover:bg-[var(--parchment)]"
            >
              Join the Orbit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/soda"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/30 px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--parchment)]/10"
            >
              Explore S.O.D.A ideas
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

/* ------------------------------- little UI ------------------------------- */

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--parchment)]/15 bg-[var(--parchment)]/5 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--saffron)]">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-xl font-medium">{value}</p>
      <p className="text-xs text-[var(--parchment)]/70">{sub}</p>
    </div>
  );
}

function ChartCard({
  icon,
  eyebrow,
  title,
  note,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="flex items-center gap-2 text-[var(--saffron)]">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.24em]">{eyebrow}</p>
      </div>
      <h3 className="mt-2 font-display text-2xl font-light md:text-3xl">{title}</h3>
      <p className="mt-2 text-sm text-foreground/60">{note}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
