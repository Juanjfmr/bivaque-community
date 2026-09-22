# Jornadas

- **[FLOWS.md](./FLOWS.md)** — índice gerado dos 59 fluxos, um por prancha do guia visual,
  agrupado por fluxo canônico.
- **[flows.html](../design/visual-guide-2026-09-06/flows.html)** — galeria interativa em formato
  Mobbin: cada fluxo é uma prancha, cada tela/estado é um passo recortado do PNG.
- **[MAP.md](./MAP.md)** — **histórico e superseded** (2026-08-11). Não usar como verdade.

O mapeamento é **referência de aparência e fluxo, não prova de implementação**: a prancha orienta,
o runtime prova. O status de cada fluxo é o do guia (`Referencia visual` / `Referencia com ajustes
registrados`); nenhum é apresentado como pronto.

## Regerar

```sh
npx pnpm@11.18.0 flows:frames    # só se a geometria de um PNG mudou
npx pnpm@11.18.0 flows:gallery   # regera flows.html e FLOWS.md
npx pnpm@11.18.0 flows:check     # falha se algum artefato estiver fora de sincronia
```

As fontes são `docs/design/visual-guide-2026-09-06/manifest.json` (identidade da prancha),
`scripts/visual/flows/taxonomy.json` (grupo canônico e tags) e `scripts/visual/flows/frames.json`
(geometria de recorte). Nada aqui lê o runtime.
