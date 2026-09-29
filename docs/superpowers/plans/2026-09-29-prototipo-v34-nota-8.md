# Protótipo v34 — do v33 (nota geral 6) à nota mínima 8 Implementation Plan

> **Status:** candidato de referência visual. **Não** substitui a autoridade de
> `docs/design/visual-guide-2026-09-06/` nem altera `AGENTS.md`/`CLAUDE.md`. Quem decidir travar o
> v34 como autoridade precisa registrar que isso troca a navegação de 06/09
> (Início / Explorar / Comunidades / Perfil) por Início / Resolver / Comunidade / Conversas / Você.
>
> **Origem:** revisão adversarial do `Bivaque_v33_structural_lock.html` (sessão de 29/09/2026):
> veredito CONGELAR a arquitetura, com 10 problemas reais e notas de 5 a 7 por área. Este plano
> executa as 7 mudanças que levam cada área a 8. O v33 não está neste repositório; as sondas
> abaixo foram escritas contra ele e reproduziram os achados antes de qualquer edição.
>
> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um único arquivo HTML funcional (`Bivaque_v34.html`) em que os objetos, fluxos e regras
centrais do v33 se comportam como o produto deve se comportar, provado por sondas no navegador
(desktop 1440 e mobile 390), e não por autoteste do próprio arquivo.

**Architecture:** dados e estado separados. `DB` é estático e fictício; `state` é o único lugar
que muda e é persistido em `localStorage`. Toda tela é renderizada a partir de `DB` + `state`. Cliques
usam delegação (`data-act`), sem JavaScript em atributo, o que elimina o bug de apóstrofo do v33 e
permite varrer cliques mortos. Rotas usam `history.pushState`; gavetas são diálogos acessíveis.

**Tech Stack:** HTML/CSS/JS sem dependências (fontes via Google Fonts, fotos via Unsplash como no v33).
Verificação: `@playwright/test` (`chromium`) já instalado no monorepo.

## Global Constraints

- **É referência visual, não runtime.** Nada aqui toca `apps/`, `packages/`, `supabase/`.
- **Dados 100% fictícios.** Nomes, valores e empresas inventados. Nenhum CPF, posto, OM, endereço.
- **Simulações declaradas.** O relógio da demonstração (`state.day`) e as respostas simuladas de
  terceiros (proposta, aceite de pessoa, aprovação de comunidade) são limitação aceitável de
  protótipo e aparecem rotuladas como demonstração. Nada mais é simulado em silêncio.
- **Invariantes (não negociáveis, cada uma tem sonda):**
  1. Objeto com campanha ativa nunca ocupa vaga orgânica; rótulo em toda tela; selo e evidência
     iguais para todos.
  2. Nada é publicado e ninguém ingressa sem passo explícito com prévia; ingresso segue a regra.
  3. A evidência pública nunca carrega texto livre da necessidade.
  4. Data exata de terceiros não aparece em nenhuma tela; só janela aproximada.
  5. Busca não cria Necessidade. Conversa nunca herda "necessidade corrente".
- **Nota 8 significa:** todos os critérios de aceitação da área passam nas sondas **e** nenhum
  achado ALTO da revisão segue aberto. Escalabilidade, Recorrência e Diferenciação recebem 8 pelo
  desenho e pela demonstração; a confirmação real depende de uso e fica dito no relatório.
- **Verificação:** o relatório final diz que a verificação foi do próprio implementador. Não é
  revisão independente (seção 14 do processo de construção). Revisor e verificador de runtime
  independentes continuam pendentes.
- **Commits:** convencionais, agrupados por entrega (plano; protótipo com sondas; infraestrutura).

## Achados de baseline (v33) que este plano fecha

| ID | Achado (reproduzido no v33) |
|---|---|
| F1 | O mesmo imóvel é 1º resultado orgânico e "Destaque pago"; selo e estrelas só no card pago |
| F2 | "Perguntar…" publica com um clique e faz a pessoa entrar na comunidade |
| F3 | Evidência pública usa o texto livre da necessidade; "com quem" vem preenchido com outro prestador |
| F4 | Cinco buscas criam quatro necessidades (2 → 6) |
| F5 | Orçamento pelo catálogo ancora na necessidade de mudança e a põe "Em conversa" |
| F6 | Alternar Manaus/Brasília não muda a Home nem o Resolver; `phase` nunca usada |
| F7 | Consentimento da Pessoa afirmado para qualquer assunto; "Pedir ajuda" não deixa rastro |
| F8 | "05/10" segue na Home e nas Conversas; Desapegos mostra ao vendedor o item de outro vendedor |
| F9 | Só desapego tem oferta e "publicado" não publica; `responses:1` fabricado |
| F10 | Referência sem curador; Salvos, RSVP e respostas não voltam; cliques mortos (Saúde, Transporte, Documentos, notificação) |

## Tasks

### Task 1 — Fundação: dados, rotas, diálogo acessível

- [ ] `DB` e `state` separados; `state` persistido; `render` por página a partir dos dois.
- [ ] Delegação de cliques (`data-act`); nenhum handler inline; texto do usuário sempre escapado.
- [ ] Rotas com `history.pushState`; Voltar do navegador fecha a gaveta antes de sair da página.
- [ ] Gaveta com `role="dialog"`, `aria-modal`, foco preso e devolvido, fundo `inert`.
- [ ] Ligação de fundo `?selftest=1` com invariantes (regressão local; **não** é evidência).

