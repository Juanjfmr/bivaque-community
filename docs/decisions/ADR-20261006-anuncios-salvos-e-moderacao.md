---
id: ADR-20261006-anuncios-salvos-e-moderacao
status: approved
risk: R3
owner: Juan
approved_at: 2026-10-06
critic_verdict: pass
critic_review: Luna independente confirmou os quatro ajustes na tentativa 2 e aprovou os dois deltas restantes na tentativa 3 em 06/10/2026. Juan aprovou explicitamente as regras propostas nesta conversa depois do PASS.
---

# Salvar e denunciar anúncios do Figma atual

## Problema e autoridade

As ações Salvar e Reportar estão nas pranchas property-list e property-detail do
Figma `niuOHiHkyc9eGaIQBY9hq4`, incluídas na entrega autorizada pelo dono.
Não se solicita novamente aprovação para a existência dessas ações.
A proposta fecha os comportamentos de dados, acesso e moderação que os ADRs
aprovados de anúncios, mídia e conversa não especificam.

O código possui post_saves e recommendation_saves, mas não listing_saves.
Reports possui alvos polimórficos, deduplicação e resolução por operador,
mas listings não está no enum nem nos consumidores de resolução/listagem.
Anúncios não têm marca dedicada de ocultação pela moderação. Usar closed
confundiria ação do anunciante com decisão de operador.

## Decisão proposta

### Salvos privados

Criar listing_saves com chave única user_id/listing_id, FKs, RLS habilitada
e forçada e grants mínimos na mesma migration. A relação é privada do membro.
Somente ele pode criar, listar e remover seu save; nenhum operador ou outro
membro ganha acesso pela interface normal. Salvar/remover são idempotentes.

Salvar exige anúncio active, não ocultado pela moderação e público alcançado.
O dono também pode salvar seu anúncio active e visível, pela mesma regra comum.
Salvar não publica, reativa ou amplia o público do anúncio.
O público do anúncio segue imutável e nenhuma cópia de conteúdo é persistida
na relação. O estado Salvo aparece nos cards/detalhe e persiste por reload.
A lista de salvos reaproveita a leitura autorizada do anúncio e dá retorno real.

Quando um anúncio deixa de ser alcançável por mudança de associação do membro,
estado ou moderação, seu conteúdo e fotos deixam de aparecer nos salvos.
A relação privada pode permanecer, sem títulos, fotos ou dados em placeholders,
e voltar a aparecer quando o anúncio se torna elegível novamente. DELETE próprio
permanece possível mesmo sem acesso ao anúncio; exclusão definitiva do anúncio
remove a relação por cascade. Nenhum contador revela anúncio inacessível.
Mesmo depois de perder acesso, o membro pode ler/remover somente IDs e data
da própria relação; os joins continuam sujeitos à RLS do anúncio e da mídia.
O anunciante não lê saves de outros membros. A interface normal nunca usa
service_role para listar salvos nem calcula popularidade a partir dessas relações.

### Denúncia e ocultação pela moderação

Adicionar listing ao enum em migration separada quando necessário para uso
seguro do enum, e depois atualizar conjuntamente validação do alvo, RLS/guard,
bloqueio de autorrelato, listagem, rótulos, resolução e consumidores web.
Uma denúncia exige sessão e anúncio active, não ocultado, de outro dono,
dentro da audiência do denunciante. UUID inexistente e alvo não autorizado
recebem a mesma negativa; a mensagem não confirma existência ou conteúdo.
Preservar deduplicação de denúncia aberta por membro/alvo, motivo validado
e identidade do denunciante privada segundo a infraestrutura de reports.

Ocultar é decisão auditada de operador, separada de status do anunciante.
Adicionar marca de moderação própria, data e ator autorizado; o membro nunca
pode alterá-la por INSERT/UPDATE direto ou action. Hide mantém status original
e registra a resolução de reports e auditoria; não falsifica história de status
como se o dono tivesse encerrado. Dismiss resolve a denúncia sem ocultar.

Anúncio ocultado desaparece de busca, salvos e detalhe de terceiros, inclusive
por UUID direto. A mesma regra protege URLs privadas das fotos e impede novo
interesse. O dono pode ver e editar seu anúncio com aviso claro da ocultação,
mas editar, pausar ou reativar não remove a restrição. Somente operador pode
restaurar, por ação explícita auditada; a restauração não altera status nem público.
Se houver restauração, apenas active e audiência autorizada voltam a ler.

