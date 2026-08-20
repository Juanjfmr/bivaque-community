# Postmortem — template

> **Loop 3 (incidente → ação rastreada até fechar).** Uso obrigatório quando um
> incidente abre — o histórico deste repo (quatro vazamentos de privacidade, o
> perfil fantasma "Visual Capture") mostra que um problema só deixa de voltar
> quando vira **ação com data e verificador**, não quando vira anedota num doc.
>
> Para cada incidente, copie este arquivo para `docs/decisions/POSTMORTEM-<id>-<romeu>.md`
> e preencha. Uma coluna do `PRODUCT_STATUS.md` / o loop de dívida fecham só
> quando a **última ação** da seção 5 está `[*]` **e** o verificador assinou a 7.

## 1. Identificação

- **ID:** `PM-<ano><seq>`
- **Data abertura:** `YYYY-MM-DD`
- **Severidade:** `crítica` / `alta` / `média` / `baixa`
- **Categoria:** `privacidade` / `seguranca` / `perda-dados` / `regressao` / `disponibilidade` / `evangelho-tooling`
- **Aberto por:** `quem detectou` (humano ou agente — nomear o agente e a onda)

## 2. Linha do tempo (sem culpa, só fatos com data)

| quando (UTC) | o que aconteceu | onde (arquivo:linha) | evidência |
|---|---|---|---|
|  |  |  |  |

## 3. Causa raiz

> Uma frase: o mecanismo, não o sintoma. Ex. bons: *"a captura provisionava
> perfil ao navegar por rota autenticada"* / *"o env não tinha chave, então o
> build saiu sem URL e o middleware lançava em toda requisição"*.

**Causa raiz:**

**Precondições que permitiram** (o que teve que estar verdade para isso acontecer):

## 4. Impacto

- **Linhas/recursos afetados:** `ex.: 6 asserts de pgTAP, N usuários, 1 CI em vermelho`
- **Janela:** de `YYYY-MM-DD HH:MM` até `YYYY-MM-DD HH:MM` (ou "contínuo")
- **O que o usuário viu** (ex.: erro genérico / dados de terceiro / nada — silêncio falso):

## 5. Ações corretivas — cada uma rastreada até fechar

| # | ação | dono | prazo | status | prova de fechamento |
|---|---|---|---|---|---|
| 1 |  |  | `YYYY-MM-DD` | `aberta/e` |  |
| 2 |  |  |  |  |  |

> Regra: **sem isso a ação não conta como feita** — o prisma é "esta ação, se
> tivesse existido antes, teria impedido o incidente?" Se a resposta é *não*,
> a ação é cosmética e não fecha a seção.

## 6. Prevenção (o loop que isto institucionaliza)

- [ ] Este incidente produziu ≥1 ação com data e verificador (seção 5).
- [ ] A ação impede a recorrência (teste mental da regra acima responde *sim*).
- [ ] O mecanismo está coberto por um **teste automático** (unit/scope/pgTAP/e2e) — não só por convenção.
- [ ] A lição entrou num harness/guardrail (`AGENTS.md`, scope test, skill) **ou** está sinalizada no `PRODUCT_STATUS.md` como dívida com data.

## 7. Verificação de fechamento (assinada)

> Preenchida quando TODAS as ações da 5 estiverem `[*]`. Não é opcional: é o que
> distingue este documento de um relatório "para o arquivo".

- **Verificador:** `nome humano`
- **Data:** `YYYY-MM-DD`
- **Confere que:** cada ação da 5 está `[*]`, a prova de fechamento é real (comando/teste/documento), e a 6 tem todos os checkboxes marcados.
- **Assinatura de aceite da recorrência evitada:** sim / não (se não, voltar para a 5)
