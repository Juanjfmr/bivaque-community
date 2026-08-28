---
id: ADR-20260828-termos-e-condicoes
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan:
critic_verdict: pending
critic_review:
---

# Termos e Condições de Uso e de Tratamento de Dados Pessoais

## Problem

O Bivaque tem código de conduta e política de privacidade, e não tem **contrato**. Faltava o
documento que diz quem pode usar o produto, o que a pessoa pode publicar, que licença ela nos
dá sobre o que escreve, o que acontece com a conta dela, o que o Bivaque garante e o que não
garante, e sob qual lei e foro isso tudo se resolve.

Os dois cards de bloqueio de lançamento tornam isso concreto:

- **BLOCK-LEGAL-ENTRY** registra que a tela de consentimento exibe, dentro da região que o
  membro rola e aceita, notas editoriais dizendo que o texto é rascunho pendente de revisão.
  A auditoria `onboarding-aaa-v1-2026-08-22` é a evidência.
- **BLOCK-LEGAL-AI** registra que não há governança publicada para saída de conteúdo
  comunitário a terceiros.

Nenhum dos dois se resolve escrevendo mais política de privacidade. O que falta é a peça
contratual, e ela precisa carregar o capítulo de LGPD de forma que o membro consiga ler.

Some a isso um risco específico deste produto: o Bivaque trata dado que identifica **militar
federal por localidade**. A LGPD não classifica condição militar como dado sensível (art. 5º,
II), mas a agregação por unidade ou por local produz risco que o dado isolado não produz —
é a mesma regra anti-mosaico que o projeto-mãe já carrega e que o
[`ADR-20260811-om-declarada`](ADR-20260811-om-declarada.md) discute. Um termo que não nomeia
esse cuidado não descreve o produto.

## Decision

**1. Criar `docs/legal/TERMOS_E_CONDICOES.md`**, terceiro documento do acordo, aceito junto
com o código de conduta e a política de privacidade. Ordem de prevalência em matéria de dados
pessoais: **vale o mais protetivo ao titular**.

**2. Estrutura na forma dos Termos de Serviço da Meta**, com o capítulo de LGPD substantivo
dentro do próprio contrato: o que oferecemos → como nos sustentamos → quem pode usar → seus
compromissos → as permissões que você nos dá → dados pessoais → limites → mudanças → foro.

**3. O capítulo 8 é operável, não decorativo.** Tabela de finalidade e base legal por
tratamento, com artigo citado; o que nunca é tratado; a lista de operadores separando **em
uso** de **quando o recurso for ativado**; prazos de retenção; os direitos do art. 18 com os
limites declarados; transferência internacional pelo art. 33; incidente pelo art. 48;
encarregado pelo art. 41; e revisão de decisão automatizada pelo art. 20.

**4. O art. 20 já está satisfeito pelo desenho, e o texto diz isso.** A consulta ao Portal é
automatizada, mas a negativa **não** é: existe o caminho documental analisado por pessoa e
existe recurso. Isso é garantia de revisão, não favor operacional.

**5. Conteúdo comunitário não sai para provedor de IA** enquanto a governança do
BLOCK-LEGAL-AI não estiver publicada e aprovada. Fica escrito no contrato, e não só no board.

**6. O estado editorial sai do corpo aceito e vira front matter.** `version`, `status`,
`review_blocker`, `updated_at` e `pending` viram metadado YAML; o renderizador de `/consent`
descarta o bloco. A nota de revisão continua existindo, versionada junto do documento, sem
nunca ser exibida como se fosse cláusula. Isso resolve o achado do BLOCK-LEGAL-ENTRY **sem**
fingir que a revisão jurídica aconteceu.

**7. Três guardas mecânicas passam a existir**, porque o vínculo era só de intenção:

- a `version` do front matter tem que casar com `CONSENT_VERSION` / `CODE_OF_CONDUCT_VERSION`
  de `@bivaque/domain` — publicar texto novo sem virar o inteiro gravaria aceite apontando
  para a versão errada, e a linha de aceite é justamente a prova de que a pessoa concordou
  com aquele texto;
- documento `draft` tem que apontar um `review_blocker` que exista e **não** esteja `done`;
- documento `published` não pode conter `<<DEFINIR>>`.

**8. Cinco posições substantivas do texto são propostas desta ADR** e precisam da decisão do
dono, porque nenhuma delas é derivável do que já está decidido:

