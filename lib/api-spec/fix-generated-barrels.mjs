import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function removeGeneratedDuplicateExports(relativePath, duplicateLines) {
  const file = new URL(relativePath, root);
  let content = await readFile(file, "utf8");
  for (const line of duplicateLines) {
    content = content
      .split("\n")
      .filter((candidate) => candidate.trim() !== line)
      .join("\n");
  }
  await writeFile(file, content);
}

await removeGeneratedDuplicateExports("api-zod/src/index.ts", [
  "export * from './generated/api';",
  "export * from './generated/types';",
]);
await removeGeneratedDuplicateExports("api-client-react/src/index.ts", [
  "export * from './generated/api';",
  "export * from './generated/api.schemas';",
]);