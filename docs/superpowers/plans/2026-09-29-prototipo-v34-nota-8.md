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
> **For agentic workers:** Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** um único arquivo HTML funcional (`Bivaque_v34.html`) em que os objetos, fluxos e regras
centrais do v33 se comportam como o produto deve se comportar, provado por sondas no navegador
(desktop 1440 e mobile 390), e não por autoteste do próprio arquivo.

**Architecture:** dados e estado separados. `DB` é estático e fictício; `state` é o único lugar
que muda e é persistido em `localStorage`. Toda tela é renderizada a partir de `DB` + `state`. Cliques
usam delegação (`data-act`), sem JavaScript em atributo, o que elimina o bug de apóstrofo do v33 e
permite varrer cliques mortos. Rotas usam `history.pushState`; gavetas são diálogos acessíveis.

**Tech Stack:** HTML/CSS/JS sem dependências. Tipografia: Public Sans auto-hospedada (`apps/web/app/fonts`, `DESIGN_SYSTEM.md` §4.3), sem fonte, script nem folha de estilo de terceiro. Fotos de demonstração do Unsplash (terceiro, só imagem, declarado).
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
  desenho e pela demonstração; a confirmação real depende de uso e fica dita em "Evidência de execução".
- **Verificação:** a seção "Evidência de execução" diz que a verificação foi do próprio implementador. Não é
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

- [x] `DB` e `state` separados; `state` persistido; `render` por página a partir dos dois.
- [x] Delegação de cliques (`data-act`); nenhum handler inline; texto do usuário sempre escapado.
- [x] Rotas com `history.pushState`; Voltar do navegador fecha a gaveta antes de sair da página.
- [x] Gaveta com `role="dialog"`, `aria-modal`, foco preso e devolvido, fundo `inert`.
- [x] Ligação de fundo `?selftest=1` com invariantes (regressão local; **não** é evidência).

**Prova:** varredura de cliques mortos passa (todo `data-act` tem ação e todo `data-id` resolve;
cada clique produz rota, gaveta, mudança de estado ou aviso), em 1440 e 390.

### Task 2 — Confiança e pago (F1) — sobe Confiança, Monetização, Serviços, Benefícios

- [x] Ficha do prestador com evidência por resultado, recência e vínculo (contratou × mencionou);
      estrelas removidas; selo de verificação igual para todos.
- [x] Zona de anúncio separada em Resolver e catálogos; rótulo "Anúncio" no objeto em toda tela;
      anúncio sem "por que apareceu".
- [x] Painel mínimo do prestador (pedidos recebidos, proposta, ficha, como aparecer).
- [x] Benefício com condição, validade, resgate e estado vencido.

**Prova:** em "onde morar" e "instalar um split", nenhum objeto com `campaign` está no conjunto
orgânico; o selo aparece em todos os prestadores ou em nenhum.

### Task 3 — Necessidade, Pedido, Proposta, Oferta (F4, F5, F9) — sobe Necessidade, Criação, Resolver

- [x] Necessidade só nasce em Acompanhar, Perguntar, Pedir orçamento, Pedir ajuda ou Ofertar.
- [x] Toda conversa nasce de objeto + necessidade escolhida na hora (ou "só conversar").
- [x] Pedido estruturado (o quê, quando, onde, porte da família só se compartilhado).
- [x] Propostas tipadas, comparáveis; escolher cria "contratei".
- [x] "Ofereço" para desapego, imóvel, serviço (em verificação) e evento, com prévia; o anúncio
      publicado aparece na lista; nenhuma resposta fabricada.

**Prova:** cinco buscas do roteiro → 0 necessidades novas; orçamento pelo catálogo não altera
`n-move`; publicar desapego aumenta o número de anúncios em Desapegos.

### Task 4 — Transição e lado da mudança (F6, F8) — sobe Contexto, Descoberta, Imóveis, Desapegos, Eventos

- [x] Transição editável, várias por pessoa; fase derivada da data e do relógio.
- [x] Lado = cidade citada, senão foco escolhido, senão fase.
- [x] Home por fase; catálogos e Resolver nos dois lados; conteúdo nas duas cidades.
- [x] Desapegos invertido por lado; janela aproximada em toda tela; cold start numa cidade sem base.

**Prova:** alternar o foco muda Home e Resolver; "pediatra em Brasília" devolve Brasília;
"mudança para Brasília" e "instalar ar-condicionado" devolvem resultados; `05/10` não existe no DOM.

### Task 5 — Publicação, ingresso e consentimento (F2, F3, F7) — sobe Comunidade, Confiança

- [x] Perguntar = texto editável + prévia + destino; perguntar a partir de referência abre em branco.
- [x] Regra de comunidade aplicada (transição elegível entra; membros-only pede entrada).
- [x] Evidência pública com campos próprios; texto livre permanece privado.
- [x] Pessoa só aparece se o tema aceito bate; "Pedir ajuda" cria pedido pendente ligado à necessidade.
- [x] Eventos e Círculos pertencem a uma comunidade.

