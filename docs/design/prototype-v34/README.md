# Protótipo v34 — candidato de referência visual

**Status:** candidato. Não substitui `docs/design/visual-guide-2026-09-06/` nem altera `AGENTS.md`.
Se for travado como autoridade, isso troca a navegação de 06/09 (Início / Explorar / Comunidades /
Perfil) por Início / Resolver / Comunidade / Conversas / Você. A decisão é do responsável.

Plano e critérios: [`docs/superpowers/plans/2026-09-29-prototipo-v34-nota-8.md`](../../superpowers/plans/2026-09-29-prototipo-v34-nota-8.md).

## Como abrir

Abra `Bivaque_v34.html` no navegador. Um único arquivo; dados 100% fictícios; estado em `localStorage`.
Em **Você → Demonstração** há um relógio de demonstração (+3 dias, ir à data da mudança, reiniciar).

## Como verificar

```sh
node docs/design/prototype-v34/verify.mjs
```

Usa `@playwright/test` (ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`). Roda as sondas em 1440 e 390 px.
O autoteste do arquivo (`?selftest=1`) é só regressão local e **não** conta como evidência.

## O que é simulado (e aparece rotulado)

- Passagem do tempo, resposta de prestador a pedido, aceite de pessoa e aprovação de comunidade.
- O classificador do Resolver é por palavras-chave; o conteúdo cobre Manaus e Brasília, e Natal e
  Rio de Janeiro existem só para mostrar o cold start.

## O que este protótipo não prova

- Não é revisão independente: a verificação foi escrita e executada por quem implementou.
- Escalabilidade, recorrência e diferenciação estão demonstradas no desenho, não confirmadas com uso.
- Publicação, ingresso, consentimento e ranking pago são fronteiras R3: precisam de ADR antes de
  qualquer código de produção.
