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

export function applyParameterExamples(document: object) {
  const doc = document as { paths?: Record<string, Record<string, object>> };
  const paths = doc.paths;
  for (const pathItem of Object.values(paths ?? {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== "object") {
        continue;
      }

      const op = operation as OpenApiOperation;
      if (!Array.isArray(op.parameters)) {
        continue;
      }

      for (const item of op.parameters) {
        const parameter = item as OpenApiParameter;
        if (!parameter || typeof parameter !== "object") {
          continue;
        }

        if (parameter.example !== undefined) {
          continue;
        }

        const schemaExample = parameter.schema?.example;
        if (schemaExample !== undefined) {
          parameter.example = schemaExample;
          continue;
        }

        const schemaDefault = parameter.schema?.default;
        if (schemaDefault !== undefined) {
          parameter.example = schemaDefault;
        }
      }
    }
  }
}
