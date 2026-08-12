# Arquitetura do produto pós-Red Team — Bivaque Community

> Spec de decisão, 2026-08-11. Fonte: auditoria em [`docs/red-team/`](../../red-team/)
> (151 findings, 22 P0, 13 documentos). Esta spec **não** revalida a auditoria —
> ela converte os findings de Balde B em decisões do dono e organiza o
> saneamento em ondas executáveis.
>
> Ordem de leitura: [`docs/journeys/MAP.md`](../../journeys/MAP.md) →
> [`docs/red-team/sintese-fase-2.md`](../../red-team/sintese-fase-2.md) → esta spec.

## 1. Tese do produto

Bivaque é a rede onde militar federal, veterano e pensionista de Manaus se
encontram **sabendo que todo mundo ali passou por verificação**. O ativo não é
volume de feature — é identidade verificada contra base federal, escopo
municipal e fronteira de privacidade real. Toda feature ou alimenta esse ativo
ou consome ele.

As 151 findings, lidas juntas, dizem uma coisa só: **o produto cobra pela
confiança e ainda não entrega a garantia.**

### 1.1 Relação com o Bivaque original (`Juanjfmr/Bivaque`)

O produto-mãe existe e é maior: **"o Sistema Operacional da Vida Militar
Brasileira"** — multi-tenant desde o dia 1 (`om`, `clube`, `vila`,
`parceiro_b2b`, `plataforma`), 74 decisões soberanas, 19 features, modelo de
monetização e estratégia de IA já escritos.

**O Bivaque Community é um fork deliberado**, não uma reimplementação: a menor
fatia viável que consegue ser lançada, para depois incorporar as features do
projeto-mãe. A governança do original (regime formal de ADR, benchmark
obrigatório por domínio, 74 decisões congeladas) foi o que impediu o
lançamento, e não é herdada aqui.

**Consequência:** o canon é **referência, não lei**. Onde o original já resolveu
melhor, adotamos (verificação dual-path, versionamento de consentimento,
reputação sem ranking público). Onde o original é grande demais para lançar,
ficamos com a fatia.

**Correção necessária no `AGENTS.md` deste repositório:** ele afirma que as
decisões de produto vivem em `Forja-90/.omo/` e estão "inalcançáveis", mandando
não bloquear por elas. Estão alcançáveis — são o repositório privado
`Juanjfmr/Bivaque`. O MAP, o Red Team e a primeira versão desta spec foram
escritos sem esse acesso.

### 1.2 Ciclo central

1. **Ser admitido** — a verificação é a porta que cria todo o valor.
2. **Ver que existe gente como você** — feed municipal, perfil de outro membro,
   afinidade declarada.
3. **Se organizar em torno de algo** — grupos.
4. **Se encontrar de verdade** — eventos presenciais recorrentes.
5. **Pedir e receber ajuda** — indicações com resposta visível.
6. **Continuar seguro** — moderação que age.

## 2. Posicionamento (pesquisa de mercado, 2026-08-11)

| Produto | Onde | Verificação | Recorte |
|---|---|---|---|
| RallyPoint | EUA | e-mail militar | nacional, afiliação por unidade (20 mil mapeadas) |
| The Military App | Reino Unido | Verified Member Status, cap-badge e regimentos | nacional; **encontro presencial recorrente** (70+ Walk & Talks e Coffee Clubs); cobra das organizações, não dos membros |
| weServed | Reino Unido | Certificado de Serviço do MOD | nacional |
| Veterans' Gateway | Reino Unido | — | diretório de serviços |
| Digital Veteran Card | Reino Unido (10/2025) | GOV.UK One Login | prova estatal de status |
| Veteranos do Brasil, VetMil, RENAVETS | Brasil | associativa | nacional |
| SVPM+, EBChat | Brasil | institucional | app de serviço, não comunidade |
| Nextdoor | EUA/global | endereço | local, sem credencial |

