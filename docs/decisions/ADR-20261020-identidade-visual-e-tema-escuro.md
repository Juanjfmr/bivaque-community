---
id: ADR-20261020-identidade-visual-e-tema-escuro
status: accepted
risk: R2
owner: Juan
approved_at: 2026-10-20
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md
critic_verdict: PASS
critic_review: A direção foi validada por maquete nos dois temas (docs/brand/maquete-2026-10-20), comparada com o brandbook oficial (docs/brand/reference/BIVAQUE_brandbook.pdf) página a página, com os contrastes calculados. O dono aprovou em 20/10/2026.
---

# A pele do Bivaque real: brandbook oficial ajustado, nos temas claro e escuro

## Problem

O protótipo HTML, que é a especificação do produto, usa a pele "Material Web" (verde-petróleo e Roboto). A
identidade oficial de 29/08 (brandbook) usa Grafite, Papel, Brasa e Noto. Antes de portar as telas para o
Next, era preciso decidir qual pele vale e como ela se comporta no tema escuro, que o protótipo já tem e que
a decisão D31 deixava de fora ("light-only").

## Decision

1. **A pele do produto é o brandbook oficial**, com os ajustes validados na maquete
   (`docs/brand/maquete-2026-10-20/maquete-brandbook.html`):
   - **Brasa só na ação principal**: o botão Criar e o CTA primário. A cidade em destaque usa a Brasa
     escurecida `#9E3B2C` (5,92:1 sobre o Papel). Links, ações secundárias e a aba ativa usam o Grafite
     (11,9:1).
   - **Avisos e contadores em Grafite**, não em vermelho. O vermelho fica para erro e para ações
     destrutivas (`--danger`).
   - **Categorias só em tons da paleta oficial**: Grafite, Brasa, Névoa e Papel escurecido.
   - **Cantos que conversam com o Glifo**: 12 px em cartões, categorias e campos; 10 px em abas. O botão
     Criar é um quadrado de cantos suaves. Ícones Material Symbols *Outlined*.
   - **Leitura:** avatares de no mínimo 28 px com texto de 11 px; título de display com 24 px no celular;
     busca alinhada à esquerda.
   - **Sem Patrocinado**, pelo lançamento sem cobrança (R69).
2. **Tema claro e escuro desde o porte**, com o padrão em "Automática" (segue o sistema), como já faz o
   seletor de Aparência do protótipo.
   - **Escuro, conforme a página 13 do brandbook:** fundo Carvão `#171E20`, superfícies Elevado
     `#20292B`, ação e destaque em Brasa Clara `#E07A5A` com texto Carvão (5,71:1).
   - **Logo:** a versão branca inteira, sem a Brasa, que só existe na versão colorida.
   - **Fotos:** 10% mais escuras no tema escuro.
3. **Toda cor vem de variável (token)**, com o par claro e escuro. Nenhuma cor fixa no código das telas.
   Cada tela portada é aceita nos dois temas pela comparação automática de captura.
4. **Este ADR substitui a decisão D31** ("o produto continua light-only") e a frase do brandbook "o piloto é
   light-only". A paleta escura deixa de ser só referência.

## Alternatives considered

- **Pele Material Web do protótipo (versão 01).** Rejeitada: é bem-feita, mas genérica, e não carrega a
  marca aprovada.
- **Brandbook sem ajustes (versão 02).** Rejeitada:
  - Brasa em excesso, inclusive em texto pequeno, onde a Brasa pura dá só 4,52:1;
  - contadores em vermelho competindo com o erro;
  - ícones das categorias pouco diferenciados.
- **Só o tema claro no lançamento.** Rejeitada. O protótipo já tem o escuro, e acrescentá-lo depois do porte
  custa revisar tela por tela atrás de cor fixa. Com tokens desde o início, o custo é só de verificação.

## Market or reference baseline

A maioria dos apps de comunidade e de classificados oferece tema automático pelo sistema. O brandbook
oficial já define a paleta escura e o logo branco (páginas 12, 13 e 16).

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

- `docs/brand/reference/BIVAQUE_brandbook.pdf`, páginas 5, 6, 11 a 16 e 21.
- `docs/brand/maquete-2026-10-20/maquete-brandbook.png`.
- Contrastes calculados pela fórmula de luminância da WCAG: Grafite/Papel 11,90; Brasa escurecida/Papel
  5,92; Brasa/Papel 4,52; Brasa Clara/Carvão 5,71; texto secundário claro/Papel 5,59; texto secundário
  escuro/Carvão 8,25.

## Benefits

- O produto real nasce com a marca aprovada e com tema escuro coerente.
- A verificação visual cobre os dois temas automaticamente.

## Risks

- Toda cor nova precisa do par escuro.
- O número de capturas comparadas dobra.
- **Ativos:** os SVG oficiais (cinco assinaturas em versão colorida, grafite, branca e preta; Pátio; símbolos
  otimizados de 16, 24, 32 e 48 px; favicon; PWA 192/512; maskable; Apple touch; Android) estão em
  `apps/web/public/brand/`, vindos da branch `feat/bivaque-brand-foundation` de 29/08. Use sempre esses
  arquivos, nunca PNG extraído do PDF.

## Reversal cost

Baixo, enquanto tudo vier de tokens: desligar o escuro é tirar o seletor e fixar o tema claro.

## Success metric

- Todas as telas portadas passam na comparação visual nos dois temas.
- Nenhum texto fica abaixo de 4,5:1.
- Nenhuma cor fixa fora dos tokens (verificável por lint ou busca).

## Reopen condition

Reabrir se o teste com usuários mostrar problema de leitura no escuro, ou se a marca for revista.
