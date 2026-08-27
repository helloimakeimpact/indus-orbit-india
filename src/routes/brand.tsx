import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { canonical, siteUrl } from "@/lib/seo";
import logo from "@/assets/indus-orbit-logo.png";
import brandHero from "@/assets/brand-hero.jpg";
import merchMug from "@/assets/merch-mug.jpg";
import merchTshirt from "@/assets/merch-tshirt.jpg";
import merchHoodie from "@/assets/merch-hoodie.jpg";
import merchKit from "@/assets/merch-kit.jpg";
import { Download, Mail, MapPin, Phone, Palette, Type, Sparkles, Shirt } from "lucide-react";

export const Route = createFileRoute("/brand")({
  head: () => ({
    links: canonical("/brand"),
    meta: [
      { title: "Brand — Indus Orbit identity, assets and visiting card" },
      {
        name: "description",
        content:
          "The Indus Orbit brand system: logo lockups, indigo-night and saffron palette, Fraunces + Inter typography, pixel-art art direction and the official visiting card.",
      },
      { property: "og:title", content: "Indus Orbit — Brand" },
      {
        property: "og:description",
        content:
          "Logo, palette, typography, art direction and the official Indus Orbit visiting card.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: siteUrl("/brand") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandPage,
});

const CARD = {
  name: "Amar Pandey",
  title: "CEO",
  org: "indusorbit.com",
  city: "Paris",
  phone: "+33766550190",
  email: "office@indusorbit.com",
  url: "https://indusorbit.com",
};

const palette = [
  { name: "Indigo Night", token: "--indigo-night", use: "Primary surface, type on light" },
  { name: "Saffron", token: "--saffron", use: "Accent, highlights, CTA hover" },
  { name: "Parchment", token: "--parchment", use: "Type on dark, warm paper base" },
  { name: "Card", token: "--card", use: "Panels, ledgers, evidence drawers" },
  { name: "Border", token: "--border", use: "Hairlines, dividers, chips" },
];

function vcard() {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:Pandey;Amar;;;`,
    `FN:${CARD.name}`,
    `ORG:${CARD.org}`,
    `TITLE:${CARD.title}`,
    `TEL;TYPE=CELL:${CARD.phone}`,
    `EMAIL;TYPE=WORK:${CARD.email}`,
    `ADR;TYPE=WORK:;;;${CARD.city};;;France`,
    "END:VCARD",
  ].join("\r\n");
}

function downloadVcard() {
  const blob = new Blob([vcard()], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "amar-pandey.vcf";
  a.click();
  URL.revokeObjectURL(url);
}

function Swatch({ name, token, use }: { name: string; token: string; use: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div
        className="h-20 w-full rounded-2xl border border-border"
        style={{ background: `var(${token})` }}
      />
      <p className="mt-4 font-display text-lg">{name}</p>
      <p className="font-mono text-[11px] uppercase tracking-wider text-foreground/50">
        var({token})
      </p>
      <p className="mt-2 text-xs text-foreground/70">{use}</p>
    </div>
  );
}

function VisitingCardFront() {
  return (
    <div className="aspect-[1.75/1] w-full overflow-hidden rounded-3xl bg-[var(--indigo-night)] p-7 text-[var(--parchment)] shadow-xl">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Indus Orbit logo"
            width={40}
            height={40}
            className="pixelated h-10 w-10"
          />
          <div>
            <p className="font-display text-lg leading-none">Indus Orbit</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--saffron)]">
              General intelligence for India
            </p>
          </div>
        </div>
        <div>
          <p className="font-display text-3xl leading-none">{CARD.name}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            {CARD.title} · {CARD.org}
          </p>
        </div>
      </div>
    </div>
  );
}

function VisitingCardBack() {
  return (
    <div className="aspect-[1.75/1] w-full overflow-hidden rounded-3xl border border-border bg-[var(--parchment)] p-7 text-[var(--indigo-night)] shadow-xl">
      <div className="flex h-full flex-col justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--indigo-night)]/60">
          Contact
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            <a href={`tel:${CARD.phone}`} className="hover:underline">
              {CARD.phone}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" />
            <a href={`mailto:${CARD.email}`} className="hover:underline">
              {CARD.email}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            {CARD.city}, France
          </li>
        </ul>
        <div className="flex items-center justify-between">
          <span className="font-display text-lg">Indus Orbit</span>
          <img
            src={logo}
            alt=""
            width={28}
            height={28}
            className="pixelated h-7 w-7"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

function BrandPage() {
  return (
    <SiteShell navTone="dark">
      <section className="relative h-[58svh] min-h-[420px] w-full overflow-hidden">
        <img
          src={brandHero}
          alt="Pixel-art indigo night sky with a saffron ringed planet above an Indian skyline"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/50 to-[var(--indigo-night)]/90" />
        <div className="absolute inset-0 flex items-end px-6 pb-16">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              Brand
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight text-[var(--parchment)] md:text-6xl">
              The Indus Orbit identity kit
            </h1>
            <p className="mt-4 max-w-2xl text-[var(--parchment)]/80">
              Logo, palette, typography, art direction and the official visiting card — everything
              needed to represent the orbit consistently.
            </p>
          </div>
        </div>
      </section>

      {/* Logo */}
      <section className="px-6 py-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            Mark
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">Logo &amp; lockups</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-10">
              <img
                src={logo}
                alt="Indus Orbit primary mark"
                width={96}
                height={96}
                className="pixelated h-24 w-24"
                loading="lazy"
              />
              <p className="text-xs uppercase tracking-wider text-foreground/50">Primary mark</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-[var(--indigo-night)] p-10">
              <div className="flex items-center gap-3 text-[var(--parchment)]">
                <img
                  src={logo}
                  alt="Indus Orbit horizontal lockup on indigo"
                  width={48}
                  height={48}
                  className="pixelated h-12 w-12"
                  loading="lazy"
                />
                <span className="font-display text-2xl">Indus Orbit</span>
              </div>
              <p className="text-xs uppercase tracking-wider text-[var(--parchment)]/50">
                Dark lockup
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-[var(--parchment)] p-10">
              <div className="flex items-center gap-3 text-[var(--indigo-night)]">
                <img
                  src={logo}
                  alt="Indus Orbit horizontal lockup on parchment"
                  width={48}
                  height={48}
                  className="pixelated h-12 w-12"
                  loading="lazy"
                />
                <span className="font-display text-2xl">Indus Orbit</span>
              </div>
              <p className="text-xs uppercase tracking-wider text-[var(--indigo-night)]/50">
                Light lockup
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={logo}
              download="indus-orbit-logo.png"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-3 text-sm font-semibold text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
            >
              <Download className="h-4 w-4" /> Download logo (PNG)
            </a>
            <a
              href={brandHero}
              download="indus-orbit-brand-banner.jpg"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-foreground/5"
            >
              <Download className="h-4 w-4" /> Download banner art
            </a>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-foreground/60">
            Keep clear space equal to the mark's orbit ring on all sides. Never rotate, recolour or
            add gradients to the mark, and never place it on a background with less than 4.5:1
            contrast.
          </p>
        </div>
      </section>

      {/* Palette */}
      <section className="px-6 pb-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Palette className="h-4 w-4" /> Palette
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">
            Indigo nights, saffron warmth
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {palette.map((c) => (
              <Swatch key={c.token} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="px-6 pb-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Type className="h-4 w-4" /> Typography
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">Fraunces + Inter</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-xs uppercase tracking-wider text-foreground/50">
                Display — Fraunces
              </p>
              <p className="mt-4 font-display text-5xl font-light leading-none">Aa</p>
              <p className="mt-4 font-display text-2xl leading-snug">
                One orbit. Many walks of life.
              </p>
              <p className="mt-3 text-sm text-foreground/60">
                Headlines, statistics, quotes. Light to medium weight, tight leading.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-xs uppercase tracking-wider text-foreground/50">Body — Inter</p>
              <p className="mt-4 text-5xl font-semibold leading-none">Aa</p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                Body copy, UI labels and data tables. Uppercase micro-labels carry 0.25em tracking
                for eyebrows and chips.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Art direction */}
      <section className="px-6 pb-20">
        <div className="mx-auto w-full max-w-6xl rounded-3xl bg-[var(--indigo-night)] px-8 py-14 text-[var(--parchment)] md:px-14">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Sparkles className="h-4 w-4" /> Art direction
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">
            16-bit pixel art, Indian motifs
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              {
                k: "Pixel-first",
                v: "Every illustration is 16-bit pixel art rendered crisply (image-rendering: pixelated). No photography, no 3D renders.",
              },
              {
                k: "India in frame",
                v: "Banyans, ghats, chai stalls, jaali screens, monsoon skies, satellites over Bharat — specific, never generic.",
              },
              {
                k: "Limited palette",
                v: "Indigo night, saffron gold, parchment cream. Accents borrow from the same family; no purple gradients.",
              },
            ].map((i) => (
              <div key={i.k}>
                <p className="font-display text-2xl text-[var(--saffron)]">{i.k}</p>
                <p className="mt-3 text-sm text-[var(--parchment)]/75">{i.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Merchandise */}
      <section className="px-6 pb-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Shirt className="h-4 w-4" /> Merchandise
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">
            Wearable orbit — 2026 drop
          </h2>
          <p className="mt-3 max-w-2xl text-foreground/70">
            Two print families only. The <strong>mark drop</strong> carries just the io monogram
            and the wordmark. The <strong>statement drop</strong> carries the full line — General
            Intelligence Company of India. Never mix both on one garment.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                src: merchTshirt,
                w: 1024,
                h: 1024,
                alt: "Cream cotton t-shirt printed with the saffron io monogram and General Intelligence of India",
                title: "Statement tee",
                drop: "Statement drop",
                spec: "Parchment 240gsm boxy cut · indigo chest print · saffron mark",
              },
              {
                src: merchHoodie,
                w: 1024,
                h: 1024,
                alt: "Indigo hoodie with a small embroidered saffron io monogram on the left chest",
                title: "Orbit hoodie",
                drop: "Mark drop",
                spec: "Indigo night 400gsm · left-chest mark · saffron drawcord tips",
              },
              {
                src: merchMug,
                w: 1024,
                h: 1024,
                alt: "Matte indigo ceramic mug with the saffron io monogram and Indus Orbit wordmark",
                title: "Ledger mug",
                drop: "Mark drop",
                spec: "350ml matte indigo glaze · saffron single-colour transfer",
              },
            ].map((m) => (
              <figure
                key={m.title}
                className="overflow-hidden rounded-3xl border border-border bg-card"
              >
                <img
                  src={m.src}
                  alt={m.alt}
                  width={m.w}
                  height={m.h}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                    {m.drop}
                  </p>
                  <p className="mt-2 font-display text-2xl">{m.title}</p>
                  <p className="mt-2 text-xs text-foreground/65">{m.spec}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          <figure className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
            <img
              src={merchKit}
              alt="Flat lay of Indus Orbit small goods: io enamel pin, canvas tote, sticker sheet, notebook and cap"
              width={1536}
              height={1024}
              loading="lazy"
              className="w-full object-cover"
            />
            <figcaption className="flex flex-wrap items-center justify-between gap-3 p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                  Small goods
                </p>
                <p className="mt-2 font-display text-2xl">Welcome kit</p>
              </div>
              <p className="max-w-xl text-xs text-foreground/65">
                Enamel orbit pin, indigo canvas tote, sticker sheet, grid notebook and six-panel
                cap. One accent colour per object — saffron on indigo, or indigo on parchment.
                Never both accents on the same piece.
              </p>
            </figcaption>
          </figure>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { k: "Print rule", v: "One colour per side. Mark left chest, statement centre chest." },
              { k: "Fabric", v: "Undyed parchment cotton or indigo-night pigment dye. No white." },
              { k: "Clear space", v: "The io monogram keeps one o-width of blank fabric on every side." },
            ].map((r) => (
              <div key={r.k} className="rounded-3xl border border-border bg-card p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-foreground/50">
                  {r.k}
                </p>
                <p className="mt-2 text-sm text-foreground/75">{r.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Visiting card */}
      <section className="px-6 pb-24">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            Stationery
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">Visiting card</h2>
          <p className="mt-3 max-w-2xl text-foreground/70">
            85 × 49 mm, indigo front with the pixel mark, parchment back for contact details.
            Printed on 400gsm uncoated stock with a saffron foil ring on the mark.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <VisitingCardFront />
            <VisitingCardBack />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadVcard}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-3 text-sm font-semibold text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
            >
              <Download className="h-4 w-4" /> Save contact (.vcf)
            </button>
            <a
              href={`mailto:${CARD.email}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-foreground/5"
            >
              <Mail className="h-4 w-4" /> {CARD.email}
            </a>
            <a
              href={`tel:${CARD.phone}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-foreground/5"
            >
              <Phone className="h-4 w-4" /> {CARD.phone}
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