**Lacuna ocupada pelo Bivaque:** os concorrentes militares são nacionais e
organizados por afiliação; o Nextdoor é local e organizado por endereço. O
cruzamento **local + credencial** não foi encontrado ocupado em nenhum dos três
mercados pesquisados.

**Consequência:** encontro presencial recorrente é produto, não extra — é o que
deu identidade ao Military App e é o que uma rede nacional não entrega.

### 2.1 O que copiar do Nextdoor

1. **Indicação é positiva por construção.** Recomendação negativa não existe lá.
   Elimina difamação, retaliação e boa parte da carga de moderação. Adotado na
   onda G.
2. **Moderação em três camadas:** denúncia do membro → moderador da comunidade →
   operador. No piloto, a camada do meio é o moderador de grupo que já existe no
   schema.
3. **Prazo público de resposta a denúncia**, ainda que folgado.

## 3. Decisões (Balde B fechado)

| # | Decisão | Consequência |
|---|---|---|
| **D1** | **Comunidades: congelar com trava técnica.** A entidade não existe no piloto | Migration nova impede `community_id` não nulo em posts/grupos/eventos. A palavra "Comunidade" na UI segue significando Manaus. Fecha F150-F155. **A camada intermediária é exatamente o que o fork adia para incorporar depois** (§1.1) — no original ela é Vila/C&K com ciclo de vida próprio, e absorvê-la pela metade seria o pior dos dois |
| **D2** | **Perfil oculto: removido.** Um estado só — visível a membros verificados de Manaus | `visibility` deixa de ter dois valores. **Pré-condição:** verificar se existe perfil não-seed com `hidden` antes da migration; se houver, avisar a pessoa, nunca flipar em silêncio. Não dispensa a correção do endpoint de avatar (F49) |
| **D3** | **DM: deferido para pós-piloto.** Superfície removida, schema congelado | Fecha F90-F103 por remoção, inclusive o P0 F98. A ajuda passa a acontecer em público (resposta de indicação, comentário de evento), o que é mais moderável. Reversível agora, caro depois |
| **D4** | **Indicações: SPLIT em dois produtos.** "Explorar" (descoberta) e "Pedir indicação" (produto próprio); ambos construídos | Onda G |
| **D5** | **Filtro de vocabulário no banco: removido.** Conteúdo comercial é permitido; marketplace é **deferido**, não excluído | Derruba as CHECK de `posts`, `comments`, `recommendation_requests` e `recommendation_replies`. Substituído por aviso de PII na UI + denúncia. Onda C |
| **D6** | **Fora do piloto por decisão:** publicação anônima e vídeo. **Deferidos:** Vitrine/marketplace, anúncios, IA, app nativo | Corrige o MAP §6, que listava marketplace, anúncios e IA como excluídos. No canon nenhum dos três é proibido: a IA tem estratégia própria (F16, "IA invisível primeiro", modelo nacional para conteúdo militar) e o comércio é a **Vitrine** — diretório de prestador, freemium com destaque pago, em que quem paga é prestador/B2B/clube e **nunca o militar ou a família**. "Hub é conector, nunca caixa": não intermedeia pagamento |
| **D7** | **Alertas automáticos fora do inbox: fora do piloto. Compartilhamento manual por link: dentro** | Preferência de notificação governa só o inbox, e só sobrevive na tela o canal com produtor real (F53/F112). **Revisado após o canon:** a D-69 do original faz da Indicação um motor de aquisição que dispara WhatsApp automaticamente via biblioteca não-oficial (Baileys/wppconnect). O fork mantém o movimento e descarta a dependência frágil: convite e indicação produzem **link copiável** que o próprio membro manda pelo WhatsApp. Mesmo mecanismo da D13 |
| **D8** | **Outras cidades: fora do piloto.** Manaus só | Waitlist é candidatura à expansão |
| **D9** | **Consentimento e código de conduta: registro auditável dos dois**, com versão e timestamp | `profiles.consent_version` e `consented_at` já existem. O aceite do código de conduta é a base contratual da suspensão na onda H |
| **D10** | **Moderação: agir sobre conteúdo e pessoa.** Ocultar qualquer alvo denunciável, suspender conta com motivo registrado, retorno ao denunciante | Onda H |
| **D11** | **Verificação dual-path, adotada do canon (D-68 + D-60).** Caminho primário: CPF → Portal da Transparência. Caminho de exceção: upload de documento por canal auditado, com decisão humana na fila de admissions | Substitui a versão anterior desta decisão ("3 retentativas + recurso"), que reinventava pior o que o original já resolveu. Herda também a **anti-enumeração**: resposta genérica e idêntica para CPF inexistente, não-militar, falha de API e hash divergente — o cliente nunca sabe por quê — e limite de 3 consultas por hora por usuário. Documento fica em storage privado com TTL curto e audit log. Fecha F20 |
| **D12** | **`pending` passa a ter produtor real.** Timeout e instabilidade do Portal produzem `pending`, não `temporary_error` | Tela de status derivada do servidor, com reconciliação; caso entra na fila de admissions; SLA de 48h úteis, que a copy já promete. Sem isso, queda do Portal vira rejeição em massa. Fecha F21/F22 |
| **D13** | **Convite familiar: link copiável pelo titular**, não e-mail | Não há provedor de e-mail no piloto (D7). Só é seguro combinado com a correção de F27: o aceite exige que a conta corresponda ao `invitee_email_digest`. Link copiável + aceite amarrado ≠ passe ao portador. Fecha F26 |
| **D14** | **Waitlist vira demanda de expansão.** Coleta a cidade; a copy para de prometer contato | Sem canal de e-mail, "entraremos em contato" é mentira. Painel mostra demanda agregada por localidade. Fecha F24/F25 |
| **D15** | **Escopo sempre explícito no pedido de indicação.** Em categoria sensível (Saúde), o seletor começa em grupo | Não proibir pedido de saúde — é dos mais úteis. Tornar a audiência impossível de entender errado: o envio mostra para quem vai e com que nome. Fecha F120 |
| **D16** | **Afiliação declarada pelo membro é permitida, OM inclusive.** A proibição do `AGENTS.md` vale para o **payload do Portal**, não para o que a pessoa escolhe dizer | Perfil ganha campos opcionais: força, status, OM e turma/período. Marcados como declaração do membro, nunca como verificação do sistema. OM vira **eixo de descoberta** — o gancho de afinidade mais forte da categoria, e o que RallyPoint e Military App já provaram |
| **D20** | **A localidade é a unidade do piloto, não a OM** | Confirma `PILOT_LOCALITY_ID` (Manaus) como desenho correto, não como desvio da derivação. O canon partia de 1 OM-piloto → OM-irmã; aqui o recorte é municipal, e a OM entra como afiliação declarada (D16), não como tenant |
| **D21** | **D-05 (OPSEC anti-mosaico) revogada para o Bivaque Community.** OM pode ser exibida e usada para descoberta | Decisão do dono, com precedente: forças armadas maiores expõem unidade em suas plataformas. **Implementação que honra a decisão sem carregar o risco residual:** exibir OM no perfil e permitir filtro/busca por OM (o valor), e limitar enumeração em massa por rate limit e paginação (o risco). Num piloto municipal, "todos da OM X" é lista quase completa — o que muda o cálculo em relação a uma plataforma de milhões |
| **D22** | **Ordem de absorção do projeto-mãe:** primeiro Vitrine e Indicação-como-aquisição, depois camada Comunidade/Vila, depois IA e B2B | O fork lança a fatia; a incorporação é sequenciada, não simultânea. Cada absorção entra como onda própria com spec própria |
| **D17** | **Resposta de indicação é positiva por construção.** Não existe "não recomendo" | Copiado do Nextdoor. Elimina difamação e retaliação antes de virarem carga de moderação |
| **D18** | **Política de nomes: conjunto mínimo seguro.** Normalizar Unicode, barrar caracteres de controle e bidi, manter 2-80 | Decisão técnica de segurança, não de produto. Fecha F47 |
| **D19** | **Valor do vínculo familiar é o acesso**, não a DM | O dependente vira membro com conta própria numa rede fechada e verificada. F55 concluiu que o único valor era DM porque a copy nunca explicou o acesso — é correção de copy |