**Prova:** fechar uma necessidade com nome de criança não deixa esse nome em tela pública;
nenhum ingresso ocorre sem confirmação; o consentimento exibido é o tema realmente aceito.

### Task 6 — Memória e curadoria (F10) — sobe Memória, Escalabilidade

- [x] Referência com curador nomeado e gatilho de revisão (N evidências/perguntas resolvidas).
- [x] Deduplicação de pergunta antes de publicar.
- [x] Salvos, RSVP, respostas e conversas persistem e voltam a aparecer.
- [x] "Continuar" mostra no máximo 3 com "ver todas".

**Prova:** recarregar mantém tudo; pergunta quase idêntica oferece a existente.

### Task 7 — Mobile, acessibilidade e texto (F10) — sobe Mobile, UI/UX

- [x] "Explorar por tipo" nos dois tamanhos; busca no celular; uma aba ativa; sem sobreposição.
- [x] Alvos de toque ≥ 44px; rótulos; foco visível; `aria-current`.
- [x] Sem texto de bastidor; sem "sinal(is)"; sem repetição de "por que apareceu".
- [x] Sem requisição de fonte, script ou folha de estilo de terceiro; tipografia é a Public Sans do produto (`DESIGN_SYSTEM.md` §4.3), auto-hospedada.

**Prova:** zero alvos < 44px nos controles; zero campos sem rótulo; Home com no máximo 16 cards.

### Task 8 — Recorrência e diferenciação — sobe Recorrência, Diferenciação

- [x] Notificações derivadas de mudanças de estado reais; nada de contador vaidoso.
- [x] "O que significa verificado" sem posto, OM ou endereço.
- [x] Relógio de demonstração rotulado (+3 dias, ir à data da mudança, reiniciar).

**Prova:** nenhuma notificação existe sem o estado que a gera (ex.: "Amanhã" só com RSVP).

### Task 9 — Verificação e relatório

- [x] `verify.mjs` verde: 69 verificações (36 sondas; a maioria roda em 1440 e em 390 px), saída 0; saída colada em **Evidência de execução**.
- [x] Teste de mutação (`mutate.mjs`): 9 quebras, 9 detectadas.
- [x] `npx pnpm@11.18.0 gate`: lint, typecheck, test e secrets verdes. O Biome exclui só o HTML (`!**/docs/design/prototype-v34/Bivaque_v34.html`); `verify.mjs` e `mutate.mjs` passam pelo linter e pelo formatador do repositório.
- [ ] `build` do gate: **não rodou localmente** (falta `apps/web/.env.local`, que exige o stack Supabase). A confirmação é a CI do PR.
- [x] Notas re-atribuídas com base e limites declarados (abaixo). Verificação independente **pendente**.

## Como rodar

```sh
node docs/design/prototype-v34/verify.mjs   # 36 sondas; termina em 0 só se todas passarem
node docs/design/prototype-v34/mutate.mjs   # quebra 9 invariantes; termina em 0 só se todas forem detectadas
```

Rode os dois **antes de alterar o HTML**. Ficam fora de `pnpm test` e da CI de propósito: exigem Chromium,
e ligar isso ao gate ou ao workflow ampliaria este PR para infraestrutura de produto por causa de um
protótipo de referência. Se o v34 virar autoridade, esse é o momento de decidir se entram na CI.

**Cobertura de viewport:** as sondas de comportamento e de estado rodam em 1440 e em 390 px. P27 (cliques
mortos), P29 (alvos de toque) e P31 (mobile) percorrem os dois tamanhos por conta própria e rodam uma vez.

## Evidência de execução

Arquivos testados (SHA-256, primeiros 16 caracteres): `Bivaque_v34.html` `b76991c900f0a2be`, `verify.mjs` `dfecbf6561cdd890`, `mutate.mjs` `437e90572c4d8b03`.
Data: 29/09/2026. Chromium do Playwright. A evidência é amarrada ao conteúdo dos arquivos, e não a um commit,
porque um commit não pode conter o próprio hash. Confira com `sha256sum`.

`node docs/design/prototype-v34/verify.mjs; echo $?`

