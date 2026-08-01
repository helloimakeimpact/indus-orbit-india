import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const mobileMediaQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribeToMobileChanges(notify: () => void) {
  const mediaQuery = window.matchMedia(mobileMediaQuery);
  mediaQuery.addEventListener("change", notify);
  return () => mediaQuery.removeEventListener("change", notify);
}

function getMobileSnapshot() {
  return window.matchMedia(mobileMediaQuery).matches;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribeToMobileChanges, getMobileSnapshot, () => false);
}