**Decididas pelo dono em 2026-08-28.** Duas mudaram em relação ao que eu havia proposto, e a
mudança está registrada em vez de ser silenciada.

| # | Decisão | Por quê |
|---|---|---|
| 8.1 | **18 anos para qualquer conta, inclusive familiar** | o convite familiar mira dependente, e dependente pode ser menor. Admitir menor aciona o art. 14 (consentimento específico do responsável) e exige mecanismo de verificação que não existe. É a única posição implementável hoje. **Reabre** se a demanda por adolescente na vila aparecer: a faixa 16+ evita o corte de "criança" do art. 14 §1º e é o próximo degrau |
| 8.2 | Licença **não exclusiva, gratuita, limitada à operação, revogável — e com cláusula de sucessão** | a licença mínima estava certa; faltava a sucessão. Sem ela, transferir o Bivaque para o veículo jurídico do §7.6 obrigaria a recolher aceite de toda a base para seguir exibindo o que já foi publicado. A cláusula preserva as condições e dá ao membro aviso prévio e saída — não amplia nada |
| 8.3 | Registro de moderação em **legítimo interesse (art. 7º, IX) + exercício regular de direitos (art. 7º, VI)**, com prazo **escalonado**: remoção e suspensão grave 2 anos, conversa reservada e conteúdo ocultado 6 meses | os 2 anos uniformes do rascunho não passavam no teste de necessidade do art. 6º, III: a finalidade declarada — impedir o retorno de quem foi removido — não cobre um aviso reservado. O prazo agora acompanha a finalidade, ao custo de um job de expurgo com TTL por tipo de ação |
| 8.4 | Cancelamento **ao fim do período pago, sem devolução proporcional**, mais o **arrependimento de 7 dias do art. 49 do CDC** declarado no texto | o cancelamento é o que o [`ADR-20260820-alcance-pago`](ADR-20260820-alcance-pago.md) §3 já decidira. O arrependimento faltava: vale por lei mesmo com o contrato calado, e calar sobre ele é omissão de informação que o próprio CDC pune |
| 8.5 | Foro da **comarca de Manaus**, com ressalva expressa do domicílio do consumidor | Manaus não é conveniência do Bivaque — é onde o piloto roda e onde a comunidade está, o que afasta a abusividade que o CPC art. 63 §3º autoriza o juiz a reconhecer de ofício. A ressalva cobre o membro transferido (D51) |

**9. As quatro lacunas do veículo jurídico, decididas em 2026-08-28.** Duas fecharam sem
depender da constituição da entidade; duas seguem abertas por dependerem dela.

| Lacuna | Decisão | Estado |
|---|---|---|
| **Encarregado** | Não indicar nominalmente por ora. A Resolução CD/ANPD nº 2/2022 dispensa o **agente de tratamento de pequeno porte** de indicar encarregado, exigindo canal de comunicação com o titular — que passa a existir. Indicação nominal quando o veículo for constituído | **fechada** — o `<<DEFINIR>>` virou frase afirmativa |
| **Foro** | Comarca de Manaus, com ressalva ao consumidor (item 8.5) | **fechada** |
| **Canal do titular** | Endereço dedicado de privacidade, roteado ao encarregado e separado do suporte comum, com 15 dias para dado pessoal | decidida; o **endereço concreto** depende do domínio próprio — entra no `BLOCK-RESEND` |
| **Controlador** | Hipótese de trabalho levada ao parecer: **sociedade limitada com terceiro na gerência, fundador como quotista sem gerência** — a exceção que o próprio Art. 29 da Lei 6.880/80 carimba. Produz o CNPJ de que Asaas, WhatsApp Cloud API e o domínio dependem | direção fixada; **razão social, CNPJ e endereço só existem com a entidade constituída**. Segue `<<DEFINIR>>` |

## Alternatives considered

**A. Não ter Termos, e deixar conduta + privacidade cobrirem tudo.** É o estado atual.
Rejeitada: nenhum dos dois trata licença de conteúdo, limitação de responsabilidade, relação
com prestador, encerramento ou foro. Na primeira disputa com um prestador ou na primeira
requisição de titular, o produto não tem o que apresentar.

