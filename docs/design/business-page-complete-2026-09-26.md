# Página do negócio — fechamento de D2

Autoridade: ADR-20260925-pagina-do-negocio, D2/D3/D7/D8/D11/D13, e correção do dono em 26/09/2026: a revisão visual parcial não entrega a página aprovada. Este lote amplia a primeira fatia; não muda identidade, cidade, revogação civil ou cobrança.

## Conteúdo e jornada

A página apresenta nome, categoria, descrição, bairro, área atendida, horários informados pelo dono, fotos ordenadas, catálogo com preço ou sob orçamento, anúncios ativos explicitamente vinculados do Mercado e pedido direto. Ausência de informação não vira dado inventado. O dono vê a própria página com ações de editar apresentação, detalhes, catálogo/fotos, vincular anúncios e acompanhar pedidos recebidos. O membro encontra a página e envia o pedido; o dono recebe, responde na conversa do pedido e ambos acompanham/encerram. Sem checkout ou pagamento intermediado.

## Contato e privacidade

`private.business_page_details` guarda uma linha por `provider_profiles`, inclusive o número de contato. Schema privado, RLS enabled/forced, nenhum grant de tabela a anon/authenticated. Não reutilizar `provider_profiles.contact_phone`, cuja exposição por coluna é um contrato legado distinto.

RPC de escrita exige `can_manage_provider_profile`, dono ativo, ficha não excluída e conta disponível. Não aceita dono, cidade ou alcance. Campos limitados: bairro80, área200, horário300, telefone10–15 dígitos com + opcional. Modo app/phone/whatsapp; exibição exige opção explícita do dono, inicialmente falsa. App não expõe número.

RPC de leitura do dono exige ownership e gestão ativa. RPC de leitura para membros exige autenticação, `private.can_see_provider`, ficha não excluída, alcance ativo elegível e conta disponível. O helper privado consulta diretamente `profile_suspensions` e `account_deletion_requested` para chamador e titular, sem publicar o estado do titular; o ramo de owner do helper legado não substitui essas verificações. Devolve o número apenas quando modo externo e exibição ativada. Não retorna linha para quem está fora do alcance, tampouco número oculto em JSON, Data API, fotos, busca ou página. Desativar a opção passa a ocultar na próxima leitura; não prometer apagar o que outro membro já conheceu.

Reconciliação do contato civil legado: copiar os contatos para a nova tabela privada respeitando o opt-in existente, revogar SELECT de tabela de provider_profiles para authenticated e conceder SELECT somente das colunas sem contact_phone. Fluxos de edição civil leem contato por RPC owner-only. Trigger sincroniza futuras escritas civis legadas com o registro privado; jamais usar telefone legado como fallback da leitura pública. Permissões de INSERT/UPDATE civil e convites/revogação não são ampliados. O incidente do grant legado está registrado no postmortem próprio.

## Mercado

`listings.provider_id` opcional referencia a página. Trigger de banco cobre INSERT/UPDATE diretos e RPCs: dono do anúncio = dono da página, gestão ativa e mesmo alcance geográfico; apenas kind=item e audiência de cidade igual ao alcance gratuito do membro. Ownership e audiência imutáveis não podem ser contornados pela troca do vínculo. Nada é vinculado retroativamente por igualdade de dono. Desapego permanece provider_id=null. UI de publicação oferece pessoal/negócio, e a gestão permite vincular/desvincular anúncios elegíveis existentes. Leitura continua por RLS do anúncio, sem ampliar audiência. A consulta de outras cidades do Mercado permanece; na página a leitura requer simultaneamente autorização da página, anúncio ativo/legível e cidade correspondente ao alcance. No Mercado, detalhes incorporados da página exigem autorização própria. Após perda de elegibilidade o vínculo é retido, mas os detalhes/contato do negócio não são incorporados; o anúncio continua com seu próprio contrato de audiência e o dono pode desvincular. Não converter comercial em pessoal silenciosamente.

## Limites e provas

Este lote não é D4 (marcação em indicações), D8/D10 (pedido aberto/limite mensal), D1/D9/D12 (novo Explorar), D6 (cobrança) ou abertura civil de D3. Esses ciclos seguem na ordem do ponto de retomada. Não apresentar contagens de reputação, estatísticas, avaliações, horários de aberto/fechado ou planos sem mecanismo.

Provar pgTAP positivo/negativo de escrita/leitura/contato oculto/alcance/ownership de anúncios, regressão civil e pedido direto para dono membro. Browser em375/768/1440: editar e persistir detalhes, contato privado/público, galeria, anúncio pessoal e de negócio, recebimento/resposta/encerramento do pedido. Revisões independentes de segurança, código e runtime. Aceitação estética pelo dono segue aberta mesmo com auditoria mecânica verde.

## Evidência local e fronteira de fechamento

Branch confirmada: `claude/app-visual-comparison-bivaque-1110a9`, base `0b853f23015be432b30cf0223624e3e2b06279ef` mais diff local. Nenhum commit, push ou implantação neste lote. Banco compartilhado não alterado; migrations aplicadas somente ao projeto descartável `bivaque-biz-001-test`.