## 4. Correções ao MAP

Aplicar em `docs/journeys/MAP.md` junto com a onda C:

1. **§6** — marketplace, anúncios/publicidade e IA saem de "excluído por decisão"
   e viram **deferido**. Publicação anônima e vídeo permanecem excluídos. A fonte
   citada (`Forja-90/.omo/drafts/`) está inacessível e foi contrariada pelo dono
   em 2026-08-11.
2. **§4** — reabrir as linhas marcadas **Corrigida** que não sobrevivem ao
   critério do próprio MAP ("estado descreve o que o usuário consegue fazer"):
   feed/publicação, perfil, grupos, eventos, notificações, mensagens,
   moderação/admin. A auditoria por domínio em `docs/red-team/lote-2-*.md`
   carrega a evidência linha a linha.
3. **§0.4** — a pendência "UI de Comunidade" deixa de ser P1 e passa a
   **congelada** (D1).
4. **§3** — a contagem "8 das 11 áreas com ciclo completo" não se sustenta.
5. **`AGENTS.md`** — a afirmação de que as decisões de produto estão em
   `Forja-90/.omo/` e são inalcançáveis está errada e custou caro: o canon é o
   repositório privado `Juanjfmr/Bivaque` (`docs/FOUNDER-INTENT.md`,
   `docs/DECISIONS.md`, `FEATURES.yaml`, `docs/MONETIZACAO.md`). Substituir o
   parágrafo por esse ponteiro e pela relação de fork descrita em §1.1.

