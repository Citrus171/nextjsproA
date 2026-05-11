const LOCALHOST_RE = /^https?:\/\/localhost(:\d+)?$/;

export function isOriginAllowed(
  origin: string | undefined,
  isDev: boolean,
  allowedOrigins: string[]
): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (isDev && LOCALHOST_RE.test(origin)) return true;
  return false;
}
