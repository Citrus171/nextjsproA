interface OpenApiOperation {
  parameters?: unknown;
}

interface OpenApiParameter {
  example?: unknown;
  schema?: {
    example?: unknown;
    default?: unknown;
  };
}

function isObject(val: unknown): val is object {
  return typeof val === "object" && val !== null;
}

function applyParameterDefaults(item: unknown) {
  const parameter = item as OpenApiParameter;
  if (!isObject(parameter) || parameter.example !== undefined) return;

  const example = parameter.schema?.example ?? parameter.schema?.default;
  if (example !== undefined) {
    parameter.example = example;
  }
}

function getOperations(
  paths?: Record<string, Record<string, object>>
): OpenApiOperation[] {
  const result: OpenApiOperation[] = [];
  for (const pathItem of Object.values(paths ?? {})) {
    if (!isObject(pathItem)) continue;
    for (const operation of Object.values(pathItem)) {
      if (isObject(operation)) result.push(operation as OpenApiOperation);
    }
  }
  return result;
}

export function applyParameterExamples(document: object) {
  const doc = document as { paths?: Record<string, Record<string, object>> };
  for (const op of getOperations(doc.paths)) {
    if (!Array.isArray(op.parameters)) continue;
    for (const item of op.parameters) {
      applyParameterDefaults(item);
    }
  }
}