## 5. Regras arquiteturais permanentes

Derivadas das causas raiz R1-R7 da síntese. Valem para todo trabalho futuro:

1. **Nenhum Server Component ou route de usuário renderiza objeto de domínio com
   `service_role` sem chamar o helper de acesso correspondente e negar antes de
   montar a UI.** (R1 — F60, F80, F109, F110)
2. **Toda criação de conteúdo mostra a audiência antes do submit.** Sem seletor,
   a UI declara "visível para membros verificados de Manaus". (R2)
3. **Capability em migration não entra em produto sem: entrada → ação → feedback
   → acompanhamento → sad path principal.** (R3)
4. **UI só mostra affordance se o fluxo fecha hoje.** Caso contrário, remover até
   implementar. (R4)
5. **Copy de privacidade é contrato.** Divergência se resolve mudando a copy
   antes do piloto ou mudando o comportamento — nunca deixando as duas. (R5)
6. **Coluna de escopo e as policies que a leem nascem na mesma migration.**
   (Padrão 6 do `AGENTS.md`; quatro vazamentos até aqui)
7. **Todo caminho de permissão tem teste positivo e negativo.**
8. **Herdadas do canon porque custam nada agora e são caras de retrofitar:**
   o Bivaque é conector, nunca caixa — não intermedeia pagamento nem retém
   transação (D-02 do original); e militar, dependente e familiar **nunca pagam**
   — quem paga é prestador, parceiro B2B ou clube (D-03). Isso governa a Vitrine
   quando ela for absorvida (D22).

## 6. Ondas

Cada onda termina na auditoria visual do §10.2 do MAP, que bloqueia a seguinte.
A onda A é exceção pelo §1 (segurança não espera) e corre em paralelo com B.

**Cada onda vira um plano próprio** em `docs/superpowers/plans/`, detalhado
antes da execução. Esta spec define escopo e ordem, não o passo a passo.

### Onda A — Portas e vazamentos (P0)