```text
PASS P01@1440     anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)
PASS P01@390      anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)
PASS P02@1440     catálogos: anúncio só na faixa rotulada; selo e evidência iguais; sem estrelas
PASS P02@390      catálogos: anúncio só na faixa rotulada; selo e evidência iguais; sem estrelas
PASS P03@1440     ficha do prestador: resultado, recência e vínculo (contratou × mencionou); zero e poucos relatos
PASS P03@390      ficha do prestador: resultado, recência e vínculo (contratou × mencionou); zero e poucos relatos
PASS P03b@1440    selo 'Recomendado' só com maioria de contratações bem-sucedidas; quem só mencionou não conta como resultado
PASS P03b@390     selo 'Recomendado' só com maioria de contratações bem-sucedidas; quem só mencionou não conta como resultado
PASS P04@1440     benefício: condição, validade, resgate persistente e estado vencido
PASS P04@390      benefício: condição, validade, resgate persistente e estado vencido
PASS P05@1440     painel do prestador: pedido recebido → proposta chega a quem pediu, com a mesma ficha pública
PASS P05@390      painel do prestador: pedido recebido → proposta chega a quem pediu, com a mesma ficha pública
PASS P06@1440     as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar' cria exatamente 1
PASS P06@390      as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar' cria exatamente 1
PASS P07@1440     orçamento pelo catálogo não toca na necessidade de mudança; conversa ancora na escolhida
PASS P07@390      orçamento pelo catálogo não toca na necessidade de mudança; conversa ancora na escolhida
PASS P08@1440     3 propostas comparáveis; escolher cria 'contratei' e conversa; deu certo? aparece depois de 3 dias
PASS P08@390      3 propostas comparáveis; escolher cria 'contratei' e conversa; deu certo? aparece depois de 3 dias
PASS P09@1440     Contribuir: infere direção e tipo, você corrige, vê prévia e o anúncio publicado aparece (4 tipos)
PASS P09@390      Contribuir: infere direção e tipo, você corrige, vê prévia e o anúncio publicado aparece (4 tipos)
PASS P10@1440     alternar o foco muda Home e Resolver; cidade citada vence o foco
PASS P10@390      alternar o foco muda Home e Resolver; cidade citada vence o foco
PASS P11@1440     casos âncora devolvem resultados heterogêneos (mudança, ar-condicionado, saúde em Brasília)
PASS P11@390      casos âncora devolvem resultados heterogêneos (mudança, ar-condicionado, saúde em Brasília)
PASS P12@1440     esclarecimento muda o resultado; vazio útil; sem estrelas de 'humor'
PASS P12@390      esclarecimento muda o resultado; vazio útil; sem estrelas de 'humor'
PASS P13@1440     Home muda com a fase e com a transferência; várias transferências; cidade sem base = cold start
PASS P13@390      Home muda com a fase e com a transferência; várias transferências; cidade sem base = cold start
PASS P14@1440     editar transferência: destino e data mudam a fase; origem = destino é recusado
PASS P14@390      editar transferência: destino e data mudam a fase; origem = destino é recusado
PASS P15@1440     nenhuma data exata de terceiros em tela; Desapegos invertido por lado
PASS P15@390      nenhuma data exata de terceiros em tela; Desapegos invertido por lado
PASS P16@1440     perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito colateral
PASS P16@390      perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito colateral
PASS P17@1440     regra de ingresso aplicada (transição elegível × pedido) e leitura bloqueada a quem não é membro
PASS P17@390      regra de ingresso aplicada (transição elegível × pedido) e leitura bloqueada a quem não é membro
PASS P18@1440     fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador não vem preenchido errado
PASS P18@390      fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador não vem preenchido errado
PASS P19@1440     pergunta parecida oferece a existente antes de publicar (dedupe)
PASS P19@390      pergunta parecida oferece a existente antes de publicar (dedupe)
PASS P20@1440     consentimento só pelos temas aceitos; 'pedir ajuda' deixa rastro ligado à necessidade e aceite chega depois
PASS P20@390      consentimento só pelos temas aceitos; 'pedir ajuda' deixa rastro ligado à necessidade e aceite chega depois
PASS P21@1440     referência com curador nomeado; evidência compartilhada aciona revisão; resposta que ajudou conta
PASS P21@390      referência com curador nomeado; evidência compartilhada aciona revisão; resposta que ajudou conta
PASS P22@1440     salvos, presença, resposta e mensagem persistem depois de recarregar
PASS P22@390      salvos, presença, resposta e mensagem persistem depois de recarregar
PASS P23@1440     notificações só existem com o estado que as gera; 'Amanhã' só com presença; badge = não lidas
PASS P23@390      notificações só existem com o estado que as gera; 'Amanhã' só com presença; badge = não lidas
PASS P24@1440     avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta ao seu pedido
PASS P24@390      avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta ao seu pedido
PASS P35@1440     Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento, desapego)
PASS P35@390      Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento, desapego)
PASS P25@1440     texto com apóstrofo ou HTML não quebra nem executa
PASS P25@390      texto com apóstrofo ou HTML não quebra nem executa
PASS P26@1440     gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair da página
PASS P26@390      gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair da página
PASS P27@1440+390 todo controle com data-act produz efeito, nas páginas e nas gavetas (1440 e 390)
PASS P34@1440     nenhuma fonte, script ou folha de estilo de terceiro é pedida; Public Sans auto-hospedada carrega
PASS P34@390      nenhuma fonte, script ou folha de estilo de terceiro é pedida; Public Sans auto-hospedada carrega
PASS P28@1440     campos com rótulo, botões com nome, imagens com alt, um item ativo por navegação
PASS P28@390      campos com rótulo, botões com nome, imagens com alt, um item ativo por navegação
PASS P29@1440+390 alvos de toque ≥ 44px nos controles (1440 e 390)
PASS P30@1440     contraste de texto ≥ 4,5:1 (fora de imagens)
PASS P30@390      contraste de texto ≥ 4,5:1 (fora de imagens)
PASS P31@1440+390 390px: sem rolagem horizontal, FAB fora da barra, entradas para todos os tipos, busca e lista/detalhe de conversas
PASS P32@1440     sem texto de bastidor; 'por que apareceu' no máximo uma vez por card e nunca em anúncio
PASS P32@390      sem texto de bastidor; 'por que apareceu' no máximo uma vez por card e nunca em anúncio
PASS P33@1440     estados: zero, um e muitos; vencido; sem resposta; resolvido; interessado; salvo
PASS P33@390      estados: zero, um e muitos; vencido; sem resposta; resolvido; interessado; salvo

69/69 verificações passaram (36 sondas; a maioria roda em 1440 e em 390 px)
exit=0
```

