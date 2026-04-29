import { Link } from "@tanstack/react-router";
import footerBand from "@/assets/footer-band.jpg";
import logo from "@/assets/indus-orbit-logo.png";

export function SiteFooter() {
  return (
    <footer className="relative mt-24">
      <div
        className="h-56 w-full bg-cover bg-center md:h-72"
        style={{ backgroundImage: `url(${footerBand})` }}
        aria-hidden
      />
      <div className="bg-[var(--indigo-night)] text-[var(--parchment)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <img src={logo} alt="" width={32} height={32} className="h-8 w-8 invert" />
              <span className="font-display text-2xl font-semibold">Indus Orbit</span>
            </div>
            <p className="mt-4 max-w-md text-sm text-[var(--parchment)]/75">
              A general intelligence company for India — building tools and
              networks that connect youth, experts, founders, investors and the
              diaspora into one orbit.
            </p>
            <div className="mt-6 mb-2 flex flex-wrap gap-3">
              <Link
                to="/what-is-indus-orbit"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/40 px-5 py-2 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--parchment)]/10 transition"
              >
                What is Indus Orbit?
              </Link>
              <Link
                to="/soda"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--saffron)]/60 bg-[var(--saffron)]/10 px-5 py-2 text-sm font-medium text-[var(--saffron)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
              >
                SODA Program
              </Link>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-6 flex max-w-md items-center gap-2 rounded-full bg-white/10 p-1.5 backdrop-blur"
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--parchment)] placeholder:text-[var(--parchment)]/50 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-[var(--saffron)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--indigo-night)]"
              >
                Subscribe
              </button>
            </form>
          </div>

          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-[var(--parchment)]/60">
              Explore
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-[var(--saffron)]">About</Link></li>
              <li><Link to="/our-work" className="hover:text-[var(--saffron)]">Our Work</Link></li>
              <li><Link to="/writing" className="hover:text-[var(--saffron)]">Writing</Link></li>
              <li><Link to="/contact" className="hover:text-[var(--saffron)]">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-[var(--parchment)]/60">
              Based in
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--parchment)]/80">
              <li>Delhi · NCR</li>
              <li>Bengaluru</li>
              <li>Mumbai (soon)</li>
            </ul>
            <div className="mt-6 flex gap-3 text-xs uppercase tracking-wider text-[var(--parchment)]/60">
              <a href="#" className="hover:text-[var(--saffron)]">Twitter</a>
              <a href="#" className="hover:text-[var(--saffron)]">LinkedIn</a>
              <a href="#" className="hover:text-[var(--saffron)]">Email</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-[var(--parchment)]/60 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Indus Orbit. Made for India.</span>
            <span>Connection · Synergy · Society</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