**B. Termo enxuto de uma página, remetendo tudo à política de privacidade.** Rejeitada: o
pedido é explicitamente por um documento de LGPD, e a LGPD exige que finalidade, base legal,
compartilhamento, retenção e direitos estejam **informados ao titular** (art. 9º). Espalhar
isso entre dois documentos que podem divergir de versão é como se produz a contradição que
depois vira sanção. A escolha foi capítulo substantivo no contrato, com a política mantendo o
detalhe operacional, e a regra do mais protetivo resolvendo conflito.

**C. Copiar um modelo de termos de marketplace.** Rejeitada por ser factualmente errada aqui:
o Bivaque **não intermedia** a transação entre membro e prestador (D26), não retém valor e não
é parte no contrato. Um termo de marketplace assumiria obrigações que o produto não tem e
prometeria garantias que ele não pode dar.

**D. Esperar o veículo jurídico do §7.6 para só então escrever.** Rejeitada: as quatro
lacunas que dependem do veículo (controlador, encarregado, canal, foro) são **quatro campos**,
não o documento inteiro. Bloquear 100% do texto por 4 preenchimentos foi o que manteve o card
parado desde 2026-08-22. Os campos ficam como `<<DEFINIR>>` e a guarda mecânica do item 7
impede que o texto seja publicado com eles em aberto.

## Market or reference baseline

**Meta (Facebook / Instagram), Termos de Serviço.** A estrutura de referência: "Nossos
serviços" → "Como nossos serviços são financiados" → "Seus compromissos" (quem pode usar, o
que pode compartilhar, permissões que você nos dá) → "Disposições adicionais" (atualização
dos termos, suspensão e encerramento, limites de responsabilidade, disputas) → "Outros termos
e políticas aplicáveis". Voz em segunda pessoa, seções numeradas, período curto.

**ANPD.** O [guia de segurança para agentes de tratamento de pequeno porte](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte)
e a página de [direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).

**Legislação:** Lei 13.709/2018 (LGPD), Lei 12.965/2014 (Marco Civil), Lei 8.078/1990 (CDC).

## Proposed divergence from baseline

Três divergências deliberadas em relação à Meta:

1. **Não vivemos de publicidade, e o texto diz isso na seção que a Meta usa para explicar o
   contrário.** "Como o Bivaque se sustenta" declara que não vendemos dados, não usamos
   conteúdo para treinar modelo de terceiro, e lista o que o dinheiro **nunca** compra —
   posição em busca, prioridade em indicação, ausência do rótulo de patrocínio, remoção de
   concorrente, anúncio em feed, crédito consignado militar.
2. **A licença sobre conteúdo é revogável e limitada à operação.** A da Meta é
   sublicenciável e transferível. Aqui não há a quem sublicenciar, e uma licença ampla num
   produto de comunidade fechada só cria exposição sem contrapartida.
3. **O capítulo de LGPD é substantivo dentro do contrato**, não um link para outro documento.
   Justificado no item B das alternativas.

## Evidence and sources

- `docs/legal/TERMOS_E_CONDICOES.md` — o texto proposto.
- `tools/backend-kanban/public/board.json` — cards `BLOCK-LEGAL-ENTRY` e `BLOCK-LEGAL-AI`.
- `docs/BIVAQUE.md` §4.3 (privacidade), §4.4 (governança LGPD), §7.6 (veículo jurídico),
  §7.7 (terceiros), §5.4 (convites).
- [`ADR-20260820-alcance-pago`](ADR-20260820-alcance-pago.md) §3 e §5 — tolerância de 7 dias,
  cancelamento ao fim do período, rótulo de patrocínio, o que nunca entra na venda.
- [`ADR-20260820-conta-de-prestador`](ADR-20260820-conta-de-prestador.md) §1 e §3 — entrada
  por indicação e o que o prestador enxerga, exaustivamente.
- [`ADR-20260820-suspensao-de-conta`](ADR-20260820-suspensao-de-conta.md) §1 a §3 — quem
  suspende, prazos, e que a suspensão tira escrita e não leitura.
- `supabase/migrations/20260820000003_verification_reconcile.sql:5` — `verification_outcomes`
  tem teste que **proíbe** coluna de CPF. É a prova de que a afirmação "o CPF não é
  armazenado" descreve o schema, e não uma intenção.
- `apps/web/lib/logger.ts` e `apps/web/lib/portal/redact.ts` — a filtragem de PII antes de
  qualquer envio a terceiro.
