import { readFileSync, writeFileSync } from "node:fs"

const path = new URL("../supabase/database.generated.ts", import.meta.url)
const generated = readFileSync(path, "utf8")
const signature =
  /( {6}set_community_image: \{\r?\n {8}Args: \{[\s\S]*?)( {10}p_path: string)(\r?\n {8}\}\r?\n {8}Returns: undefined)/g
const matches = [...generated.matchAll(signature)]

if (matches.length !== 1) {
  throw new Error("Expected exactly one generated set_community_image signature")
}

const nullablePath = [
  "          // The RPC accepts NULL to clear the image pointer; the type generator",
  "          // does not express nullable function arguments.",
  "          p_path: string | null",
].join("\n")

writeFileSync(path, generated.replace(signature, `$1${nullablePath}$3`))
