import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const path = new URL("../supabase/database.generated.ts", import.meta.url)
const signature =
  /( {6}set_community_image: \{\r?\n {8}Args: \{\r?\n(?: {10}[^\r\n]*\r?\n)*?)( {10}p_path: string)(\r?\n {8}\}\r?\n {8}Returns: undefined)/g
const normalizedSignature =
  / {6}set_community_image: \{\r?\n {8}Args: \{\r?\n(?: {10}[^\r\n]*\r?\n)*? {10}p_path: string \| null\r?\n {8}\}\r?\n {8}Returns: undefined/g

const nullablePath = [
  "          // The RPC accepts NULL to clear the image pointer; the type generator",
  "          // does not express nullable function arguments. Regenerate with",
  "          // `npx pnpm@11.18.0 generate:types` to restore this adjustment.",
  "          p_path: string | null",
].join("\n")

export function normalizeGeneratedTypes(generated) {
  const matches = [...generated.matchAll(signature)]
  if (matches.length === 1) return generated.replace(signature, `$1${nullablePath}$3`)

  if (matches.length === 0 && [...generated.matchAll(normalizedSignature)].length === 1) {
    return generated
  }

  throw new Error("Expected exactly one raw or normalized set_community_image signature")
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  writeFileSync(path, normalizeGeneratedTypes(readFileSync(path, "utf8")))
}