Criar trilha append-only listing_moderation_events, com listing_id, ação
hide/restore, operador, report_id quando aplicável, motivo/nota e timestamp.
Somente RPC de operador autorizado insere eventos; ator vem de auth.uid(),
nunca de argumento do cliente. Membros e operadores não recebem escrita direta,
UPDATE ou DELETE na trilha. RLS forçada permite leitura somente à operação
autorizada; o dono recebe o estado/aviso do anúncio, sem identidade do denunciante.
Hide/restore e evento são atômicos, com lock do anúncio; repetir a mesma ação
não fabrica evento duplicado. Hide ligado à denúncia também resolve reports
na mesma transação. Uma denúncia já resolvida não pode executar novo hide.

Para listing, criar RPC específico SECURITY DEFINER chamado com o JWT da
sessão authenticated, derivando operador de auth.uid() e verificando o papel
canônico de operador dentro da transação. Search_path vazio e grants mínimos;
nenhum argumento de identidade do operador é aceito. A server action usa o
cliente da sessão do caller para esse ramo, nunca service_role com ID repassado.
Restauração usa a mesma via de identidade/autorização. O resolve_report atual
por service_role dos outros alvos continua preservado; a seleção de ramo depende
do tipo real da denúncia, reconsultado e autorizado pelo RPC, não de dado confiado
do browser. Negativas incluem JWT de membro e tentativa de resolver report de
outro tipo pela via listing; o caller nunca escolhe o ator da auditoria.

### Fotos após revogação de acesso

A interface passa a usar endpoint autenticado para bytes de mídia, com checagem
da sessão, vínculo da mídia ao anúncio, audiência, status e moderação em cada
requisição. Não expor signed URLs do Storage no HTML, JSON, redirecionamento
ou otimização de imagens. Download no servidor usa o acesso autorizado do
caller. Respostas de bytes e metadados usam Cache-Control
private, no-store e não passam por cache compartilhado/otimizador do Next.
Alvo inexistente e não autorizado produzem a mesma negativa sem metadados.

A matriz de mídia é explícita: dono autenticado lê o próprio anúncio em qualquer
status ou ocultação, para edição e aviso; terceiros exigem active, não ocultado
e audiência atual. Operador não ganha exceção de bytes neste endpoint ou na UI
de reports por ser operador; segue a mesma regra de leitura do membro, ou de
dono quando aplicável. A lista de reports fornece dados textuais autorizados
à operação. Não usar service_role para contornar a matriz de mídia do caller.

Novas requisições de terceiros são negadas imediatamente após ocultação ou
perda de audiência, mesmo reutilizando a URL do endpoint. Dados já baixados
ou uma transferência autorizada antes da revogação não podem ser recolhidos.
O mecanismo atual de URLs assinadas, TTL de 600 segundos, não entrega essa
garantia e deve ser substituído antes de fechar Salvar/Reportar. URLs legadas
já emitidas podem ser aceitas pelo Storage até sua expiração; rollout não
declara revogação retroativa. A prova independente confirma ausência de novas
URLs assinadas no cliente e negativa do endpoint após revogação, com cache
desabilitado, além do fim da validade de URLs legadas em até 600 segundos.

Participantes conservam o histórico existente das conversas. A origem do anúncio
não permite acesso adicional: thread deve mostrar indisponibilidade quando a
leitura não for autorizada, sem novas fotos/título obtidos por bypass. Não prometer
remoção retroativa de mensagens enviadas por participantes.

## Alternativas

1. Reutilizar post_saves e alvo report post: rejeitada por FKs e semântica erradas.
2. Salvar apenas no navegador e denunciar por toast: rejeitada por falta de
   persistência e operação real; não cumpre o Figma nem o ciclo do usuário.
3. Fechar/pausar o anúncio para ocultar: rejeitada por confundir moderação com
   estado comercial e permitir reativação do dono remover a restrição.
4. Relação privada de saves e marca independente de moderação: proposta,
   reaproveitando a audiência e infraestrutura de reports existentes.

## Referência e divergência