`node docs/design/prototype-v34/mutate.mjs; echo $?`

```text
DETECTADA      M1 anúncio entra no orgânico → FAIL P01@1440     anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)  → auto|pr
DETECTADA      M2 busca cria necessidade → FAIL P06@1440     as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar' cria exatamente 1  → necessidades 
DETECTADA      M3 orçamento ancora na mudança → FAIL P07@1440     orçamento pelo catálogo não toca na necessidade de mudança; conversa ancora na escolhida  → 
DETECTADA      M4 evidência guarda texto livre → FAIL P18@1440     fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador n
DETECTADA      M5 entra na comunidade sem confirmar → FAIL P16@1440     perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito 
DETECTADA      M6 gaveta sem role=dialog → FAIL P26@1440     gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair 
DETECTADA      M8 o tempo passa e o pedido não recebe proposta → FAIL P24@1440     avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta 
DETECTADA      M9 Editar descarta o que a pessoa preencheu → FAIL P35@1440     Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento
DETECTADA      M7 data exata de terceiros → FAIL P15@1440     nenhuma data exata de terceiros em tela; Desapegos invertido por lado  → home: data exata em
todas as mutações detectadas
exit=0
```

**Vermelho antes do verde:** a P35 foi executada contra o HTML anterior à correção do "Editar" e falhou como
esperado ("Casa" virou "Apartamento", a data de disponibilidade mudou e o publicado divergiu da prévia). Só depois
da correção ela passou.

**Base das notas (8 em todas as áreas):**

- Proposta de valor visível, UI/UX: P28 a P32 (acessibilidade, alvos de 44px, contraste, mobile, texto).
- Unidade arquitetural, Necessidade: P06, P07, P08 (a Necessidade como contêiner, sem herdar "necessidade corrente").
- Resolver: P01, P11, P12 (anúncio fora do orgânico, casos âncora, esclarecimento e vazio).
- Contexto, Descoberta: P10, P13, P14, P31 (lado da mudança, fase, cold start, entradas no celular).
- Comunidade, Confiança: P16, P17, P18, P19, P20, P03, P03b, P34 (ingresso, publicação, evidência sem texto livre, consentimento, nenhum terceiro no caminho crítico).
- Memória: P21, P22 (curadoria, persistência).
- Serviços, Imóveis, Desapegos, Eventos: P02, P05, P09, P15, P33.
- Benefícios, Monetização: P04, P05, P01, P02.
- Criação: P09, P35. Recorrência: P23, P24. Mobile: P29, P31.
- Diferenciação: P10, P18, P20 (mecanismos só do Bivaque, em comportamento).
- Escalabilidade: P19, P21 (deduplicação e curadoria, como modelo).

**Ressalvas:** Escalabilidade, Recorrência e Diferenciação recebem 8 pelo desenho e pela demonstração, e não
foram confirmadas com uso real. As sondas foram escritas e executadas por quem implementou, então **não são
revisão independente**. O autoteste do arquivo (`?selftest=1`) não conta como evidência. As fotos de
demonstração vêm do Unsplash (terceiro, só imagem); em produção seriam próprias.

**Não executado:** `build` local (ver acima); revisão independente e verificador de runtime independentes;
auditoria de telas (não se aplica: nenhuma tela de produto foi tocada); ADRs das fronteiras R3.
