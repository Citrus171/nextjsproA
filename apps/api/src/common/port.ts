const DEFAULT_PORT = 3000;

export function resolvePort(raw: string | undefined): number {
  const parsed = parseInt(raw ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PORT;
  }
  return parsed;
}
