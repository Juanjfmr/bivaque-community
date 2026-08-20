import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      web: resolve(dirname, "apps", "web"),
    },
  },
  test: {
    // .claude/worktrees/<name>/ can hold a full nested checkout of this
    // repo (created by the using-git-worktrees skill). Vitest's default
    // excludes don't cover it, so a stale worktree's own tests/unit tree
    // got picked up alongside the real one and failed against whatever
    // state that branch happened to be in — found running the onda T/F
    // closing gate, unrelated to either wave's own code.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/dist/**"],
  },
})
