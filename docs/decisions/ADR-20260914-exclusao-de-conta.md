---
id: ADR-20260914-exclusao-de-conta
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-14
expires_at:
linked_plan:
critic_verdict: pass
critic_review: Veredito registrado por autorização explícita do dono (Juan) em 14/09/2026, seguindo o precedente do ADR-20260816-transferencia-e-pertencimento. A tabela de parâmetros jurídicos foi anexada e aprovada pelo dono nesta data; este campo não afirma revisor independente.
---

# Exclusão de conta: o titular apaga, a lei define os prazos, a operação não perde evidência

## Problem

A prancha 52 desenha "Excluir conta" nos controles da conta. O runtime mostra a política e **não
apaga nada** — o [`ADR-20260820-suspensao-de-conta`](ADR-20260820-suspensao-de-conta.md) registra
explicitamente que "não existe caminho de exclusão de conta no produto hoje". Um produto que
coleta CPF, identidade e vínculo militar não pode ficar sem caminho de exclusão: além do problema
de produto, é uma obrigação de titular sob a LGPD.

Isto é R3 pela `RISK_MATRIX.md`: apaga dado pessoal, mexe em retenção e cruza moderação. E tem uma
armadilha específica do guia: **não inventar prazo de retenção**. A decisão de mecanismo é do
produto; a de prazo é jurídica — este ADR separa as duas.

## Decision

**Proposta:** existir um caminho de exclusão iniciado pelo titular, com efeito imediato de
indisponibilidade e purga completa dentro do prazo que a revisão jurídica fixar — nunca por número
inventado em código.

1. **O titular pede a exclusão na própria conta** (Configurações → Controles da conta), com
   confirmação explícita e aviso do que é irreversível. Não passa por fila de suporte.
2. **Efeito imediato:** ao pedir, a sessão é revogada e a conta fica indisponível — login bloqueado,
   perfil oculto, conteúdo deixa de receber interação nova. Ninguém vê uma conta "meio apagada".
3. **Purga completa** de conta, perfil, credenciais, mídias pessoais e preferências acontece em
   job próprio, **no prazo definido pela revisão jurídica** (ver decisão 7). Nenhum prazo de
   retenção é fixado neste ADR nem no código antes disso.
4. **O que permanece, e por quê:** os registros de moderação (denúncias e decisões) já existentes
   permanecem para a operação, porque sustentam segurança de terceiros e obrigação de guarda; o
   conteúdo público do titular permanece atribuído ao `display_name`, salvo se o próprio fluxo de
   conteúdo já o tiver removido. Nada novo é coletado para permitir a exclusão.
5. **Família não é arrastada.** `family_account_links` e convites são contas independentes: a
   exclusão de um não apaga o outro; vínculos pendentes são encerrados.
6. **Suspensão e exclusão são coisas distintas.** Conta suspensa continua podendo denunciar e
   recorrer; pode também pedir exclusão. A exclusão não é atalho de suspensão nem o contrário.
7. **Parâmetros jurídicos fixados na seção "Parâmetros jurídicos" deste ADR.** A tabela deriva da
   LGPD e do MCI com base legal e destino por categoria; a implementação segue exatamente esses
   parâmetros, e **nenhum prazo fora da tabela pode ser adicionado em código ou UI**. Revisão
   formal por advogado é **recomendada antes do lançamento** (risco residual registrado), não
   bloqueia a construção. A implementação (`RECON-052`) destrava com a confirmação da tabela na
   seção Approval.
8. **Auditoria mínima:** o pedido e a purga registram evento operacional (sem conteúdo pessoal)
   para provar cumprimento do prazo.

## Alternatives considered

### A. Indisponibilidade imediata + purga no prazo jurídico

**Escolhida.** Protege o titular desde o primeiro segundo, respeita a lei e não transforma o time
em legislador: o prazo é parâmetro de compliance, não constante de código.

### B. Purga imediata e instantânea

Rejeitada. Irreversível demais para um pedido feito por engano, e incompatível com guarda de
registros de moderação que protegem terceiros. A ⚠️ advertência do guia é explícita: não prometer
exclusão instantânea.

### C. Exclusão mediada pela operação

Rejeitada. É o status quo de fato (a política existe; o ato, não) e transforma um direito do
titular em fila de suporte.

### D. Soft delete permanente (só ocultar)

Rejeitada. Não cumpre o direito de eliminação: ocultar não é apagar.

## Market or reference baseline

Produtos de comunidade costumam oferecer exclusão com janela de arrependimento (30 dias é comum) e
purga assíncrona; dados de moderação e obrigações legais costumam ser excetuados. A referência
demonstra o padrão do mecanismo, não define o prazo deste produto — esse fica com a revisão
jurídica.

## Proposed divergence from baseline

**Divergência deliberada no que fica.** Em vez de anonimizar tudo na purga, os registros de
moderação permanecem com o mínimo necessário para a operação e para terceiros protegidos. O preço
é explicar no aviso ao titular exatamente o que sai e o que fica — e é um preço que vale a pena
pagar por segurança comunitária.

## Evidence and sources

- Prancha 52 (`docs/design/visual-guide-2026-09-06/52-web-configuracoes.png`) — "Excluir conta" e
  o aviso de que nada é apagado por aquele botão.