**Prova:** varredura de cliques mortos passa (todo `data-act` tem ação e todo `data-id` resolve;
cada clique produz rota, gaveta, mudança de estado ou aviso), em 1440 e 390.

### Task 2 — Confiança e pago (F1) — sobe Confiança, Monetização, Serviços, Benefícios

- [ ] Ficha do prestador com evidência por resultado, recência e vínculo (contratou × mencionou);
      estrelas removidas; selo de verificação igual para todos.
- [ ] Zona de anúncio separada em Resolver e catálogos; rótulo "Anúncio" no objeto em toda tela;
      anúncio sem "por que apareceu".
- [ ] Painel mínimo do prestador (pedidos recebidos, proposta, ficha, como aparecer).
- [ ] Benefício com condição, validade, resgate e estado vencido.

**Prova:** em "onde morar" e "instalar um split", nenhum objeto com `campaign` está no conjunto
orgânico; o selo aparece em todos os prestadores ou em nenhum.

### Task 3 — Necessidade, Pedido, Proposta, Oferta (F4, F5, F9) — sobe Necessidade, Criação, Resolver

- [ ] Necessidade só nasce em Acompanhar, Perguntar, Pedir orçamento, Pedir ajuda ou Ofertar.
- [ ] Toda conversa nasce de objeto + necessidade escolhida na hora (ou "só conversar").
- [ ] Pedido estruturado (o quê, quando, onde, porte da família só se compartilhado).
- [ ] Propostas tipadas, comparáveis; escolher cria "contratei".
- [ ] "Ofereço" para desapego, imóvel, serviço (em verificação) e evento, com prévia; o anúncio
      publicado aparece na lista; nenhuma resposta fabricada.

**Prova:** cinco buscas do roteiro → 0 necessidades novas; orçamento pelo catálogo não altera
`n-move`; publicar desapego aumenta o número de anúncios em Desapegos.

### Task 4 — Transição e lado da mudança (F6, F8) — sobe Contexto, Descoberta, Imóveis, Desapegos, Eventos

- [ ] Transição editável, várias por pessoa; fase derivada da data e do relógio.
- [ ] Lado = cidade citada, senão foco escolhido, senão fase.
- [ ] Home por fase; catálogos e Resolver nos dois lados; conteúdo nas duas cidades.
- [ ] Desapegos invertido por lado; janela aproximada em toda tela; cold start numa cidade sem base.

**Prova:** alternar o foco muda Home e Resolver; "pediatra em Brasília" devolve Brasília;
"mudança para Brasília" e "instalar ar-condicionado" devolvem resultados; `05/10` não existe no DOM.

### Task 5 — Publicação, ingresso e consentimento (F2, F3, F7) — sobe Comunidade, Confiança

- [ ] Perguntar = texto editável + prévia + destino; perguntar a partir de referência abre em branco.
- [ ] Regra de comunidade aplicada (transição elegível entra; membros-only pede entrada).
- [ ] Evidência pública com campos próprios; texto livre permanece privado.
- [ ] Pessoa só aparece se o tema aceito bate; "Pedir ajuda" cria pedido pendente ligado à necessidade.
- [ ] Eventos e Círculos pertencem a uma comunidade.

**Prova:** fechar uma necessidade com nome de criança não deixa esse nome em tela pública;
nenhum ingresso ocorre sem confirmação; o consentimento exibido é o tema realmente aceito.

### Task 6 — Memória e curadoria (F10) — sobe Memória, Escalabilidade

- [ ] Referência com curador nomeado e gatilho de revisão (N evidências/perguntas resolvidas).
- [ ] Deduplicação de pergunta antes de publicar.
- [ ] Salvos, RSVP, respostas e conversas persistem e voltam a aparecer.
- [ ] "Continuar" mostra no máximo 3 com "ver todas".

**Prova:** recarregar mantém tudo; pergunta quase idêntica oferece a existente.

### Task 7 — Mobile, acessibilidade e texto (F10) — sobe Mobile, UI/UX

- [ ] "Explorar por tipo" nos dois tamanhos; busca no celular; uma aba ativa; sem sobreposição.
- [ ] Alvos de toque ≥ 44px; rótulos; foco visível; `aria-current`.
- [ ] Sem texto de bastidor; sem "sinal(is)"; sem repetição de "por que apareceu".

**Prova:** zero alvos < 44px nos controles; zero campos sem rótulo; Home com no máximo 16 cards.

### Task 8 — Recorrência e diferenciação — sobe Recorrência, Diferenciação

- [ ] Notificações derivadas de mudanças de estado reais; nada de contador vaidoso.
- [ ] "O que significa verificado" sem posto, OM ou endereço.
- [ ] Relógio de demonstração rotulado (+3 dias, ir à data da mudança, reiniciar).

**Prova:** nenhuma notificação existe sem o estado que a gera (ex.: "Amanhã" só com RSVP).

### Task 9 — Verificação e relatório

- [ ] `verify.mjs` verde em 1440 e 390; resultado colado no relatório.
- [ ] `npx pnpm@11.18.0 gate` verde (Biome exclui o protótipo, como já exclui o guia visual).
- [ ] Notas re-atribuídas com evidência e limites declarados; verificação independente pendente.

## Fora de escopo

- Backend, RLS, migration, ADR. Os invariantes 2 a 4 são fronteiras R3 e precisam de ADR antes do
  código de produção; este protótipo não os decide.
- Cobrança de anúncio e de pedido. O painel do prestador explica as regras, não o preço.
- Trocar a navegação de produção. Isso é decisão do responsável.
