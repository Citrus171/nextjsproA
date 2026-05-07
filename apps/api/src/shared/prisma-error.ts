interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

export function isPrismaKnownError(e: unknown): e is PrismaKnownError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  );
}
