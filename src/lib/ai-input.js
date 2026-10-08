import { readStdin } from "./io.js";

export async function loadFileContent(filePath) {
  if (!filePath) return null;
  if (filePath === "-") return await readStdin();
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${filePath}`);
  }
  return await file.text();
}

export function prependToInput(prefix, fileContent, input) {
  return [prefix, fileContent, input].filter(Boolean).join("\n\n");
}
