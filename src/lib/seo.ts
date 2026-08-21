export const SITE_URL = "https://indus-spark-connect.lovable.app";

/** Absolute URL for a site path, used for canonical + og:url. */
export function siteUrl(path: string) {
  return `${SITE_URL}${path === "/" ? "/" : path.replace(/\/+$/, "")}`;
}

/** Self-referencing canonical link for a route's head. */
export function canonical(path: string) {
  return [{ rel: "canonical", href: siteUrl(path) }];
}
