import { defineConfig } from "orval";

export default defineConfig({
  smarti: {
    input: {
      target: "./openapi.json",
      filters: {
        tags: ["Users", "Account", "Dashboard", "Session", "Plan", "Content", "Report", "Note", "FFG"],
      },
    },
    output: {
      mode: "tags-split",
      target: "./src/generated/hooks",
      schemas: "./src/generated/schemas",
      client: "react-query",
      httpClient: "axios",
      override: {
        mutator: {
          path: "./src/mutator.ts",
          name: "apiMutator",
        },
        zod: {
          generate: { body: true, response: true },
          strict: { body: true, response: true },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: "prettier --write src/generated",
    },
  },
});