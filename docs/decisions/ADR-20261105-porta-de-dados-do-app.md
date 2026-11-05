---
id: ADR-20261105-porta-de-dados-do-app
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-05
expires_at:
linked_plan: docs/agents/tasks/RUN-007.task.yml (F05 Eventos como piloto da porta de dados)
critic_verdict: pending
critic_review:
---

# A porta de dados real do app

## Problem

As telas de `apps/app` leem de uma fonte única de demonstração,
`apps/app/lib/dados/index.ts` (`dadosDoApp.lerCidade`), montada em memória com
`criarDadosDemo`. A tela não sabe que o dado é de mentira: ela renderiza o mesmo
que renderizaria com o banco. Por isso a demonstração não é um andaime inofensivo
— enquanto ela existir, "a tela funciona" não prova nada sobre o produto.

A F05 (Eventos) é a primeira jornada que precisa de dado real. Fazer isso só nos
eventos, do jeito que der, cria um segundo jeito de falar com o servidor: a
entrada já tem o seu (`apps/app/src/entrada/servidor.ts`), cada tela inventaria o
seu, e a regra do contrato da SPA ADR §5 (credencial, CSRF, erro, CORS) passaria a
existir em N cópias que ninguém revisa junto.

A decisão é de risco R3: a partir daqui o app lê e grava dado de membro por rota
HTTP nova.

## Decision

**Um molde, e as jornadas o repetem.** A F05 o inaugura; F08, F07 e as demais
seguem o mesmo desenho sem inventar variação.

### 1. Um cliente só, no app

`apps/app/lib/api/cliente.ts` é o único lugar que chama `/api/app/*`.

- `credentials: "include"`: o app é servido em `/app` pelo mesmo Next, então o
  cookie da sessão vai sozinho. O app de loja usa o mesmo caminho enquanto a
  ponte de token não existir.
- Cabeçalho `x-bivaque-app: bivaque-spa` em **toda** requisição: o servidor
  recusa escrita por cookie sem ele (CSRF), e mais ninguém o manda.
- JSON de entrada e de saída; `content-type: application/json` só quando há corpo.
- Erro tipado `FalhaDaApi` com `status` e `codigo`: `401` sem sessão, `403`
  recusado, `404` não existe para esta pessoa, `409` conflito, `429` limite,
  `503` serviço fora. A tela decide pela `status`, nunca pelo texto.
- **Sem retentativa em escrita.** `GET` pode ser repetido por quem chama; `POST`,
  `PUT`, `PATCH` e `DELETE` não são repetidos pelo cliente — repetir um envio
  duplica a pergunta, a presença e o evento.
- `AbortSignal` em toda chamada: a tela cancela o que não interessa mais ao
  desmontar ou ao pedir "Tentar de novo".

### 2. Um módulo por jornada, na camada de dados

`apps/app/lib/dados/<jornada>.ts` (aqui `eventos.ts`) é a única porta da jornada:
fala com `/api/app/<jornada>`, traduz o corpo da resposta para os tipos da tela e
não conhece HTTP, cabeçalho nem status — isso é do cliente. A tela chama o
módulo; não chama `fetch` nem o cliente direto.

O módulo da jornada não importa `dadosDoApp`. A demonstração continua existindo,
inteira, para as telas que ainda não foram ligadas e para a galeria de peças —
mas uma tela que já saiu da demonstração não pode voltar a ela por acidente, e
isso é provado por teste de escopo, não por disciplina.

### 3. As rotas, no servidor

Sob `apps/web/app/api/app/<jornada>`, todas com o encanamento de
`lib/app-api/rota-do-app` (`exigirSessao`, `conferirEscrita`, `opcoesDoApp`,
`responder`) e o **cliente Supabase da sessão** — sob RLS, nunca
`service_role` onde a política da sessão basta. A pessoa vem da sessão; cidade,
autoria e papel nunca vêm do corpo, da query ou do app.

A validação de domínio vive em `apps/web/lib/<jornada>`, no mesmo módulo que a
Server Action antiga usa. Um caminho só, duas portas: a web antiga e o app não
podem discordar sobre o que é um evento válido.

Falha de leitura do banco é `503`, nunca lista vazia: um banco fora renderizado
como "nenhum encontro" esconde o erro no meio da tela.

### 3.1. O corpo de erro

Toda rota do app responde erro no mesmo formato, e o cliente decide pelo
`codigo`, nunca pelo texto:

```json
{ "erro": "<codigo-curto>", "mensagem": "<frase pronta, quando existe>" }
```

| Status | `codigo` no cliente | Quando |
|---|---|---|
| 400 | `invalido` | corpo, tipo ou parâmetro fora da régua |
| 401 | `sem-sessao` | credencial ausente, vencida ou conflitante |
| 403 | `recusado` | origem/cabeçalho (CSRF), autoria, cidade, RLS |
| 404 | `nao-encontrado` | não existe ou não é visível para esta pessoa |
| 409 | `conflito` | a operação colide com o estado atual |
| 429 | `limite` | limite de tentativas |
| 500/503 | `indisponivel` | serviço fora — nunca "o pedido estava errado" |