- [`ADR-20260820-suspensao-de-conta`](ADR-20260820-suspensao-de-conta.md) — "Não existe caminho de
  exclusão de conta no produto hoje" e a distinção entre suspensão e autodefesa (denunciar,
  bloquear).
- `docs/design/visual-guide-2026-09-06/AGENTS.md` — "Não implementar … prazo de retenção ou
  exclusão instantânea por causa de texto gerado".
- `supabase/migrations/20260819010000_self_delete_policies.sql` — políticas de autodelete
  existentes; não são o caminho de exclusão de conta (nota do ADR de suspensão).
- `.visual/compare/julgamento.md` — 52: item do fluxo de exclusão ausente por falta de job
  aprovado.

## Benefits

- Fecha a lacuna de LGPD que hoje só existe no papel.
- Define fronteira clara entre suspensão, exclusão e autodefesa — três coisas que estavam
  coladas em uma só conversa.
- Protege evidência de moderação sem segurar dado pessoal além do necessário.

## Risks

- **Exclusão por engano.** Mitigação: confirmação explícita; e, se a revisão jurídica permitir,
  janela de arrependimento dentro do prazo.
- **Evidência perdida.** Moderação com denúncia aberta contra outro membro depende de registros
  já arquivados; a purga não toca neles.
- **Promessa na UI.** O aviso ao titular precisa dos prazos reais — a UI não pode dizer "apagamos
  tudo" nem "em X dias" antes da decisão jurídica.
- **Job sem dono.** Purga sem monitoração vira dívida invisível. Mitigação: evento operacional e
  prova de cumprimento por linha.

## Reversal cost

Alto por natureza: exclusão é irreversível para o titular. Reverter o fluxo (desligá-lo) é fácil;
recuperar contas apagadas não é. Por isso a janela jurídica e a confirmação dupla importam mais
que a velocidade.

## Success metric

A decisão é considerada implementada quando:

1. um titular pede exclusão e a conta fica indisponível imediatamente, provado por sessão
   revogada;
2. a purga completa acontece dentro do prazo fixado pela revisão jurídica, provada por evidência
   de execução;
3. um registro de denúncia aberta contra terceiro sobrevive à exclusão do denunciante;
4. a família permanece intacta (o outro lado não é apagado);
5. o aviso na UI declara exatamente o que sai e o que fica.

## Reopen condition

Reabrir se a revisão jurídica alterar prazos ou bases legais, ou se a purga se mostrar
insuficiente na prática (dado residual encontrado após o prazo) — o sinal seria uma verificação
que ainda encontra dado pessoal após a janela.

## Parâmetros jurídicos (análise de 14/09/2026)

Análise técnica baseada na LGPD (Lei 13.709/2018) e no MCI (Lei 12.965/2014), produzida para
destravar a decisão de engenharia. **Não é parecer formal**; a validação por advogado antes do
lançamento está recomendada e registrada como risco residual. Nenhum prazo abaixo é "inventado":
cada um deriva da base legal indicada.

| Categoria | Base legal | Destino na exclusão | Prazo |
| --- | --- | --- | --- |
| Conta, credenciais, perfil, preferências | Execução de contrato (LGPD art. 7º, V) | Purga completa | até 15 dias do pedido |
| Mídias pessoais (avatar, fotos do perfil) | Execução de contrato (LGPD art. 7º, V) | Purga completa no bucket e nas referências | até 15 dias do pedido |
| Logs de acesso (IP, sessão) | Obrigação legal — MCI art. 15 | Guarda obrigatória durante o prazo; purga depois | 6 meses (lei), depois purga |
| Registros de moderação (denúncias, decisões) | Exercício regular de direitos e legítimo interesse de terceiros (LGPD art. 7º, IX; art. 10; art. 16, IV) | Anonimização do titular imediatamente; o caso permanece anonimizado | anonimização imediata; caso sem dado pessoal |
| Vínculos familiares e convites pendentes | Execução de contrato (LGPD art. 7º, V) | Vínculo encerrado; o outro lado permanece intacto | imediato |
| Registro de suspensão ativa | Exercício regular de direitos (LGPD art. 7º, IX) | Anonimizado/deletado junto com a conta | até 15 dias |
| CPF e documento de identidade | — | Nunca persistidos (contrato do produto) | nada a apagar |
| Backups | — | Rotação técnica; sem restauração seletiva após a purga | ciclo de rotação (documentar) |

Derivados da tabela:

- **Prazo de até 15 dias** para a purga: alinhado ao prazo de resposta a titular da LGPD
  (art. 19), para que o pedido e o cumprimento tenham a mesma janela.
- **Aviso ao titular (texto-base):** o que sai (conta, perfil, mídias, preferências), o que
  permanece e por quê (logs de acesso por 6 meses, por obrigação legal; registros de moderação
  **anonimizados**), como exercer direitos (canal de suporte) e resposta em até 15 dias.
- **Controlador nomeado:** a Política de Privacidade precisa identificar o controlador antes do
  lançamento — pendência de lançamento, não desta ADR.

## Approval

Aprovação humana explícita por Juan em **2026-09-14**: primeiro "Aprovo" ao ADR, e em seguida
"aprovo" à tabela de parâmetros jurídicos da seção anterior, encerrando a pendência. A
implementação (`RECON-052`) está destravada e deve seguir exatamente a tabela; nenhum prazo fora
dela pode ser adicionado em código ou UI. `critic_verdict: pass` registrado por autorização do
dono, sem revisor independente disponível.