- Gate geral: PASS em lint, TypeScript de todos os workspaces, build de produção, testes e segredos; 1.237 testes unitários e 117 testes de escopo, além das suítes de workspaces/privacidade.
- PgTAP final: 133 arquivos / 1.819 testes PASS, após todas as migrations, em reset isolado sem seed nem servidor/captura ativos. Inclui negações de contato/ownership/cidade, leitura de catálogo/portfólio/Storage após suspensão, classificação comercial após transferência e remoção de detalhes/telefone na purga. O resultado anterior de 1.808 testes era intermediário.
- REST real na versão final: SELECT de `contact_phone` devolveu 403/42501 para dono e outro membro; RPC pública devolveu contato oculto mascarado e gravação cross-owner foi negada. `.visual/biz-002/contact-api.mjs`; nenhuma credencial ou número privado real em saída.
- Concorrência na versão final, duas conexões reais: contato × vínculo de anúncio confirmaram ambas as transações sem deadlock; suspensão × contato recusou a escrita após adquirir o lock compartilhado. Script e saída locais em `.visual/biz-002/concurrency.mjs`.
- Gibbs, verificador independente: suíte final 3/3 PASS em 56,4s, cobrindo persistência, duas fotos, preço, vincular/desvincular/revincular, solicitante envia → dono recebe/responde → solicitante encerra, WhatsApp público após opção explícita, segundo pedido encerrado pelo dono e remoção da opção pública. Inspecionou 18 capturas reais em três posições de scroll, gestão e página pública nos três tamanhos, comparando ao Início. Ressalva: busca comprimida no cabeçalho tablet. Rodada intermediária teve falha de espera da navegação no teste; corrigida antes da prova final, sem mudar código do produto.
- R3: três rodadas independentes de segurança retornaram FAIL e produziram correções de sincronização, disponibilidade, vínculo, classificação comercial, purga, concorrência e Storage. Os dois achados da terceira rodada foram corrigidos em `20260927014124_business_media_and_lock_order.sql` e a prova concorrente passou. Ainda não há reavaliação independente dessa correção final. `retry_budget: 3` esgotado: fechamento permanece `HUMAN_DECISION`, conforme contrato BIZ-002 e arquitetura. Gate verde e prova de runtime não substituem essa revisão.

### Relação com o ADR completo

Retomada: o dono respondeu "vai" ao pedido de nova revisão independente. Autorizada uma rodada adicional; BIZ-002 passa a retry_budget 4, sem apagar os três FAIL anteriores ou transformar o esgotamento anterior em PASS. Reavaliação em andamento com revisor distinto do implementador e do verificador de runtime.

Quarta rodada (Russell): FAIL P2 por ordem perfil → Auth → participação no vínculo, em oposição à alteração da participação → Auth. Não encontrou outro bloqueador estático nos caminhos revisados. Defeito reproduzido em duas conexões no banco isolado antes da correção (`deadlock detected` em `validate_listing_business`); `20260927021015_business_listing_membership_lock_order.sql` uniformiza perfil → participação atual ativa → Auth. A mesma prova passa depois da correção, assim como contato × vínculo e suspensão × contato. PgTAP repetido após a sexta migration: 133 arquivos / 1819 testes PASS. Confirmação independente solicitada somente para esse achado; não transforma orçamento esgotado em PASS global de BIZ-002. Capturas e prova independente de browser anteriores à correção de ordem de locks, sem alteração de UI.

| Decisão | Situação deste lote |
|---|---|
| D2 | Página completa implementada; fechamento aguarda provas e revisão indicadas acima |
| D13 | Correção do dono em 27/09/2026: descontos pertencem à vertical Benefícios; seção e campo retirados da página do negócio |
| D3 | Membro admitido pode possuir página; cadastro civil aberto não implementado |
| D4 | Marcação em indicação e reputação por conversas continuam próximas na sequência |
| D5 | Alcance gratuito do membro já existe; reconciliação civil para cidade inteira continua aberta |
| D6 | Degraus pagos não implementados |
| D7 | Entradas em Serviços/Mercado/publicação e atalho Perfil já existem |
| D8 / D10 | Pedido direto exercitado; pedido aberto e limite mensal de respostas não implementados |
| D11 | Produto explicitamente vinculado aparece com negócio; anúncios pessoais não são vinculados automaticamente |
| D1 / D9 / D12 | Explorar por intenção, porta dupla e chegando/saindo continuam posteriores |

Confirmação de Russell encerrada: a sexta migration resolve o achado específico por inspeção independente, sem lacuna na ordem perfil → participação → Auth para o cenário apontado. A validação posterior de elegibilidade permanece. Confirmação limitada, sem executar a reprodução nessa etapa e sem PASS global. G-TASK-3 permanece aberto; orçamento e histórico de FAIL não são apagados.

Correção de escopo em 27/09/2026: descontos pertencem à vertical Benefícios, conforme instrução explícita do dono. A página pública e o formulário não oferecem desconto. O campo legado permanece no banco sem uso na interface; as provas e capturas acima são históricas, anteriores a esta retirada.