`erro` é o motivo curto que a tela ramifica (`de-outra-cidade`,
`nao-organiza`, `sem-cidade`, `dados-invalidos`, …). `mensagem` é a frase que o
servidor já preparou para a pessoa; quando existe, vence a frase padrão da
tela. A tela escolhe a frase final por ação: recusa de pergunta não é recusa de
autoria.

### 3.2. Mídia nunca sai como caminho

O detalhe nunca devolve caminho cru do bucket (`cover_path` e similares): ou a
rota assina uma URL de vida curta (`createSignedUrls`, SPA ADR §5.4), ou não
devolve nada. Hoje a tela de encontro não desenha capa, então a rota não devolve
nada — e o teste de escopo garante que nenhum campo com cara de caminho volte
ao corpo.

### 3.3. A cidade é a do vínculo `current`

Cidade, autoria e papel vêm do banco pela sessão, e o vínculo é lido com
`kind = 'current'`: quem está em transferência tem duas linhas (a atual e a que
está deixando) e ler sem o filtro cai na cidade errada. O recorte vive em
`apps/web/app/api/app/eventos/_comum.ts`. **As rotas de entrada repetem esse
padrão em código próprio**; elas migram para a função única junto com o cliente
da entrada, depois do #128.

### 3.4. Encontro de outra cidade é visita, não 404

Decisão do dono de 25/09 (migration `20260925161111_consulta_outra_cidade`):
membro com cidade atual LÊ encontros de alcance cidade de qualquer cidade. Por
isso o detalhe não é 404 para quem é de fora — ele devolve a cidade do encontro
e `visitante: true`, e a tela explica que presença e pergunta ficam para quem
mora lá. Confirmar presença e perguntar ao organizador continuam negados para
visitante (403 `de-outra-cidade`, antes do banco e de novo na RLS), e a rota não
devolve contagem de confirmados para quem é de fora: a RLS nega a leitura de
`event_rsvps`, e um zero ali seria a mentira "ninguém confirmou".

### 3.5. A paginação é por cursor composto

Lista paginada devolve `proximo` opaco; a tela devolve o mesmo valor em
`?depois=`. O cursor é `comecaEm|id` — os dois campos da ordenação, na mesma
ordem do `order`. Só `starts_at` perderia ou repetiria encontros no mesmo
horário na virada da página. A tela mostra "Ver mais" enquanto houver cursor;
listar menos que o total sem dizer nada é o corte silencioso que o
`apps/app/AGENTS.md` proíbe.

### 4. A tela

A tela troca `dadosDoApp` pelo módulo da jornada e passa a distinguir os estados
que o `apps/app/AGENTS.md` exige: carregando, vazio honesto, negado, erro
recuperável com "Tentar de novo", e preenchido. Escrita que falha volta ao estado
anterior e diz o que aconteceu; escrita que dá certo mostra o resultado gravado,
não um otimismo local.

## Consequences

- A demonstração passa a ser dívida visível e mensurável: cada tela que sai dela
  deixa de importar `dadosDoApp`, e o teste de escopo lista as que faltam.
- O cliente da entrada (`src/entrada/servidor.ts`) faz o mesmo trabalho que
  `lib/api/cliente.ts` faria. Ele **migra para o cliente único depois do #128**,
  para não haver dois donos do mesmo contrato. Fica registrado como pendência
  neste ADR e no card LAN-F05; enquanto não migra, a duplicação é conhecida e
  limitada a um arquivo.
- Toda jornada nova custa: um módulo em `lib/dados`, um conjunto de rotas em
  `lib/app-api`-padrão, validação compartilhada com a web antiga, e teste de
  escopo. É o preço de não ter uma terceira forma de falar com o servidor.

## Alternatives rejected

- **Falar direto com o Supabase pelo app (`supabase-js` no navegador).** O
  contrato da SPA ADR §5 existe porque a RLS sozinha não cobre validação de
  corpo, limite de tamanho, tratamento de imagem no servidor e o recorte que não
  é política de linha. Também levaria a anon key e a sessão para um bundle
  público.
- **Uma rota por tela.** Duplicaria CSRF, sessão e erro por tela, e cada tela
  nova revisaria a regra de segurança de novo.
- **Manter a demonstração e só trocar por dentro.** Não prova nada: a tela
  continuaria sem saber a diferença entre "vazio" e "falhou".

## Evidence

- `docs/agents/tasks/RUN-007.task.yml` — o contrato da F05 e o que a prova exige.
- `apps/web/lib/app-api/` — o encanamento que as rotas novas reusam.
- `tools/backend-kanban` card `LAN-F05` — prova de execução, commits e o que fica
  aberto.

## Review and security

Revisão independente e parecer do `security-auditor` deste lote são registrados
no card `LAN-F05` e na linha da [RATIFICACAO](RATIFICACAO.md). O executor não
revisa o que implementou.