Referência concreta: post_saves, recommendation_saves e reports/resolve_report
versionados neste repositório, confrontados por Luna em 06/10/2026.
Divergência explícita: ocultação de listing não usa estados comerciais; salvos
não preservam acesso ao conteúdo quando o público ou estado deixa de permitir.
Não há afirmação de pesquisa de mercado externo nesta proposta.

## Caminhos e contrato

Ampliar FIGMA-002 antes da implementação: migrations/testes/tipos, lib/listings,
cards/detalhe/retorno de salvos, report-button.tsx, report-actions.ts,
apps/web/app/(admin)/reports/targets.ts, page.tsx e actions.ts somente se necessário
para fechar estes alvos. Não refatorar outros alvos ou alterar suas políticas.
Incluir endpoint de leitura autenticada de mídia sob /imoveis e consumidores
de mídia do próprio lote; substituir somente a emissão de signed URLs de listings.
O card permanece RECON-PRANCHAS-RESTANTES; não há fila paralela.

## Riscos, reversão e prova

Risco principal: conteúdo ou mídia continuar acessível após ocultação/mudança
de audiência; outro risco é denunciar UUID inacessível e revelar sua existência.
A relação privada também pode revelar interesses do membro se grants/policies
forem genéricos. Grants mínimos e regras de leitura devem acompanhar o schema.
Reversão antes de produção custa pouco; após uso, exige preservar denúncias e
auditoria, nunca apagar histórico para desfazer uma migration aplicada.

Crítica independente e aprovação humana precedem migrations. Provas exigidas:
pgTAP positivo/negativo para cada operação, membro alheio, sem sessão,
inexistente, público externo, não active, autorrelato, duplicata, operador e
tentativa direta de mudar marca; regressão dos alvos atuais. E2E com reload
para salvar/remover/retorno, denunciar/fila/hide/dismiss/restaurar e leitura
negada de anúncio/fotos, incluindo links de conversas e saves. URLs já emitidas
não podem prometer revogação retroativa: TTL legado máximo de 600 segundos,
sem novas URLs no cliente. Testar fetch novo com a mesma URL autenticada antes
e depois de hide/perda de audiência, no-store nos headers e nenhum cache Next/CDN.
Salvar: provar leitura/remoção dos próprios IDs após perda de audiência, joins
negados sem título/foto/status, terceiros sem acesso e retorno do mesmo save
quando active e a associação é recuperada. Moderação: provar sequência
hide/restore/hide com eventos duráveis, ator server-side, nenhuma escrita direta
do membro/operador na trilha e eventos preservados após restore.

Métrica: todos os ciclos descritos fechados no candidato exato, com provas
independentes e capturas 375/768/1440 comparadas ao Figma. Reabrir diante de
qualquer leitura não autorizada, sucesso sem persistência ou divergência entre
ocultação e acesso às fotos. Até então o lote continua aberto.

## Aprovação

Crítica independente, tentativas 1 e 2: FAIL. A primeira exigiu fechamento de
revogação/cache, trilha durável, save do próprio dono e provas da relação após
perda de acesso. A segunda confirmou esses deltas e identificou conflito do
ator auth.uid com RPC chamado via service_role, além de matriz de mídia ambígua.
O texto atual especifica RPC listing com sessão autenticada e matriz por ator.
Luna retornou PASS independente em 06/10/2026, depois de confirmar os quatro
ajustes anteriores e avaliar estes dois deltas. Versão substantiva avaliada:
Git blob 5d4006ae258ed11e8f059978cf186f2bfff222ce;
SHA-256 4f680c9f941499422f9cbe8d61eecd39af6c3e4c1965da9d15b0f021e1649e83.
Esta atualização de metadados registra o parecer; não muda suas decisões.

Juan aprovou explicitamente nesta conversa, em 06/10/2026, escolhendo
“Aprovar as regras propostas” após receber o resumo de salvos privados,
ocultação separada do status, histórico auditável e mídia autenticada por
requisição com a matriz dono/terceiros. Esta resposta aprova as decisões
substantivas avaliadas pelo crítico; não é aprovação de implementação pronta.
Ampliar o contrato antes de editar os consumidores e exigir revisão/runtime
independentes do candidato entregue. Sem push, merge ou deploy autorizado.