- `tests/unit/legal/front-matter.test.ts`, `tests/scope/legal-documents.test.mjs` — as guardas
  do item 7, com falha provada por mutação.

## Benefits

O produto passa a ter contrato. As quatro lacunas do dono ficam **isoladas e nomeadas** em
vez de espalhadas por três documentos, e uma guarda mecânica impede publicar com elas abertas.
O achado da auditoria do BLOCK-LEGAL-ENTRY é corrigido de verdade — a nota de revisão continua
existindo, só deixa de ser exibida como cláusula. E o vínculo entre a versão do texto e a
linha de aceite deixa de ser convenção e vira teste.

## Risks

- **Texto jurídico escrito por não-advogado.** É o risco principal e ele não é mitigável por
  revisão interna. Por isso o documento nasce `status: draft` e a guarda impede publicação com
  `<<DEFINIR>>` em aberto. **Este ADR não substitui parecer profissional.**
- **Divergência entre os três documentos.** Hoje já existe uma: `PRIVACIDADE.md` lista oito
  terceiros como se todos recebessem dado, mas PostHog, Asaas e WhatsApp **não estão
  integrados** — não há dependência nem variável de ambiente para nenhum dos três. Os Termos
  descrevem isso com a coluna "situação". Reconciliar a política de privacidade é trabalho
  seguinte, registrado no board.
- **Limitação de responsabilidade contra consumidor.** Cláusula ampla demais é nula pelo CDC.
  Mitigado pela ressalva expressa do capítulo 11, mas é exatamente o ponto que o parecer deve
  olhar primeiro.
- **A posição de idade (8.1) pode não ser a que o dono quer.** Se ele quiser admitir
  dependente menor, o art. 14 entra e o produto precisa de mecanismo de consentimento de
  responsável — que não existe e não é pequeno.

## Reversal cost

Baixo enquanto `status: draft`: o documento não está no fluxo de aceite e nenhuma linha de
`consent_acceptances` aponta para ele. Depois de publicado e aceito, mudar posição
substantiva exige versão nova, aviso e — nos casos do capítulo 12 — **aceite novo** de toda a
base. Colocar os Termos no fluxo de aceite exige migration (`record_consent_acceptance` hoje
recebe duas versões, não três) e é trabalho separado, listado como próximo passo do card.

## Success metric

O card `BLOCK-LEGAL-ENTRY` sai de `blocked` com: os três documentos em `status: published`,
zero `<<DEFINIR>>`, os Termos no fluxo de aceite com versão gravada, e prova de aceite novo
mais rejeição de versão obsoleta.

## Reopen condition

Qualquer uma reabre: parecer jurídico divergindo de posição do item 8; definição do veículo
do §7.6 mudando o controlador; ativação de PostHog, Asaas, mensageria ou IA sobre conteúdo
comunitário (cada uma exige versão nova do capítulo 8.4); aprovação do
`ADR-20260811-om-declarada`, que acrescenta afiliação declarada como tratamento consentido; ou
manifestação da ANPD sobre tratamento de dado de agente público por comunidade privada.

## Approval

**As oito decisões de conteúdo estão aprovadas pelo dono em 2026-08-28**, uma a uma, em sessão:
as cinco posições substantivas do item 8 e as quatro lacunas do item 9. Onde a decisão divergiu
da minha proposta — sucessão na licença (8.2), retenção escalonada (8.3), arrependimento (8.4) —
a divergência está registrada na própria tabela, e o texto foi reescrito para segui-la.

**O ADR permanece `proposed`, e isso não é formalidade.** Faltam duas coisas que a aprovação do
dono não substitui:

1. **Parecer jurídico profissional.** Escrevi o texto e não sou advogado. O primeiro ponto a
   olhar é o capítulo 11 (limitação de responsabilidade) contra o CDC; o segundo é o
   enquadramento do Art. 29 da Lei 6.880/80 sobre a hipótese de veículo do item 9.
2. **Constituição do veículo jurídico.** Sem entidade não há razão social, CNPJ nem endereço, e
   o capítulo 8.1 não pode deixar de ser `<<DEFINIR>>` — a guarda de escopo
   (`tests/scope/legal-documents.test.mjs`) impede publicar com placeholder aberto.

Não há veredito de crítico independente sobre este ADR. Registrado aqui em vez de omitido.
