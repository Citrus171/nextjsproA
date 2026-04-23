export function applyParameterExamples(document: any) {
  for (const pathItem of Object.values(document.paths ?? {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const operation of Object.values(pathItem as Record<string, any>)) {
      if (!operation || typeof operation !== "object") {
        continue;
      }

      if (!Array.isArray(operation.parameters)) {
        continue;
      }

      for (const parameter of operation.parameters) {
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
