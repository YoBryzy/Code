/**
 * Demo-mode flag. Safe to import from both client and server components
 * (NEXT_PUBLIC_* is inlined at build time). When true, the dashboard serves
 * seeded sample data and write actions are disabled — no auth or database
 * required. Enable by setting NEXT_PUBLIC_DEMO_MODE=true.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
