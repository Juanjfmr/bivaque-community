---
id: ADR-20260830-verificacao-documental-govbr
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan:
critic_verdict: pending
critic_review:
---

# Verificação documental GOV.BR como fallback provisório de elegibilidade

## Problem

O Bivaque já definiu e implementou o caminho primário de elegibilidade de membro como
`CPF -> Portal da Transparência`, server-side. O canon também prevê um segundo caminho por
upload de documento, mas hoje esse caminho termina em decisão humana na fila de admissões.

Esse fallback manual tem dois problemas para a fase inicial do produto:

1. cria trabalho operacional justamente nos casos em que o Portal não consegue concluir;
2. deixa a automação oficial via SERPRO/VIO como um custo fixo prematuro enquanto o volume
ainda é baixo.

A decisão precisa preservar a fronteira existente: o Portal continua sendo a fonte primária
de elegibilidade. O documento não substitui o Portal por padrão; ele automatiza a exceção.

## Decision

Adotar, de forma provisória e de baixo custo, um segundo caminho automatizado para documentos
militares digitais compartilhados pelo GOV.BR, mantendo revisão humana apenas para casos em
que a automação não consiga concluir.

O fluxo-alvo é:

```text
onboarding
   |
   v
CPF informado
   |
   v
Portal da Transparência
   |-----------------------------|
   | verified                    | não conclusivo / exceção elegível
   v                             v
entra                      upload de PDF GOV.BR
                                  |
                                  v
                         validação criptográfica
                         da assinatura do PDF
                                  |
                                  v
                         extração estruturada
                         por modelo de visão
                                  |
                                  v
                         regra de elegibilidade
                           |              |
                           | conclusiva   | inconclusiva
                           v              v
                        verified     revisão humana
```

### O que a validação criptográfica precisa provar

O backend deve verificar, antes de qualquer extração por IA:

- assinatura CMS/PKCS#7 válida;
- `ByteRange` cobrindo o documento assinado;
- cadeia de certificação até trust anchor ICP-Brasil aceito;
- validade temporal dos certificados;
- status de revogação por CRL/OCSP quando aplicável;
- ausência de alteração posterior que invalide a assinatura.

O resultado dessa etapa é **autenticidade e integridade do documento**. Não é prova de que a
pessoa que fez o upload é necessariamente a titular mostrada no documento.

### Papel da IA

O modelo de visão **não autentica o documento**. Ele só lê campos de um documento que já
passou pela validação criptográfica.

A integração deve ser model-agnostic. O contrato interno recebe o documento ou imagens
extraídas e devolve apenas os campos necessários para a regra de elegibilidade. O modelo
concreto pode mudar sem alterar o domínio de verificação.

Campos que podem atravessar essa fronteira somente quando necessários ao fluxo:

- nome civil;
- CPF;
- tipo de documento;
- Força/emissor;
- situação/categoria apenas se for necessária para classificar a elegibilidade.

Posto/graduação, matrícula, filiação, foto, naturalidade, data de nascimento e demais campos
não devem ser persistidos só porque o extrator consegue lê-los.

### Resultado interno

O método de verificação precisa ser registrado separadamente do estado final:

```text
portal_transparencia_v1
govbr_signed_military_id_v1
manual_document_review_v1
```

Todos podem produzir o mesmo estado de elegibilidade (`verified`). O método é metadado de
auditoria; não deve virar selo público diferente para o membro.

### Evolução futura

A adoção do SERPRO/VIO fica deliberadamente adiada. Quando for contratada, entra como novo
provider, por exemplo `serpro_vio_v1`, sem quebrar o onboarding, o estado de elegibilidade ou
os registros anteriores.

Migrar para VIO não depende apenas de volume. Reabrir esta decisão quando custo deixar de ser
material **ou** quando fraude, auditoria, cobertura documental ou obrigação operacional
justificarem uma fonte oficial dedicada.

## What stays unchanged

- O Portal da Transparência permanece o caminho primário e gratuito para militares federais,
veteranos/reformados e pensionistas cobertos por sua base.
- Dependente continua entrando pelo vínculo familiar previsto no canon; não passa por este
fluxo documental por padrão.
- Anti-enumeração e limite de tentativas do Portal continuam obrigatórios.
- CPF em claro e payload bruto do Portal continuam proibidos de persistir.
- Documento continua em storage privado e com TTL curto.
- Revisão humana continua existindo, mas como último fallback, não como destino automático de
todo upload.
- A validação documental não concede pertencimento a vila/comunidade; ela resolve somente a
elegibilidade de membro.