- F15 — callback aceita destino externo: aceitar só caminho relativo validado.
- F60 / F80 — detalhe de grupo e de evento lêem com `service_role` sem reaplicar
  `can_access_*`.
- F49 — `/api/avatar/[userId]` serve a foto de qualquer `userId` para qualquer
  conta autenticada, sem checar localidade.
- F109 / F110 — destinos de notificação sem reaplicar acesso.
- F5 — CPF sai do `sessionStorage`; a copy de `/consent` é contrato.
- F42 — remover selo público de "Membro verificado" (proibido pelo `AGENTS.md`;
  dentro de uma rede onde todos são verificados, é redundante).

### Onda B — Coerência por subtração

- D1: trava de `community_id` (constraint + policy na mesma migration).
- D3: remover superfície de DM (aba, seletor, thread, item do bottom-nav).
- D2: remover `hidden` — **checar perfis não-seed antes**.
- D7: remover preferência de notificação sem produtor.
- Affordances mortas: "Manter conectado", "Esqueci minha senha" (F1/F2), chevron
  de localidade, foto/enquete no composer (F38/F39), "0 de 3 passos" do grupo,
  comentário de evento "em breve", "salvar" sem destino (F34).
- **Incorporar o diff não commitado** de `bivaque-sign-in.tsx`, que já removeu o
  campo de senha morto mas deixou as duas affordances falsas de pé.

### Onda C — Devolver a fala

- D5: migrations novas derrubam as CHECK de vocabulário em `posts`, `comments`,
  `recommendation_requests`, `recommendation_replies`.
- Atualizar os pgTAP que hoje **afirmam** a rejeição
  (`community-feed-denials.sql:150-155,289-294`).
- Aviso na UI ao detectar padrão de CPF ou CEP real — avisa, não bloqueia.
- Aplicar as correções ao MAP da §4 desta spec.
- A regra `forbidden-copy` da auditoria visual **muda de critério** (D16/D21).
  Ela hoje reprova a exposição de posto e OM na UI; com afiliação declarada
  permitida, o que ela precisa reprovar é a exibição desses campos **como se
  fossem verificados pelo sistema**. Declaração do membro passa; asserção do
  sistema não.

**Bloqueia D e G:** não dá para construir pedido de indicação com "plano",
"telefone" e "preço" proibidos, nem afiliação declarada com "OM" e "patente"
proibidos.

### Onda D — A porta

- Gate único derivado do estado real antes de montar o shell (F16); hoje
  qualquer conta com cookie de consentimento vê Manaus, compositor e "Publicar"
  antes de ser admitida.
- F29 — `/onboarding/welcome` é público: gatear por membership real.
- F27 (P0) — aceite do convite amarrado ao `invitee_email_digest`.
- D13 — link copiável para o titular.
- D9 — consentimento e código de conduta com aceite versionado.
- F19 — validar formato e dígitos do CPF antes de consultar o Portal; erro de
  digitação deixa de virar inelegibilidade persistida.
- D11 / D12 — recurso e `pending` com produtor real; tela de status derivada do
  servidor (F21).
- F18 — falha de callback termina em tela humana, não em JSON 401.
- F17 — um único parâmetro interno de retorno, carregado por todo o fluxo.
- D14 — waitlist coleta a cidade e para de prometer contato.
- F28 — quatro ramos: expirado, usado/revogado, conta já vinculada, conta
  existente ainda elegível.

### Onda E — Ver gente

- F45 — perfil de outro membro (hoje não existe; a própria copy o pressupõe).
- D16 / D21 — afiliação declarada: força, status, OM e turma/período. Opcional,
  marcada como declaração do membro, nunca como verificação do sistema.
- Descoberta por afinidade a partir da afiliação declarada, com OM como eixo
  principal — filtro e busca por OM, com paginação e rate limit contra
  enumeração em massa (D21).
