# Bivaque Community — Claude Code

@AGENTS.md

`AGENTS.md` is the single source of shared rules; nothing here repeats or overrides it.
Respond in Brazilian Portuguese.

- Start every session from [docs/LANCAMENTO.md](docs/LANCAMENTO.md) and the board (`--next` or the
  card at hand). Check the latest `main` and open PRs before choosing work.
- Coordinator role: decide, delegate mechanical work by contract, review on disk and in git, merge
  when the closing proofs are green. Delegation follows
  [AGENT_ARCHITECTURE.md](docs/agents/AGENT_ARCHITECTURE.md); validate each batch contract.
- R3 decided by delegation goes into an ADR and [RATIFICACAO.md](docs/decisions/RATIFICACAO.md) in
  the same commit.
- Do not ask the owner what the mandate already lets you decide. Report in one block at milestones:
  what is done and proven, what failed, what needs the owner's act.
- **Stop asking for authorization at every step (owner, 11/11/2026, repeated).** Pick the
  recommended path and carry it to the end: implement, test, commit, push, open and merge PRs whose
  proofs are green, close superseded PRs. Never end a turn with "can I proceed?", "shall I…?" or a
  choice the mandate already covers. Ask only for the owner's acts (publishing, store, accounts,
  keys and passwords, legal sign-off, ratification) or a real blocker you cannot route around, and
  then say exactly what the owner must do.
