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

Usa `@playwright/test` (ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`). São 36 sondas; a maioria roda em 1440 e em 390 px,
e P27, P29 e P31 percorrem os dois tamanhos por conta própria.
`node docs/design/prototype-v34/mutate.mjs` quebra 9 invariantes de propósito e exige que a sonda certa acuse cada uma.
A saída de referência está no plano, em "Evidência de execução".
O autoteste do arquivo (`?selftest=1`) é só regressão local e **não** conta como evidência.

## Tipografia e terceiros

A fonte é a Public Sans do produto (`docs/agents/DESIGN_SYSTEM.md` §4.3), auto-hospedada: o HTML referencia os
WOFF2 de `apps/web/app/fonts` por caminho relativo. Copiado sozinho, o arquivo cai na fonte do sistema.
Nenhuma fonte, script ou folha de estilo de terceiro é carregada (sonda P34). As fotos de demonstração vêm do
Unsplash (terceiro, só imagem); em produção seriam próprias.

## O que é simulado (e aparece rotulado)

- Passagem do tempo, resposta de prestador a pedido, aceite de pessoa e aprovação de comunidade.
- O classificador do Resolver é por palavras-chave; o conteúdo cobre Manaus e Brasília, e Natal e
  Rio de Janeiro existem só para mostrar o cold start.

## O que este protótipo não prova

- Não é revisão independente: a verificação foi escrita e executada por quem implementou.
- Escalabilidade, recorrência e diferenciação estão demonstradas no desenho, não confirmadas com uso.
- Publicação, ingresso, consentimento e ranking pago são fronteiras R3: precisam de ADR antes de
  qualquer código de produção.
