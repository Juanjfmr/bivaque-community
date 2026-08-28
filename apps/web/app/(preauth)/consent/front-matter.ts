// O front matter YAML de docs/legal/*.md carrega o estado editorial do
// documento — versão, status de revisão, o card do board que o bloqueia e o
// que o dono ainda precisa decidir. É metadado do repositório, não cláusula do
// acordo.
//
// A auditoria onboarding-aaa-v1-2026-08-22 (card BLOCK-LEGAL-ENTRY) achou a
// forma anterior desse metadado — um blockquote no topo do corpo — renderizada
// DENTRO da região que o membro rola e aceita em /consent. Separar aqui é o que
// permite a nota de revisão viver junto do documento sem nunca ser exibida como
// se fizesse parte do que a pessoa está aceitando.

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/

export function stripFrontMatter(markdown: string): string {
  const match = FRONT_MATTER.exec(markdown)
  return match ? markdown.slice(match[0].length) : markdown
}
