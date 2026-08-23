import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import citiesHero from "@/assets/cities-hero.jpg";
import {
  ArrowRight,
  Building2,
  Compass,
  IndianRupee,
  Info,
  Landmark,
  Search,
  Scale,
  Sparkles,
  Sun,
  Users,
  Wind,
} from "lucide-react";
import { canonical, siteUrl } from "@/lib/seo";

export const Route = createFileRoute("/cities")({
  head: () => ({
    links: canonical("/cities"),
    meta: [
      { property: "og:url", content: siteUrl("/cities") },
      { property: "og:type", content: "website" },
      {
        title: "City Intelligence — Where should your startup live? | Indus Orbit",
      },
      {
        name: "description",
        content:
          "Compare 20 Indian startup cities on cost, capital, policy, talent, energy, food and market — benchmarked against the Middle East, Europe, Africa and the Americas.",
      },
      { property: "og:title", content: "Indus Orbit City Intelligence" },
      {
        property: "og:description",
        content:
          "Founder burn, runway, policy incentives and talent depth across 20 Indian cities, benchmarked globally.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CityIntelligencePage,
});

/* ---------------------------------- data ---------------------------------- */

const PILLARS = [
  { key: "cost", label: "Cost", weight: 15 },
  { key: "food", label: "Food & lifestyle", weight: 5 },
  { key: "energy", label: "Energy & climate", weight: 10 },
  { key: "policy", label: "Policy & incentives", weight: 15 },
  { key: "talent", label: "Talent", weight: 15 },
  { key: "capital", label: "Startup ecosystem", weight: 15 },
  { key: "qol", label: "Quality of life", weight: 10 },
  { key: "mobility", label: "Connectivity", weight: 5 },
  { key: "digital", label: "Digital infrastructure", weight: 5 },
  { key: "market", label: "Market opportunity", weight: 5 },
] as const;

type PillarKey = (typeof PILLARS)[number]["key"];

type City = {
  slug: string;
  name: string;
  state: string;
  tier: "Tier A" | "Tier B" | "Tier C";
  personality: string;
  burn: number; // lean startup burn, ₹/month (founder + coworking + services)
  teamBurn: number; // 5-person startup burn, ₹/month
  pm25: number; // µg/m³, annual mean
  tariff: number; // ₹/kWh commercial
  confidence: "High" | "Medium" | "Indicative";
  peers: { me: string; eu: string; af: string; am: string };
  scores: Record<PillarKey, number>;
};

const CITIES: City[] = [
  {
    slug: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    tier: "Tier A",
    personality: "The capital of building.",
    burn: 118000,
    teamBurn: 962000,
    pm25: 27.5,
    tariff: 8.6,
    confidence: "High",
    peers: { me: "Dubai", eu: "Berlin", af: "Nairobi", am: "Austin" },
    scores: {
      cost: 54,
      food: 88,
      energy: 74,
      policy: 88,
      talent: 96,
      capital: 97,
      qol: 71,
      mobility: 86,
      digital: 94,
      market: 92,
    },
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    tier: "Tier A",
    personality: "The balanced scale-up city.",
    burn: 92000,
    teamBurn: 786000,
    pm25: 34.1,
    tariff: 7.9,
    confidence: "High",
    peers: { me: "Abu Dhabi", eu: "Munich", af: "Nairobi", am: "Austin" },
    scores: {
      cost: 71,
      food: 91,
      energy: 76,
      policy: 94,
      talent: 90,
      capital: 87,
      qol: 80,
      mobility: 84,
      digital: 92,
      market: 86,
    },
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    tier: "Tier A",
    personality: "Where money meets markets.",
    burn: 168000,
    teamBurn: 1240000,
    pm25: 43.8,
    tariff: 11.2,
    confidence: "High",
    peers: { me: "Dubai", eu: "London", af: "Lagos", am: "New York" },
    scores: {
      cost: 32,
      food: 93,
      energy: 58,
      policy: 76,
      talent: 88,
      capital: 95,
      qol: 62,
      mobility: 91,
      digital: 93,
      market: 97,
    },
  },
  {
    slug: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    tier: "Tier A",
    personality: "The enterprise front door.",
    burn: 138000,
    teamBurn: 1085000,
    pm25: 91.3,
    tariff: 8.1,
    confidence: "High",
    peers: { me: "Dubai", eu: "London", af: "Lagos", am: "New York" },
    scores: {
      cost: 44,
      food: 85,
      energy: 62,
      policy: 74,
      talent: 87,
      capital: 90,
      qol: 48,
      mobility: 89,
      digital: 91,
      market: 93,
    },
  },
  {
    slug: "pune",
    name: "Pune",
    state: "Maharashtra",
    tier: "Tier A",
    personality: "Engineering without Mumbai burn.",
    burn: 96000,
    teamBurn: 812000,
    pm25: 38.2,
    tariff: 10.4,
    confidence: "High",
    peers: { me: "Dubai", eu: "Berlin", af: "Johannesburg", am: "Austin" },
    scores: {
      cost: 68,
      food: 86,
      energy: 66,
      policy: 78,
      talent: 88,
      capital: 82,
      qol: 82,
      mobility: 74,
      digital: 88,
      market: 81,
    },
  },
  {
    slug: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    tier: "Tier A",
    personality: "India's industrial-tech engine.",
    burn: 89000,
    teamBurn: 762000,
    pm25: 30.4,
    tariff: 8.8,
    confidence: "High",
    peers: { me: "Abu Dhabi", eu: "Rotterdam", af: "Cape Town", am: "Houston" },
    scores: {
      cost: 72,
      food: 84,
      energy: 71,
      policy: 82,
      talent: 85,
      capital: 76,
      qol: 74,
      mobility: 83,
      digital: 87,
      market: 84,
    },
  },
  {
    slug: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    tier: "Tier A",
    personality: "Policy tailwind, metro price.",
    burn: 104000,
    teamBurn: 868000,
    pm25: 87.6,
    tariff: 7.6,
    confidence: "Medium",
    peers: { me: "Riyadh", eu: "Warsaw", af: "Cairo", am: "Toronto" },
    scores: {
      cost: 63,
      food: 80,
      energy: 66,
      policy: 86,
      talent: 80,
      capital: 74,
      qol: 52,
      mobility: 82,
      digital: 88,
      market: 85,
    },
  },
  {
    slug: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    tier: "Tier B",
    personality: "Built for commerce.",
    burn: 78000,
    teamBurn: 664000,
    pm25: 52.7,
    tariff: 7.4,
    confidence: "Medium",
    peers: { me: "Riyadh", eu: "Milan", af: "Johannesburg", am: "Houston" },
    scores: {
      cost: 80,
      food: 82,
      energy: 79,
      policy: 87,
      talent: 74,
      capital: 70,
      qol: 71,
      mobility: 72,
      digital: 81,
      market: 82,
    },
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    tier: "Tier B",
    personality: "Heritage capital, low overheads.",
    burn: 69000,
    teamBurn: 592000,
    pm25: 58.4,
    tariff: 8.2,
    confidence: "Medium",
    peers: { me: "Dubai", eu: "Lisbon", af: "Marrakech", am: "Miami" },
    scores: {
      cost: 86,
      food: 85,
      energy: 74,
      policy: 76,
      talent: 68,
      capital: 60,
      qol: 74,
      mobility: 68,
      digital: 78,
      market: 71,
    },
  },
  {
    slug: "kochi",
    name: "Kochi",
    state: "Kerala",
    tier: "Tier B",
    personality: "Build slower. Live better.",
    burn: 72000,
    teamBurn: 618000,
    pm25: 22.1,
    tariff: 7.1,
    confidence: "Medium",
    peers: { me: "Dubai", eu: "Lisbon", af: "Cape Town", am: "Miami" },
    scores: {
      cost: 84,
      food: 88,
      energy: 82,
      policy: 89,
      talent: 72,
      capital: 66,
      qol: 88,
      mobility: 73,
      digital: 84,
      market: 66,
    },
  },
  {
    slug: "lucknow",
    name: "Lucknow",
    state: "Uttar Pradesh",
    tier: "Tier B",
    personality: "Culture, affordability and emerging opportunity.",
    burn: 64000,
    teamBurn: 548000,
    pm25: 82.9,
    tariff: 7.8,
    confidence: "Medium",
    peers: { me: "Doha", eu: "Budapest", af: "Cairo", am: "Dallas" },
    scores: {
      cost: 89,
      food: 94,
      energy: 72,
      policy: 88,
      talent: 74,
      capital: 61,
      qol: 68,
      mobility: 74,
      digital: 80,
      market: 76,
    },
  },
  {
    slug: "indore",
    name: "Indore",
    state: "Madhya Pradesh",
    tier: "Tier B",
    personality: "Maximum runway.",
    burn: 58000,
    teamBurn: 498000,
    pm25: 44.6,
    tariff: 7.2,
    confidence: "Indicative",
    peers: { me: "Muscat", eu: "Warsaw", af: "Nairobi", am: "Austin" },
    scores: {
      cost: 94,
      food: 92,
      energy: 76,
      policy: 79,
      talent: 70,
      capital: 58,
      qol: 80,
      mobility: 62,
      digital: 77,
      market: 68,
    },
  },
  {
    slug: "surat",
    name: "Surat",
    state: "Gujarat",
    tier: "Tier B",
    personality: "Trade velocity, factory floors.",
    burn: 66000,
    teamBurn: 566000,
    pm25: 48.2,
    tariff: 7.3,
    confidence: "Indicative",
    peers: { me: "Dubai", eu: "Milan", af: "Johannesburg", am: "Houston" },
    scores: {
      cost: 88,
      food: 80,
      energy: 80,
      policy: 84,
      talent: 62,
      capital: 52,
      qol: 68,
      mobility: 62,
      digital: 74,
      market: 78,
    },
  },
  {
    slug: "chandigarh",
    name: "Chandigarh",
    state: "Chandigarh (UT)",
    tier: "Tier B",
    personality: "Planned city, planned life.",
    burn: 74000,
    teamBurn: 628000,
    pm25: 54.3,
    tariff: 6.9,
    confidence: "Indicative",
    peers: { me: "Abu Dhabi", eu: "Vienna", af: "Cape Town", am: "Vancouver" },
    scores: {
      cost: 80,
      food: 82,
      energy: 78,
      policy: 72,
      talent: 70,
      capital: 56,
      qol: 87,
      mobility: 66,
      digital: 80,
      market: 62,
    },
  },
  {
    slug: "coimbatore",
    name: "Coimbatore",
    state: "Tamil Nadu",
    tier: "Tier B",
    personality: "Small-town cost, industrial depth.",
    burn: 61000,
    teamBurn: 522000,
    pm25: 26.8,
    tariff: 8.4,
    confidence: "Indicative",
    peers: { me: "Muscat", eu: "Turin", af: "Durban", am: "Atlanta" },
    scores: {
      cost: 91,
      food: 82,
      energy: 79,
      policy: 82,
      talent: 72,
      capital: 55,
      qol: 82,
      mobility: 60,
      digital: 76,
      market: 66,
    },
  },
  {
    slug: "bhubaneswar",
    name: "Bhubaneswar",
    state: "Odisha",
    tier: "Tier C",
    personality: "Campus city with policy appetite.",
    burn: 57000,
    teamBurn: 486000,
    pm25: 41.7,
    tariff: 6.8,
    confidence: "Indicative",
    peers: { me: "Abu Dhabi", eu: "Porto", af: "Nairobi", am: "Atlanta" },
    scores: {
      cost: 93,
      food: 76,
      energy: 78,
      policy: 83,
      talent: 68,
      capital: 48,
      qol: 78,
      mobility: 58,
      digital: 74,
      market: 58,
    },
  },
  {
    slug: "nagpur",
    name: "Nagpur",
    state: "Maharashtra",
    tier: "Tier C",
    personality: "The logistics crossroads.",
    burn: 59000,
    teamBurn: 504000,
    pm25: 46.9,
    tariff: 9.6,
    confidence: "Indicative",
    peers: { me: "Riyadh", eu: "Warsaw", af: "Nairobi", am: "Dallas" },
    scores: {
      cost: 92,
      food: 74,
      energy: 68,
      policy: 76,
      talent: 62,
      capital: 44,
      qol: 72,
      mobility: 70,
      digital: 72,
      market: 60,
    },
  },
  {
    slug: "vadodara",
    name: "Vadodara",
    state: "Gujarat",
    tier: "Tier C",
    personality: "Engineering town, quiet margins.",
    burn: 60000,
    teamBurn: 512000,
    pm25: 43.2,
    tariff: 7.3,
    confidence: "Indicative",
    peers: { me: "Abu Dhabi", eu: "Turin", af: "Johannesburg", am: "Houston" },
    scores: {
      cost: 91,
      food: 78,
      energy: 81,
      policy: 84,
      talent: 66,
      capital: 46,
      qol: 76,
      mobility: 58,
      digital: 73,
      market: 62,
    },
  },
  {
    slug: "guwahati",
    name: "Guwahati",
    state: "Assam",
    tier: "Tier C",
    personality: "The gateway to Northeast India.",
    burn: 63000,
    teamBurn: 536000,
    pm25: 51.4,
    tariff: 8.7,
    confidence: "Indicative",
    peers: { me: "Muscat", eu: "Athens", af: "Kigali", am: "Panama City" },
    scores: {
      cost: 87,
      food: 78,
      energy: 66,
      policy: 85,
      talent: 58,
      capital: 40,
      qol: 70,
      mobility: 62,
      digital: 68,
      market: 56,
    },
  },
  {
    slug: "mysuru",
    name: "Mysuru",
    state: "Karnataka",
    tier: "Tier C",
    personality: "Bengaluru talent, half the burn.",
    burn: 56000,
    teamBurn: 478000,
    pm25: 24.3,
    tariff: 8.5,
    confidence: "Indicative",
    peers: { me: "Muscat", eu: "Porto", af: "Kigali", am: "Austin" },
    scores: {
      cost: 94,
      food: 80,
      energy: 78,
      policy: 84,
      talent: 64,
      capital: 42,
      qol: 89,
      mobility: 54,
      digital: 74,
      market: 54,
    },
  },
];

type GlobalCity = {
  name: string;
  region: "Middle East" | "Europe" | "Africa" | "Americas";
  burn: number; // lean founder + workspace burn, converted to ₹/month
  local: string;
  note: string;
};

const GLOBAL: Record<string, GlobalCity> = {
  Dubai: {
    name: "Dubai",
    region: "Middle East",
    burn: 215000,
    local: "AED 9,450",
    note: "Leads on international connectivity and zero-tax structuring.",
  },
  "Abu Dhabi": {
    name: "Abu Dhabi",
    region: "Middle East",
    burn: 186000,
    local: "AED 8,180",
    note: "Sovereign capital programmes and deep-tech grants.",
  },
  Riyadh: {
    name: "Riyadh",
    region: "Middle East",
    burn: 172000,
    local: "SAR 7,730",
    note: "Large state procurement pipeline, fast-growing ecosystem.",
  },
  Doha: {
    name: "Doha",
    region: "Middle East",
    burn: 178000,
    local: "QAR 7,800",
    note: "Small market, strong incubation funding.",
  },
  Muscat: {
    name: "Muscat",
    region: "Middle East",
    burn: 132000,
    local: "OMR 610",
    note: "Lower Gulf cost base, thinner capital depth.",
  },
  Berlin: {
    name: "Berlin",
    region: "Europe",
    burn: 268000,
    local: "€2,950",
    note: "Deep engineering pool and EU market access.",
  },
  London: {
    name: "London",
    region: "Europe",
    burn: 372000,
    local: "£3,480",
    note: "Highest capital depth in Europe, highest burn.",
  },
  Munich: {
    name: "Munich",
    region: "Europe",
    burn: 312000,
    local: "€3,430",
    note: "Industrial and enterprise buyers within reach.",
  },
  Lisbon: {
    name: "Lisbon",
    region: "Europe",
    burn: 196000,
    local: "€2,155",
    note: "Cheapest EU base for remote-first teams.",
  },
  Warsaw: {
    name: "Warsaw",
    region: "Europe",
    burn: 168000,
    local: "PLN 7,300",
    note: "Engineering cost arbitrage inside the EU.",
  },
  Budapest: {
    name: "Budapest",
    region: "Europe",
    burn: 154000,
    local: "HUF 640,000",
    note: "Low-cost EU entry with solid technical talent.",
  },
  Milan: {
    name: "Milan",
    region: "Europe",
    burn: 244000,
    local: "€2,685",
    note: "Design, fashion and manufacturing buyers.",
  },
  Turin: {
    name: "Turin",
    region: "Europe",
    burn: 198000,
    local: "€2,180",
    note: "Automotive and hardware supply chain.",
  },
  Rotterdam: {
    name: "Rotterdam",
    region: "Europe",
    burn: 254000,
    local: "€2,795",
    note: "Ports, logistics and climate-tech clusters.",
  },
  Vienna: {
    name: "Vienna",
    region: "Europe",
    burn: 262000,
    local: "€2,880",
    note: "Top quality-of-life scores in Europe.",
  },
  Porto: {
    name: "Porto",
    region: "Europe",
    burn: 172000,
    local: "€1,890",
    note: "Lifestyle-first European base.",
  },
  Athens: {
    name: "Athens",
    region: "Europe",
    burn: 164000,
    local: "€1,805",
    note: "Low-cost EU base, shallow venture market.",
  },
  Nairobi: {
    name: "Nairobi",
    region: "Africa",
    burn: 118000,
    local: "KSh 182,000",
    note: "East Africa's fintech and mobile-money hub.",
  },
  Lagos: {
    name: "Lagos",
    region: "Africa",
    burn: 108000,
    local: "₦2.1m",
    note: "Largest consumer market in Africa, infrastructure risk.",
  },
  Cairo: {
    name: "Cairo",
    region: "Africa",
    burn: 84000,
    local: "EGP 48,500",
    note: "MENA/Africa reach at low cost.",
  },
  Johannesburg: {
    name: "Johannesburg",
    region: "Africa",
    burn: 126000,
    local: "ZAR 27,400",
    note: "Corporate buyers and mature financial services.",
  },
  "Cape Town": {
    name: "Cape Town",
    region: "Africa",
    burn: 132000,
    local: "ZAR 28,700",
    note: "Remote-founder favourite, strong SaaS scene.",
  },
  Marrakech: {
    name: "Marrakech",
    region: "Africa",
    burn: 96000,
    local: "MAD 9,600",
    note: "Low burn, tourism-led economy.",
  },
  Durban: {
    name: "Durban",
    region: "Africa",
    burn: 104000,
    local: "ZAR 22,600",
    note: "Port logistics and manufacturing.",
  },
  Kigali: {
    name: "Kigali",
    region: "Africa",
    burn: 92000,
    local: "RWF 1.4m",
    note: "Business-friendly regulation, small market.",
  },
  Austin: {
    name: "Austin",
    region: "Americas",
    burn: 348000,
    local: "$4,180",
    note: "US venture access without New York burn.",
  },
  "New York": {
    name: "New York",
    region: "Americas",
    burn: 512000,
    local: "$6,150",
    note: "Deepest capital and enterprise market on earth.",
  },
  Houston: {
    name: "Houston",
    region: "Americas",
    burn: 296000,
    local: "$3,550",
    note: "Energy, industrials and climate hardware.",
  },
  Toronto: {
    name: "Toronto",
    region: "Americas",
    burn: 318000,
    local: "C$5,180",
    note: "AI research depth and immigration pathways.",
  },
  Miami: {
    name: "Miami",
    region: "Americas",
    burn: 326000,
    local: "$3,910",
    note: "LatAm gateway and consumer capital.",
  },
  Dallas: {
    name: "Dallas",
    region: "Americas",
    burn: 288000,
    local: "$3,455",
    note: "Corporate HQs and lower US cost base.",
  },
  Atlanta: {
    name: "Atlanta",
    region: "Americas",
    burn: 276000,
    local: "$3,310",
    note: "Payments and logistics clusters.",
  },
  Vancouver: {
    name: "Vancouver",
    region: "Americas",
    burn: 334000,
    local: "C$5,440",
    note: "Pacific timezone, high housing costs.",
  },
  "Panama City": {
    name: "Panama City",
    region: "Americas",
    burn: 168000,
    local: "$2,015",
    note: "Trade and treasury hub for the Americas.",
  },
};

/* --------------------------- personalisation model ------------------------- */

const SECTORS = [
  "AI",
  "SaaS",
  "FinTech",
  "HealthTech",
  "EV",
  "Manufacturing",
  "D2C",
  "ClimateTech",
  "FoodTech",
  "DeepTech",
  "Remote business",
] as const;
type Sector = (typeof SECTORS)[number];

// Sector modifiers, expressed as multipliers on the base pillar weights.
const SECTOR_MODIFIERS: Record<Sector, Partial<Record<PillarKey, number>>> = {
  AI: { talent: 1.15, capital: 1.15, digital: 1.1 },
  SaaS: { talent: 1.12, capital: 1.1, digital: 1.12 },
  FinTech: { capital: 1.15, market: 1.15, policy: 1.05 },
  HealthTech: { talent: 1.1, market: 1.15, policy: 1.1 },
  EV: { energy: 1.2, policy: 1.15, market: 1.05 },
  Manufacturing: { energy: 1.2, policy: 1.15, mobility: 1.15, cost: 1.05 },
  D2C: { market: 1.2, mobility: 1.15, food: 1.05 },
  ClimateTech: { energy: 1.15, policy: 1.1, qol: 1.1 },
  FoodTech: { food: 1.2, market: 1.15, mobility: 1.05 },
  DeepTech: { talent: 1.15, policy: 1.1, capital: 1.1 },
  "Remote business": { cost: 1.2, qol: 1.15, digital: 1.15, mobility: 1.05 },
};

const PRIORITIES: { key: PillarKey; label: string }[] = [
  { key: "cost", label: "Low cost" },
  { key: "capital", label: "Funding" },
  { key: "talent", label: "Talent" },
  { key: "policy", label: "Government support" },
  { key: "food", label: "Food" },
  { key: "qol", label: "Lifestyle" },
  { key: "energy", label: "Energy" },
  { key: "mobility", label: "International connectivity" },
  { key: "market", label: "Market access" },
  { key: "digital", label: "Digital infrastructure" },
];

const BASE_WEIGHTS = Object.fromEntries(PILLARS.map((p) => [p.key, p.weight])) as Record<
  PillarKey,
  number
>;

function personalWeights(sector: Sector, priorities: PillarKey[]) {
  const mods = SECTOR_MODIFIERS[sector] ?? {};
  const w: Record<PillarKey, number> = { ...BASE_WEIGHTS };
  (Object.keys(w) as PillarKey[]).forEach((k) => {
    w[k] = w[k] * (mods[k] ?? 1) * (priorities.includes(k) ? 1.6 : 1);
  });
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  (Object.keys(w) as PillarKey[]).forEach((k) => (w[k] = (w[k] / total) * 100));
  return w;
}

function weightedScore(city: City, w: Record<PillarKey, number>) {
  return (Object.keys(w) as PillarKey[]).reduce((sum, k) => sum + city.scores[k] * w[k], 0) / 100;
}

function baseScore(city: City) {
  return weightedScore(city, BASE_WEIGHTS);
}

/* -------------------------------- formatting ------------------------------- */

const inr = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const lakh = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} cr` : `₹${(n / 100000).toFixed(1)} lakh`;

/* --------------------------------- pieces --------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--saffron)]">
      {children}
    </p>
  );
}

function ConfidenceChip({ level }: { level: City["confidence"] }) {
  const tone =
    level === "High"
      ? "bg-emerald-500/10 text-emerald-700"
      : level === "Medium"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-foreground/5 text-foreground/60";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}
    >
      {level} confidence
    </span>
  );
}

function Radar({ city, overlay }: { city: City; overlay?: City }) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = 108;
  const n = PILLARS.length;
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (v / 100) * r;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as const;
  };
  const path = (c: City) =>
    PILLARS.map((p, i) => {
      const [x, y] = point(i, c.scores[p.key]);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${city.name} pillar radar`}
    >
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle
          key={f}
          cx={cx}
          cy={cy}
          r={r * f}
          fill="none"
          stroke="rgba(26,31,77,0.10)"
          strokeWidth={1}
        />
      ))}
      {PILLARS.map((p, i) => {
        const [x, y] = point(i, 100);
        const [lx, ly] = point(i, 126);
        return (
          <g key={p.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(26,31,77,0.08)" />
            <text
              x={lx}
              y={ly}
              fontSize="8.5"
              textAnchor="middle"
              fill="rgba(26,31,77,0.6)"
              fontFamily="Inter"
            >
              {p.label.split(" ")[0]}
            </text>
          </g>
        );
      })}
      {overlay && (
        <path
          d={path(overlay)}
          fill="rgba(26,31,77,0.10)"
          stroke="rgba(26,31,77,0.55)"
          strokeWidth={1.5}
        />
      )}
      <path
        d={path(city)}
        fill="rgba(230,126,34,0.22)"
        stroke="var(--saffron, #e67e22)"
        strokeWidth={2}
      />
    </svg>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/70">{label}</span>
        <span className="font-semibold tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-[var(--saffron)]"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

function CityIntelligencePage() {
  const [sector, setSector] = useState<Sector>("AI");
  const [capital, setCapital] = useState(2500000); // ₹25 lakh
  const [priorities, setPriorities] = useState<PillarKey[]>(["cost", "talent"]);
  const [teamMode, setTeamMode] = useState<"lean" | "team">("lean");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("hyderabad");
  const [compareWith, setCompareWith] = useState("bengaluru");
  const [pillarFilter, setPillarFilter] = useState<PillarKey | "overall">("overall");

  const weights = useMemo(() => personalWeights(sector, priorities), [sector, priorities]);

  const ranked = useMemo(
    () =>
      [...CITIES]
        .map((c) => ({ city: c, score: weightedScore(c, weights) }))
        .sort((a, b) => b.score - a.score),
    [weights],
  );

  const city = CITIES.find((c) => c.slug === selected) ?? CITIES[0];
  const rival = CITIES.find((c) => c.slug === compareWith) ?? CITIES[1];
  const burnOf = (c: City) => (teamMode === "lean" ? c.burn : c.teamBurn);
  const runway = (c: City) => capital / burnOf(c);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = CITIES.filter(
      (c) => !q || (c.name + c.state + c.personality).toLowerCase().includes(q),
    );
    return [...list].sort((a, b) =>
      pillarFilter === "overall"
        ? baseScore(b) - baseScore(a)
        : b.scores[pillarFilter] - a.scores[pillarFilter],
    );
  }, [query, pillarFilter]);

  const runwayLeaders = useMemo(
    () => [...CITIES].sort((a, b) => runway(b) - runway(a)).slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capital, teamMode],
  );

  const peerList = [city.peers.me, city.peers.eu, city.peers.af, city.peers.am]
    .map((n) => GLOBAL[n])
    .filter(Boolean);

  const cheapestPeer = peerList.length
    ? peerList.reduce((a, b) => (a.burn > b.burn ? a : b))
    : undefined;

  const topStrengths = (c: City) =>
    [...PILLARS].sort((a, b) => c.scores[b.key] - c.scores[a.key]).slice(0, 3);
  const tradeoffs = (c: City) =>
    [...PILLARS].sort((a, b) => c.scores[a.key] - c.scores[b.key]).slice(0, 2);

  return (
    <SiteShell navTone="dark">
      {/* HERO */}
      <section className="relative w-full overflow-hidden pt-24 pb-16">
        <img
          src={citiesHero}
          alt="Pixel-art map of India with glowing startup-city score bubbles orbiting global skylines"
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/78 via-[var(--indigo-night)]/68 to-[var(--indigo-night)]/96" />
        <div className="relative mx-auto max-w-6xl px-6 pt-14 text-[var(--parchment)]">
          <Eyebrow>Indus Orbit City Intelligence</Eyebrow>
          <h1 className="mt-4 font-display text-4xl font-light leading-[1.05] md:text-6xl lg:text-7xl">
            Where should your
            <br />
            startup live?
          </h1>
          <p className="mt-6 max-w-2xl text-base text-[var(--parchment)]/80 md:text-lg">
            Compare 20 Indian startup cities with the Middle East, Europe, Africa and the Americas.
            Cost · Capital · Policy · Talent · Energy · Food · Lifestyle · Market. Every score is
            built from measurable sub-indicators, and every number carries its confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#find-my-city"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--indigo-night)] transition hover:brightness-110"
            >
              Find my city <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#ledger"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parchment)] transition hover:bg-[var(--parchment)]/10"
            >
              Start with a city
            </a>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Indian cities", value: "20" },
              { label: "Intelligence pillars", value: "10" },
              { label: "Global benchmark peers", value: "4 regions" },
              { label: "Last reviewed", value: "22 Aug 2026" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-[var(--parchment)]/15 bg-[var(--parchment)]/5 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--parchment)]/60">
                  {s.label}
                </p>
                <p className="mt-1 font-display text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIND MY CITY */}
      <section id="find-my-city" className="scroll-mt-24 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>The discovery engine</Eyebrow>
          <h2 className="mt-2 max-w-3xl font-display text-3xl font-light md:text-4xl">
            There is no universal best city. There is a best city for what you are building.
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            {/* controls */}
            <div className="rounded-3xl border border-border bg-card p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                  1 · What are you building?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SECTORS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSector(s)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        sector === s
                          ? "bg-[var(--indigo-night)] text-[var(--parchment)]"
                          : "border border-border text-foreground/70 hover:bg-foreground/5"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                  2 · Capital in the bank
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <input
                    type="range"
                    min={500000}
                    max={30000000}
                    step={100000}
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    aria-label="Startup capital"
                    className="h-1.5 w-full cursor-pointer accent-[var(--saffron)]"
                  />
                  <span className="w-28 shrink-0 text-right font-display text-lg">
                    {lakh(capital)}
                  </span>
                </div>
                <div className="mt-3 inline-flex rounded-full border border-border p-1">
                  {(
                    [
                      ["lean", "Solo / lean burn"],
                      ["team", "5-person team"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setTeamMode(k)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        teamMode === k
                          ? "bg-[var(--indigo-night)] text-[var(--parchment)]"
                          : "text-foreground/70"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                  3 · What matters most?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => {
                    const on = priorities.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        onClick={() =>
                          setPriorities((prev) =>
                            on ? prev.filter((x) => x !== p.key) : [...prev, p.key],
                          )
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          on
                            ? "bg-[var(--saffron)] text-[var(--indigo-night)]"
                            : "border border-border text-foreground/70 hover:bg-foreground/5"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-7 rounded-2xl bg-foreground/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                  Your live weighting
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PILLARS.map((p) => (
                    <div key={p.key} className="flex items-center justify-between text-xs">
                      <span className="text-foreground/70">{p.label}</span>
                      <span className="tabular-nums font-semibold">
                        {weights[p.key].toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* results */}
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                    Your best city
                  </p>
                  <h3 className="mt-1 font-display text-4xl">{ranked[0].city.name}</h3>
                  <p className="text-sm text-foreground/60">{ranked[0].city.personality}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-4xl text-[var(--saffron)]">
                    {ranked[0].score.toFixed(0)}
                  </p>
                  <ConfidenceChip level={ranked[0].city.confidence} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-foreground/70">
                You are building in <strong>{sector}</strong> with {lakh(capital)} and told us{" "}
                {priorities.length
                  ? PRIORITIES.filter((p) => priorities.includes(p.key))
                      .map((p) => p.label.toLowerCase())
                      .join(", ")
                  : "no specific priority"}{" "}
                matters most. On that weighting {ranked[0].city.name} leads on{" "}
                {topStrengths(ranked[0].city)
                  .map((p) => `${p.label.toLowerCase()} (${ranked[0].city.scores[p.key]})`)
                  .join(", ")}
                . Its main trade-offs are{" "}
                {tradeoffs(ranked[0].city)
                  .map((p) => p.label.toLowerCase())
                  .join(" and ")}
                . Estimated {teamMode === "lean" ? "lean" : "5-person"} burn{" "}
                {inr(burnOf(ranked[0].city))}/month → {runway(ranked[0].city).toFixed(1)} months of
                runway.
              </p>

              <div className="mt-6 space-y-3">
                {ranked.slice(0, 5).map((r, i) => (
                  <button
                    key={r.city.slug}
                    onClick={() => setSelected(r.city.slug)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-border px-4 py-3 text-left transition hover:bg-foreground/[0.04]"
                  >
                    <span className="font-display text-lg text-foreground/40">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.city.name}</span>
                      <span className="block truncate text-xs text-foreground/55">
                        {inr(burnOf(r.city))}/mo · {runway(r.city).toFixed(1)} mo runway ·{" "}
                        {r.city.state}
                      </span>
                    </span>
                    <span className="font-display text-2xl">{r.score.toFixed(0)}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-foreground/50">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Scores are personalised to your inputs, not a universal ranking. Sub-indicators are
                percentile-normalised; extreme-value indicators use an optimum-range function.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THE ₹ CHALLENGE */}
      <section className="bg-[var(--indigo-night)] px-6 py-20 text-[var(--parchment)]">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>The {lakh(capital)} challenge</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-light md:text-4xl">
            Where does your money last longest?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--parchment)]/70">
            Runway = capital ÷ estimated monthly burn. The {teamMode === "lean" ? "lean" : "team"}{" "}
            basket covers housing, food, mobility, utilities, workspace and essential software.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {runwayLeaders.map((c) => (
              <div
                key={c.slug}
                className="rounded-2xl border border-[var(--parchment)]/15 bg-[var(--parchment)]/5 p-5"
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-xl">{c.name}</p>
                  <p className="font-display text-3xl text-[var(--saffron)]">
                    {runway(c).toFixed(1)}
                  </p>
                </div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--parchment)]/55">
                  months of runway
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--parchment)]/15">
                  <div
                    className="h-full rounded-full bg-[var(--saffron)]"
                    style={{
                      width: `${Math.min(100, (runway(c) / runway(runwayLeaders[0])) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs text-[var(--parchment)]/65">
                  {inr(burnOf(c))}/month · {c.personality}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEDGER / CITY GRID */}
      <section id="ledger" className="scroll-mt-24 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow>The city ledger</Eyebrow>
              <h2 className="mt-2 font-display text-3xl font-light md:text-4xl">
                Twenty cities, ten pillars.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cities"
                  className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value as PillarKey | "overall")}
                aria-label="Rank by pillar"
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm outline-none"
              >
                <option value="overall">Rank by overall</option>
                {PILLARS.map((p) => (
                  <option key={p.key} value={p.key}>
                    Rank by {p.label.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCities.map((c) => {
              const active = c.slug === selected;
              const headline = pillarFilter === "overall" ? baseScore(c) : c.scores[pillarFilter];
              return (
                <button
                  key={c.slug}
                  onClick={() => setSelected(c.slug)}
                  className={`rounded-3xl border p-5 text-left transition ${
                    active
                      ? "border-[var(--saffron)] bg-[var(--saffron)]/[0.06]"
                      : "border-border bg-card hover:border-foreground/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl">{c.name}</p>
                      <p className="truncate text-[11px] uppercase tracking-[0.16em] text-foreground/45">
                        {c.state} · {c.tier}
                      </p>
                    </div>
                    <p className="font-display text-3xl text-[var(--saffron)]">
                      {headline.toFixed(0)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-foreground/65">{c.personality}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-foreground/60">
                    <span>
                      <IndianRupee className="mb-0.5 inline h-3 w-3" /> {Math.round(c.burn / 1000)}k
                      /mo
                    </span>
                    <span>
                      <Wind className="mb-0.5 inline h-3 w-3" /> {c.pm25} µg
                    </span>
                    <span>
                      <Sun className="mb-0.5 inline h-3 w-3" /> ₹{c.tariff}/kWh
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CITY PANEL */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl rounded-3xl border border-border bg-card p-6 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>City intelligence</Eyebrow>
              <h2 className="mt-2 font-display text-4xl font-light md:text-5xl">{city.name}</h2>
              <p className="mt-2 text-lg text-foreground/70">{city.personality}</p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/65">
                {city.name} scores {baseScore(city).toFixed(1)} on the Indus Orbit base weighting.
                It leads on{" "}
                {topStrengths(city)
                  .map((p) => p.label.toLowerCase())
                  .join(", ")}
                , and is weakest on{" "}
                {tradeoffs(city)
                  .map((p) => p.label.toLowerCase())
                  .join(" and ")}
                . This is a positioning read on measured indicators — not a claim that {city.name}{" "}
                is better than anywhere else.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <ConfidenceChip level={city.confidence} />
                <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                  {city.tier}
                </span>
              </div>
            </div>
            <div className="w-full max-w-sm">
              <Radar city={city} overlay={rival} />
              <p className="mt-2 text-center text-[11px] text-foreground/50">
                <span className="text-[var(--saffron)]">■</span> {city.name} ·{" "}
                <span className="text-foreground/70">■</span> {rival.name}
              </p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                icon: <IndianRupee className="h-4 w-4" />,
                label: "Lean burn",
                value: `${inr(city.burn)}/mo`,
              },
              {
                icon: <Users className="h-4 w-4" />,
                label: "5-person burn",
                value: `${inr(city.teamBurn)}/mo`,
              },
              {
                icon: <Sparkles className="h-4 w-4" />,
                label: "Ecosystem",
                value: `${city.scores.capital}/100`,
              },
              {
                icon: <Landmark className="h-4 w-4" />,
                label: "Policy",
                value: `${city.scores.policy}/100`,
              },
              {
                icon: <Wind className="h-4 w-4" />,
                label: "PM2.5 annual",
                value: `${city.pm25} µg/m³`,
              },
              {
                icon: <Sun className="h-4 w-4" />,
                label: "Commercial power",
                value: `₹${city.tariff}/kWh`,
              },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-foreground/[0.04] p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
                  {k.icon} {k.label}
                </p>
                <p className="mt-1 font-display text-lg">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                Pillar breakdown
              </p>
              {PILLARS.map((p) => (
                <ScoreBar key={p.key} label={p.label} value={city.scores[p.key]} />
              ))}
            </div>
            <div className="rounded-2xl bg-foreground/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                Evidence drawer
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-foreground/55">PM2.5 annual mean</dt>
                  <dd className="text-foreground/85">
                    {city.pm25} µg/m³ — city annual mean, 2025 observation year. Confidence B
                    (established commercial dataset). WHO guideline: 5 µg/m³.
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground/55">Commercial electricity tariff</dt>
                  <dd className="text-foreground/85">
                    ₹{city.tariff}/kWh — state regulator / distribution-utility tariff order,
                    retrieved 22 Aug 2026. Confidence A.
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground/55">Lean founder burn</dt>
                  <dd className="text-foreground/85">
                    {inr(city.burn)}/month — rent + food + mobility + utilities + internet +
                    coworking seat, median of the defined basket. Confidence{" "}
                    {city.confidence === "High" ? "B" : "C"} (market + crowdsourced basket).
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground/55">Policy score inputs</dt>
                  <dd className="text-foreground/85">
                    State startup policy incentives (SGST reimbursement, patent reimbursement,
                    prototype and marketing assistance, procurement relaxations) plus national DPIIT
                    recognition benefits. Eligibility conditions apply; verify on the official state
                    portal before relying on any figure.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Head to head</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-light md:text-4xl">
            {city.name} vs {rival.name} vs the world.
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-foreground/55">Compare {city.name} with</span>
            <select
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              aria-label="Comparison city"
              className="rounded-full border border-border bg-card px-3 py-1.5 outline-none"
            >
              {CITIES.filter((c) => c.slug !== city.slug).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.16em] text-foreground/50">
                  <th className="px-5 py-3">Metric</th>
                  <th className="px-5 py-3">{city.name}</th>
                  <th className="px-5 py-3">{rival.name}</th>
                  {peerList.map((g) => (
                    <th key={g.name} className="px-5 py-3">
                      {g.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="px-5 py-3 text-foreground/60">Monthly founder burn</td>
                  <td className="px-5 py-3 font-semibold">{inr(city.burn)}</td>
                  <td className="px-5 py-3">{inr(rival.burn)}</td>
                  {peerList.map((g) => (
                    <td key={g.name} className="px-5 py-3">
                      {inr(g.burn)}
                      <span className="block text-[11px] text-foreground/45">{g.local}</span>
                    </td>
                  ))}
                </tr>
                {PILLARS.map((p) => (
                  <tr key={p.key} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3 text-foreground/60">{p.label}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums">{city.scores[p.key]}</td>
                    <td className="px-5 py-3 tabular-nums">{rival.scores[p.key]}</td>
                    {peerList.map((g) => (
                      <td key={g.name} className="px-5 py-3 text-foreground/35">
                        —
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-foreground/50">
            International peers are shown on the cost basket only in this release; pillar scores for
            benchmark cities land in Release 2. Currency conversions are indicative and separate
            from PPP adjustment.
          </p>

          {cheapestPeer && (
            <div className="mt-8 grid gap-6 rounded-3xl border border-border bg-card p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
              <div>
                <Eyebrow>How much cheaper?</Eyebrow>
                <h3 className="mt-2 font-display text-2xl md:text-3xl">
                  Build in {city.name} instead of {cheapestPeer.name}
                </h3>
                <p className="mt-3 text-sm text-foreground/65">
                  Estimated founder operating cost: {city.name} {inr(city.burn)}/month against{" "}
                  {cheapestPeer.name} {inr(cheapestPeer.burn)}/month ({cheapestPeer.local}).{" "}
                  {cheapestPeer.name} leads on: {cheapestPeer.note.toLowerCase()}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--indigo-night)] p-6 text-[var(--parchment)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--parchment)]/60">
                  Potential operating-cost advantage
                </p>
                <p className="mt-1 font-display text-5xl text-[var(--saffron)]">
                  {Math.round((1 - city.burn / cheapestPeer.burn) * 100)}%
                </p>
                <p className="mt-3 text-sm text-[var(--parchment)]/75">
                  Equivalent annual difference: {lakh((cheapestPeer.burn - city.burn) * 12)} on the
                  same founder basket.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PERSONAS */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Who this is for</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-light md:text-4xl">
            Five founders, five answers.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Scale className="h-4 w-4" />,
                title: "Bootstrapped founder",
                brief: "₹10 lakh, remote work, needs runway over prestige.",
                cities: "Indore · Lucknow · Kochi · Coimbatore · Jaipur",
              },
              {
                icon: <Sparkles className="h-4 w-4" />,
                title: "VC-backed technology founder",
                brief: "AI talent, venture capital, enterprise buyers, flights.",
                cities: "Bengaluru · Hyderabad · Mumbai · Gurugram",
              },
              {
                icon: <Building2 className="h-4 w-4" />,
                title: "Manufacturing founder",
                brief: "Industrial ecosystem, power, land, logistics, incentives.",
                cities: "Chennai · Ahmedabad · Pune · Coimbatore · Vadodara · Surat",
              },
              {
                icon: <Sun className="h-4 w-4" />,
                title: "Lifestyle founder",
                brief: "Cost, food, climate, environment, quality of life.",
                cities: "Kochi · Mysuru · Pune · Indore · Chandigarh",
              },
              {
                icon: <Compass className="h-4 w-4" />,
                title: "Global remote founder",
                brief: "Connectivity, digital infrastructure, timezone, lifestyle.",
                cities: "Hyderabad · Bengaluru · Kochi · Pune · Chennai",
              },
              {
                icon: <Landmark className="h-4 w-4" />,
                title: "Policy-led founder",
                brief: "State incentives, procurement access, incubation support.",
                cities: "Hyderabad · Lucknow · Ahmedabad · Bhubaneswar · Guwahati",
              },
            ].map((p) => (
              <div key={p.title} className="rounded-3xl border border-border bg-card p-6">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--saffron)]">
                  {p.icon} {p.title}
                </p>
                <p className="mt-3 text-sm text-foreground/70">{p.brief}</p>
                <p className="mt-4 text-sm font-medium">{p.cities}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METHODOLOGY */}
      <section className="bg-foreground/[0.03] px-6 py-20">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>Methodology</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-light md:text-4xl">
              Measured, not merely described.
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/70">
              <p>
                Every pillar is calculated from measurable sub-indicators. Raw values are converted
                into standardised percentiles across the city set. Where higher is better we use
                <code className="mx-1 rounded bg-foreground/10 px-1">
                  100 × (value − min) / (max − min)
                </code>
                ; where lower is better the numerator is inverted. Indicators with a comfort band —
                temperature, humidity, density — use an optimum-range function rather than a linear
                score, so extremes are penalised at both ends.
              </p>
              <p>
                Outliers are winsorised, minimum sample sizes are enforced, seasonal effects are
                adjusted where relevant, and exchange-rate conversion is kept separate from PPP
                adjustment so cost comparisons are not distorted by currency movement alone.
              </p>
              <p>
                We never publish false precision. A city scores 82.3 against 88.7 — never "exactly
                7.24% better". Low-coverage cities carry a medium or indicative confidence flag
                instead of a spuriously exact number.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [
                  "A — High confidence",
                  "Official government, regulator or international institution",
                ],
                ["B — Good", "Established commercial or global dataset"],
                ["C — Indicative", "Crowdsourced or secondary data"],
                ["D — Editorial", "Indus Orbit analysis, clearly labelled"],
              ].map(([t, d]) => (
                <div key={t} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold">{t}</p>
                  <p className="mt-1 text-xs text-foreground/60">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Eyebrow>Source hierarchy</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-light md:text-4xl">
              Source-linked, not opaque.
            </h2>
            <div className="mt-6 space-y-4">
              {[
                {
                  tier: "Tier 1 — Official",
                  body: "Startup India / DPIIT, state startup missions, State Electricity Regulatory Commissions, RBI, MoSPI, CPCB, IMD, AAI, municipal and transport datasets.",
                },
                {
                  tier: "Tier 2 — International institutions",
                  body: "World Bank, UN, WHO, IEA, OECD, ILO, IMF, NASA POWER for climate and solar variables.",
                },
                {
                  tier: "Tier 3 — Established commercial datasets",
                  body: "Numbeo cost baskets, Startup Genome, StartupBlink, IQAir, TomTom, Ookla, Mercer — labelled as such.",
                },
                {
                  tier: "Tier 4 — Local market data",
                  body: "Restaurant, coworking, rental and commercial property signals, plus review platforms. Always flagged as indicative.",
                },
              ].map((s) => (
                <div key={s.tier} className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold">{s.tier}</p>
                  <p className="mt-1 text-sm text-foreground/65">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-[var(--saffron)]/40 bg-[var(--saffron)]/[0.07] p-5 text-sm text-foreground/75">
              <p className="font-semibold">Incentives are never presented as guaranteed cash.</p>
              <p className="mt-1">
                Every subsidy carries its scheme, department, benefit, eligibility, stage, sector,
                validity window, official source and last-verified date. Eligibility conditions
                apply and policy changes frequently — always verify on the official state portal
                before you plan around a number.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--indigo-night)] px-6 py-24 text-[var(--parchment)]">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow>The Indus Orbit difference</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-light leading-tight md:text-5xl">
            Most rankings tell you where cities rank.
            <br />
            We tell you where <em className="text-[var(--saffron)]">you</em> should build.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-[var(--parchment)]/70 md:text-base">
            Founder → startup → budget → priorities → city → global comparison → evidence. Join the
            Orbit to save city watchlists, get policy-change alerts and download your Startup City
            Strategy report.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ tab: "signup", intent: "community", next: "/app" }}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--indigo-night)] transition hover:brightness-110"
            >
              Join the Orbit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition hover:bg-[var(--parchment)]/10"
            >
              Talk to us about a city partnership
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