## Alternatives considered

### 1. Manter Portal + revisão humana para todo documento

É o comportamento-alvo anterior. Tem custo de infraestrutura baixo, mas transfere o custo
para operação humana e não escala bem nos falsos negativos, indisponibilidades ou lacunas do
Portal.

### 2. Contratar SERPRO/VIO imediatamente

É a integração oficial para decodificação/validação de QR VIO e deve permanecer como destino
de maturidade. Foi rejeitada para o início porque adiciona custo fixo antes de haver volume ou
incidência de fraude que o justifique.

### 3. Usar modelo de visão/OCR como verificador

Rejeitada. Aparência visual, OCR e consistência de campos não provam autenticidade. Um modelo
de visão pode extrair os mesmos campos de uma falsificação visualmente convincente.

### 4. Validar assinatura GOV.BR/ICP-Brasil e usar visão apenas para extração

Escolhida como fallback provisório. Separa corretamente duas responsabilidades:
criptografia decide se o documento assinado é íntegro; visão transforma o conteúdo já
confiável em dados estruturados para a regra do Bivaque.

## Market or reference baseline

O próprio canon do Bivaque já usa o Estado como atestador de elegibilidade e o Portal da
Transparência como caminho primário. A documentação oficial do GOV.BR/ITI trata a assinatura
eletrônica como mecanismo de verificação de autoria e integridade, e o VALIDAR é a referência
externa para confrontar a implementação durante testes.

O SERPRO oferece o VIO Decoder para automação de documentos com QR VIO; essa integração fica
como baseline de maturidade, não como requisito do lançamento inicial.

Referências oficiais:

- Portal da Transparência — API de Dados: https://portaldatransparencia.gov.br/api-de-dados
- ITI — VALIDAR: https://www.gov.br/pt-br/servicos/realizar-validacao-de-assinaturas-eletronicas-validar
- SERPRO — VIO Decoder: https://www.gov.br/pt-br/servicos/contratar-solucao-digital-para-automatizar-validacao-de-documento-api-vio-decoder

## Proposed divergence from baseline

O Bivaque não contrata o VIO Decoder no primeiro estágio. Em vez disso, para o subconjunto de
documentos militares digitais compartilhados pelo GOV.BR cuja assinatura possa ser validada
localmente, usa a PKI/ICP-Brasil como prova de integridade/autoria do PDF e um extrator de
visão apenas para leitura dos campos.

Essa divergência é temporária e deliberada para reduzir custo fixo enquanto o produto ainda
cresce.

## Evidence and sources

### Repositório

- `docs/BIVAQUE.md` §4.1: o Estado atesta a elegibilidade; CPF contra o Portal da Transparência.
- `docs/BIVAQUE.md` §4.2: Portal como caminho primário e upload de documento como exceção.
- `docs/BIVAQUE.md` §4.3 / D11: não persistir CPF em claro, payload do Portal ou documento
além do TTL.
- `apps/web/lib/portal/client.ts`: cliente real do Portal da Transparência, server-side.
- `apps/web/lib/portal/classify.ts`: classificador para Aeronáutica, Exército, Marinha,
Ministério da Defesa, ativo, reformado/veterano e pensionista militar.
- `apps/web/lib/onboarding/verifyAndProvision.ts`: elegibilidade separada de provisionamento,
rate limit e persistência somente do outcome.

### Prova técnica executada em 2026-08-30

Foi inspecionada uma amostra real de Carteira de Identificação da FAB compartilhada pelo
aplicativo GOV.BR. A amostra **não deve ser adicionada ao repositório**, pois contém PII.

Na amostra foi confirmado:

- PDF com assinatura `adbe.pkcs7.detached` / CMS;
- hash SHA-256;
- assinatura criptográfica válida;
- documento inteiro coberto pelo `ByteRange`;
- cadeia apresentada até a Autoridade Certificadora Raiz Brasileira v5;
- imagens da carteira e QR dentro da região assinada.

A prova com uma amostra confirma viabilidade técnica do caminho para esse formato; **não
prova cobertura universal de todo documento militar, toda Força ou toda versão futura do
GOV.BR**. A implementação deve falhar fechada quando não reconhecer ou não conseguir validar
o formato.

## Security invariants

