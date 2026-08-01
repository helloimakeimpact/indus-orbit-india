export type HumanCheck = {
  left: number;
  right: number;
};

// This is only a small UX check. Public submission endpoints must enforce their
// own rate limiting and abuse controls; client-side arithmetic is not security.
const HUMAN_CHECKS: readonly HumanCheck[] = [
  { left: 4, right: 7 },
  { left: 9, right: 2 },
  { left: 6, right: 8 },
  { left: 3, right: 5 },
  { left: 7, right: 6 },
  { left: 8, right: 4 },
];

export function getHumanCheck(index: number): HumanCheck {
  return HUMAN_CHECKS[index % HUMAN_CHECKS.length] ?? HUMAN_CHECKS[0];
}

export function nextHumanCheckIndex(index: number): number {
  return (index + 1) % HUMAN_CHECKS.length;
}