- F46 — notificação de aceite familiar abre o perfil do ator, não o do titular.
- F48 — avatar do cabeçalho usa a mesma fonte do feed.
- F51 / F52 — abas "Publicações" e "Eventos" do perfil filtram pelo titular;
  hoje mostram o feed da localidade e os dez próximos eventos.
- F31 — audiência explícita antes de publicar.
- D18 — política de nomes.

### Onda F — Encontrar-se

- F61 / F76 — abrir detalhe a partir das listas.
- F63-F70 — gestão de grupo: cancelamento, rejeição, remoção, exclusão,
  ownership seguro.
- F77-F89 — eventos: RSVP com "não vou", edição, cancelamento, conclusão
  coerente, validação de data, escopo.
- Convite de evento com fan-out de notificação (o mecanismo existe desde
  `20260806171204_event_invites.sql`; falta o envio pelo organizador).
- **Encontro recorrente** como padrão de primeira classe, seguindo o Military
  App: evento que se repete, com página estável e histórico.

### Onda G — Indicações como dois produtos

**Explorar** — links dos cards para `/groups/[id]` e `/events/[id]` (F116);
copy assume vitrine cronológica, não motor de recomendação (F115).

**Pedir indicação** — hoje é write-only: o insert grava e nada lê.

- Lista de pedidos da localidade e detalhe do pedido (F118).
- Respostas visíveis; `recommendation_replies` e as policies já existem (F122).
- D17 — resposta positiva por construção.
- F119 (P0) — autor encontra, edita e exclui o próprio pedido; a RLS já permite.
- D15 / F120 (P0) — escopo explícito; Saúde começa em grupo.
- F121 (P0) — FK em `group_id` e checagem de membership **na mesma migration**
  que expuser o escopo (regra 6).
- Denúncia aceitando `recommendation_request` e `recommendation_reply` como
  alvo (depende da onda H).
- Retorno ao autor pelo inbox quando alguém responde (F123).

**Salvas** — botão de salvar no objeto salvável e destino consultável (F124).

### Onda H — Operação que age

- F160-F162 — denúncia unificada: um modelo, todos os alvos, um painel.
- F165 / F166 — ocultação esconde de fato cada tipo de alvo.
- D10 — suspensão de conta com motivo registrado, sustentada pelo aceite do
  código de conduta (D9).
- Retorno ao denunciante.
- F173 (P0) — sanitizar e limitar o motivo da denúncia contra PII.
- F175 / F176 — admissions decide, não só observa; consome recurso (D11) e
  `pending` (D12).
- F180-F182 — probes não dão falso verde nem confundem key inválida com
  rejeição de elegibilidade.
- Prazo público de resposta a denúncia.
- Moderação em três camadas, com o moderador de grupo como camada do meio.

## 7. Pré-condições e riscos

1. **D2 toca escolha de pessoa real.** Antes da migration que remove `hidden`,
   consultar se existe perfil não-seed com `visibility = 'hidden'`. Se houver, a
   onda para e a pessoa é avisada. Flipar em silêncio inverte uma decisão de
   privacidade que ela tomou.
2. **Diff não commitado no login.** `bivaque-sign-in.tsx` tem alteração de
   produto pendente; `next-env.d.ts` é artefato do dev server. Tratar na onda B,
   não commitar solto.
3. **A trava do `.visual/`.** Não rodar dev server nem captura visual entre
   `db:reset` e `test:db` — seis asserts de pgTAP quebram com cara de regressão
   real (`AGENTS.md` §Known traps).
4. **Migrations aplicadas não se editam.** Toda mudança de constraint ou policy
   entra como migration nova via `supabase migration new`.
5. **D5 muda testes que hoje passam.** Os pgTAP que afirmam a rejeição de
   vocabulário precisam mudar junto, no mesmo todo.

## 8. Fora de escopo

Publicação anônima e vídeo (D6). Marketplace, anúncios, IA, app nativo e outras
cidades são **deferidos** — não proibidos — e não entram nestas oito ondas.