1. Nunca mandar o documento para o modelo de visão antes da validação criptográfica.
2. Nunca aceitar `visual_consistency`, OCR ou confiança do modelo como substituto de
assinatura válida.
3. Falha de cadeia, revogação, assinatura ou parser é `inconclusive/rejected`, nunca
`verified` por heurística.
4. O parser de PDF é superfície hostil: limites de tamanho, páginas, objetos e tempo de
processamento são obrigatórios.
5. Não registrar PDF, imagem, QR, CPF ou payload de extração em logs, Sentry ou analytics.
6. O provider de visão recebe o mínimo necessário e precisa ser configurado de acordo com a
governança LGPD antes de produção.
7. A verificação do documento prova o documento, não liveness/posse da pessoa; prevenção de
reuso/duplicidade deve ser tratada separadamente sem persistir CPF em claro.
8. Documentos e artefatos intermediários são apagados ao concluir o fluxo ou ao vencer o TTL.

## Benefits

- mantém custo fixo de verificação próximo de zero no início;
- reduz a fila manual de admissões;
- não transforma IA em autoridade de identidade;
- reutiliza o caminho dual já decidido em vez de criar um terceiro onboarding paralelo;
- preserva migração simples para VIO/SERPRO quando fizer sentido econômico ou operacional;
- permite falhar fechado e mandar só exceções reais para operador.

## Risks

### Segurança

- PDF autêntico pode ter sido obtido de outra pessoa; assinatura válida não é liveness.
- parser de PDF e bibliotecas PKI ampliam a superfície de ataque.
- revogação e trust store precisam de manutenção operacional.
- uma alteração de formato/cadeia do GOV.BR pode derrubar o fallback.

### Privacidade

- documento militar contém mais PII do que o Bivaque precisa.
- envio para provedor de visão cria novo subprocessador/terceiro e precisa entrar na
governança LGPD antes de produção.
- logs acidentais seriam mais graves que no caminho do Portal.

### Produto/operação

- o caminho documental cobre apenas quem consegue produzir documento compatível.
- uma Força ou categoria pode não usar o mesmo formato.
- falsos inconclusivos ainda chegam à revisão humana.

### Compliance

- a implementação local precisa ser tratada como verificação técnica própria do Bivaque; não
deve ser apresentada como "validação SERPRO/VIO" ou como integração oficial que não existe.

## Reversal cost

Baixo a médio se o provider for isolado por interface. Para substituir pelo VIO:

1. adicionar `serpro_vio_v1`;
2. manter os outcomes e métodos anteriores por auditoria;
3. desligar `govbr_signed_military_id_v1` para novas verificações, se desejado;
4. não exigir reverificação em massa sem incidente ou requisito explícito.

O custo sobe se dados específicos do extrator vazarem para o schema de domínio. Por isso o
contrato deve normalizar o resultado antes de persistir qualquer coisa.

## Success metric

No primeiro período operacional com fallback documental:

- >= 90% dos PDFs GOV.BR reconhecidos e criptograficamente válidos terminam sem intervenção
humana;
- 0 documentos/CPFs/payloads brutos persistidos fora do TTL;
- 0 `verified` originados de falha criptográfica ou somente de confiança do modelo;
- taxa de revisão humana medida separadamente por motivo de inconclusão;
- custo médio de extração registrado por verificação para comparar com o custo futuro do VIO.

Não existe meta de "converter rejeitado do Portal": documento só pode ser oferecido como
fallback pelos estados explicitamente definidos pelo fluxo, sem revelar ao cliente a causa
interna da consulta ao Portal.

## Reopen condition

Reabrir obrigatoriamente se ocorrer qualquer um dos seguintes:

- fraude confirmada usando documento autêntico de terceiro;
- mudança do formato/cadeia do GOV.BR que aumente materialmente os inconclusivos;
- mais de 10% dos documentos compatíveis exigindo revisão humana por 30 dias;
- requisito jurídico, contratual ou de auditoria por validação oficial dedicada;
- custo mensal do fallback aproximar-se do custo total do VIO/SERPRO;
- volume ou risco operacional tornar o VIO economicamente imaterial;
- necessidade de cobrir documentos que a validação local não consegue autenticar com
segurança.

## Approval

Direção humana registrada em 2026-08-30: manter o Portal da Transparência como primeira
verificação; usar a validação documental GOV.BR como solução **provisória de baixo custo**
enquanto o Bivaque cresce; adotar a API oficial do SERPRO/VIO posteriormente se volume,
custo, fraude ou necessidade operacional justificarem.

O owner também solicitou explicitamente que esta decisão fosse documentada.

Como esta decisão é R3 por tocar verificação de identidade, PII e segurança, ela permanece
`proposed` até receber `critic_verdict: pass` conforme `RISK_MATRIX.md`. A aprovação humana
está registrada; o gate de crítica independente ainda não foi executado.
