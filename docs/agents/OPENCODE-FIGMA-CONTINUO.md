# Execução contínua do Figma — 05/10/2026

Autorização: o responsável pediu execução contínua com OpenCode e determinou que
Codex seja o coordenador. Este protocolo usa o card RECON-PRANCHAS-RESTANTES e
os contratos existentes. Não cria outra fila de produto.

| Papel | Responsável | Limite |
|---|---|---|
| Coordenação e avanço | Codex nesta conversa | Distribui, confronta provas, recupera falhas |
| Implementação | opencode/space-bunny-free | Único escritor do checkout, solicitado e autorizado pelo dono |
| Revisão independente | nvidia/z-ai/glm-5.3 | Lê contrato, referência e diff; não aceita PNG neste provedor |
| Prova de runtime | nvidia/deepseek-ai/deepseek-v4.1-flash | Testa o candidato; execução no novo provedor ainda a confirmar |

Checkout: `C:/Users/juana/.codex/worktrees/figma-production/bivaque-community`.
Executor atual: `ses_eedf75d61ffeYK4MADSQrXnuQM`; fonte canônica em sessions.json.
Escritor OpenAI anterior preservado: `ses_eef1c5897ffekiWHMU12yPayH4`.
Contexto Qwen preservado: `ses_ef022923fffeRdYD3wzyf4p6NS`.
Sessão intermediária preservada: `ses_ef06ae392ffetL0Ce31Ap2kDPv`.
Em 06/10 06:18Z, dois prompts de reparos novos retornaram o mesmo resumo anterior
sem ferramentas ou alterações. Todos os papéis foram confirmados inativos; o
coordenador renovou somente o contexto Qwen, preservando checkout e histórico.
Handoff: `orchestration/qwen-polish-handoff-20261006.md`.
Sessão anterior preservada: `ses_ef21a4896ffeBHjUCPxo7A4Sjk`. Em 06/10/2026,
resumos automáticos encerraram repetidamente trabalho parcial; Codex confirmou
todos os papéis inativos e transferiu o handoff para Qwen em contexto novo,
no mesmo checkout, preservando diff e histórico. O ID canônico fica no
`orchestration/sessions.json` usado pelo helper.
Referências atuais: `.visual/opencode-figma-20261005/references/` no checkout.

## Lote atual — 06/10/2026 08:13Z

FIGMA-001 teve revisão GLM PASS e prova independente Flash PASS, com31 hashes
confirmados pelo coordenador. O ciclo dos dois atores e a negação de outro
prestador real foram provados. HTTP500 anterior e flake da ficha permanecem
pendências de confiabilidade no card; não há diagnóstico causal nem produção pronta.
Qwen recebeu FIGMA-002: imóveis com persistência e12 fotos. Baseline novo está
em `.visual/opencode-figma-20261005/figma002-baseline/`. Mesmo escritor/checkout;
não repetir revisão001. O próximo candidato estável é002, com nova revisão GLM
independente e nova prova Flash. Não editar stacks compartilhados553/554.

## Ciclo

### Autoridade visual e de experiência — reconciliação de 06/10/2026

O arquivo atual do Figma `niuOHiHkyc9eGaIQBY9hq4` e as decisões posteriores do dono
governam as telas, a navegação, os estados e as interações. O board e os contratos
anteriores ajudam a localizar backend e dependências; não comprovam cobertura do Figma atual.
Antes de despachar outro lote, Codex vincula as telas e os fluxos atuais a node IDs,
referências visuais, ações, estados de retorno e critérios de comparação no contrato.
Registrar lacunas no mesmo card RECON-PRANCHAS-RESTANTES e regenerar o board existente.
O levantamento cobre Home, Explorar, Desapego, Serviços/Empresas, Imóveis, Eventos,
Guia, Perfil/Configurações, entrada e recuperação. Não restaurar Comunidades no nav.
O [inventário do Figma atual](FIGMA-ATUAL-COBERTURA.md) registra node IDs, estados,
proveniência da inspeção e divergências; não comprova conexões no Player ou runtime.
Uma recomendação histórica de próximo lote só pode avançar após essa reconciliação.
Capturas devem corresponder às fontes e ao build do candidato, com revisão de
fidelidade e prova funcional; contagem de contratos antigos não mede conclusão.

1. Codex acompanha atividade e diff do executor. FIGMA-001 fecha shell e Conversas;
   FIGMA-002 entrega imóveis com persistência e até 12 fotos. Depois seleciona o
   próximo fluxo autorizado pelas dependências reais e pelo card existente.
2. Qwen corrige os achados já enviados, executa as provas direcionadas e o gate
   do lote estável. Não lança gates duplicados. Ao ficar estável, termina o turno
   com `CANDIDATO_ESTAVEL`, contrato, arquivos e provas, e aguarda a revisão.
3. Codex dispara GLM 5.3 em sessão nova, sem copiar a defesa de Qwen. O helper impede
   disparo enquanto Qwen estiver ativo. GLM lê primeiro contrato, Figma e fronteiras,
   depois o diff; apresenta PASS/FAIL, linhas e lacunas. O veredito não fecha o lote.
4. Após revisão satisfatória, Flash executa a prova do fluxo (persistência após
   reload, falhas/retomadas, acesso negado real e capturas 375/768/1440). Não redefine
   os critérios para fazer teste passar. Registra comandos, saídas e revision/diff.
5. Codex confronta os resultados com o candidato. Mudança posterior invalida as
   provas afetadas. Qwen recebe os reparos, não recebe autoridade para autoaprovar.
   A evidência material é registrada no card e o resumo é regenerado.

GLM entra inicialmente como experimento na próxima revisão, aprovado pelo responsável.
Codex mede achados confirmados, tempo e retrabalho antes de ampliar seu uso. DeepSeek
Pro fica como segunda opinião em defeitos difíceis, depois de confirmar que o provedor
entrega um modelo distinto do Flash. Não adicionar outra revisão obrigatória por lote.

## Continuidade e recuperação

Um acompanhamento recorrente nesta conversa verifica o OpenCode a cada 15 minutos.
Ele não cria outro escritor, não envia prompts repetidos para sessão ativa e não
interpreta silêncio ou `outcome` antigo como travamento: `session.active`, atividade,
diff e ferramentas pendentes são confrontados. Depois de cinco minutos sem atividade,
inspeciona uma vez; só retoma após confirmar erro, término prematuro ou interrupção.

Falha de provedor: conservar sessão/diff/log; tentar outro provedor já conectado do
mesmo modelo. Se não funcionar, Codex escolhe modelo alternativo em sessão distinta,
mantendo o papel e a independência. Não comprar créditos nem alterar credenciais.
Três falhas do mesmo reparo exigem diagnóstico e abordagem diferente; nunca PASS por
esgotamento. Um bloqueio externo fica no card e outro fluxo independente avança.

Só decisões críticas novas, permissões ausentes ou falta de recursos que impeça todos
os fluxos exigem o responsável. Não publicar, fazer push/merge/deploy, remover trabalho
alheio ou resetar/alterar stacks compartilhados. Migrations/provas usam stack isolado.
Privacidade, RLS, HeroUI e gates continuam obrigatórios.

A recorrência retoma o serviço após término de turno, mas a execução depende de host,
OpenCode, rede e provedores disponíveis; desligamento do computador impede execução.

## Operação

`node scripts/opencode/figma-service.mjs status` mostra atividade e últimas ações.
`... send implementer <texto>` entrega orientação ao executor existente.
`... start reviewer <contrato>` cria revisão sem histórico do executor.
`... start verifier <contrato>` cria prova separada depois de Codex validar a revisão.
Os IDs e eventos técnicos ficam em `.visual/opencode-figma-20261005/orchestration/`.
Não são uma segunda fila; o estado do produto permanece no board.

## Recuperação de provedor — 06/10/2026 11:06Z
Alibaba Token Plan esgotou a cota mensal (reset informado:08/10 16UTC). O término vazio marcado succeeded não foi conclusão do lote. Qwen em Alibaba alternativo recusou a chave existente; OpenCode Go e DeepSeek direto informaram saldo insuficiente. Sem compras nem alterações de credenciais. Implementação recuperada no OpenCode via OpenAI gpt-6.1-sol, sessão ses_eef1c5897ffekiWHMU12yPayH4, com ferramentas reais e um único escritor no mesmo checkout. Histórico e diffs preservados; ID canônico em sessions.json. Revisão GLM e runtime Flash permanecem independentes e deverão usar provedor conectado disponível (Nvidia consta autenticado com os mesmos modelos), sem disparar Token Plan esgotado ou reutilizar revisão001. Banco002 atual PASS1185/55novos e reposição/capa/order/quota API provados; rotasUI e runtime completo ainda pendentes.

## Ajuste de coordenação — 06/10/2026 11:13Z
O helper passa a criar a próxima revisão GLM e prova Flash no provedor Nvidia já conectado;
a execução desses modelos ainda exige confirmação pelas ferramentas da nova sessão.
FIGMA-002 usa sua própria baseline, incluindo hashes dos arquivos não rastreados.
Nenhum avaliador é iniciado enquanto o implementador permanece ativo.
GPT-6 Luna, solicitado pelo dono como subagente, concluiu levantamento somente leitura
dos próximos fluxos: RECON-030 Guia e curadoria humana é candidato independente.
BLOCK-LEGAL-AI continua restrito à transição automática de RECON-019; a recomendação
não cria outra fila ou escritor. Rotas de imóveis existem e 21 testes unitários passaram;
lint, tipos e prova completa pela interface ainda precisam fechar o candidato.

## Adjudicação FIGMA-002 — 06/10/2026 15:14Z

GLM Nvidia concluiu a primeira revisão em aproximadamente 79 minutos, com
PASS-COM-RESSALVA. Codex não aprovou fechamento: confirmou no código que o
guard apenas de UPDATE permite INSERT ativo sem ficha de imóvel. Reparos
foram encaminhados uma vez ao implementador existente, após confirmar todos
os papéis inativos: migration append-only e provas positivas/negativas,
Salvar rascunho explícito com retomada, filtros funcionais e comparação da
composição das telas com as pranchas atuais. Salvar/Reportar ainda requerem
reconciliação dos mecanismos de persistência e autorização no contrato.

O modelo GLM não aceita PNG nesta sessão; sua inspeção estrutural não prova
fidelidade visual. Codex já observou diferenças na lista e mantém a auditoria
visual em aberto. O achado de quadro ausente usou a cópia antiga do worktree:
o card canônico no origin contém os registros. O log final atual é
gate-origin-fix.log, com 615 testes unitários; gate-final.log é anterior.
Depois do novo candidato estável, a mesma sessão GLM reavalia somente o delta.
Flash FIGMA-002 continua não iniciado, aguardando aprovação de Codex.
O experimento GLM confirmou um defeito de integridade e lacunas de interface;
o tempo alto e a limitação de imagem não justificam ampliar seu uso agora.

## Persistência de salvos e moderação — 06/10/2026 15:43Z

Luna confirmou a autorização de produto das ações desenhadas, mas as regras de
RLS e ocultação do anúncio não constam nos ADRs aprovados. A matriz exige
aprovação humana explícita e critic PASS para estas novas regras R3.
Codex preparou ADR-20261006-anuncios-salvos-e-moderacao.md, status proposed,
e enviou à crítica independente do Luna antes de pedir aprovação da proposta
concreta. Não implementar seus ramos enquanto essa aprovação estiver pendente.
Isso não bloqueia os reparos e testes já autorizados de FIGMA-002.

A primeira rodada E2E do delta terminou 11 passed / 4 failed: três seletores
ambíguos de anunciante e uma retomada de rascunho no tablet. Executor ativo
diagnosticando traces; não retomar ou duplicar teste. Gate e pgTAP não fecham
essas falhas nem comprovam as capturas finais.

## Proposta concreta pronta para aprovação — 06/10/2026 16:13Z

Luna aprovou o delta final do ADR-20261006-anuncios-salvos-e-moderacao.md,
após correções nas três tentativas do desenho. critic_verdict pass registrado,
status proposed e approved_at vazio; somente aprovação humana explícita
autoriza implementar suas regras R3. Solicitação ao dono nesta conversa em
16:13Z; não repetir a pergunta a cada heartbeat e não inferir resposta de silêncio.
Enquanto isso, seguir reparos/provas atuais e preparar fluxos independentes.

Executor corrigiu assert que esperava closed quando a UI mostrava Encerrado,
preservando prova adicional de status closed no banco. Gate verde e nova rodada
E2E background sh_111fd51ef001pJP5uLu8nJ60jQ, build l5oDXRJSI2jpN3pZt5kXE.
Não confundir inatividade da sessão durante teste com interrupção; candidato
e capturas finais continuam pendentes. Não iniciar GLM/Flash antes de estabilidade.

## Aprovação recebida — 06/10/2026

Juan respondeu “Aprovar as regras propostas” à solicitação R3 de Salvar/Reportar.
ADR-20261006-anuncios-salvos-e-moderacao.md agora approved, critic_verdict pass.
Não solicitar confirmação novamente. O mesmo implementador deve concluir a
rodada serial atual preservando suas provas e então integrar o escopo aprovado,
ampliando allowed_paths/acceptance e validando o contrato antes de editar novos
consumidores. Só candidato que inclua salvos/denúncia/moderação/mídia autenticada
fecha o lote completo. Não duplicar escritor, testes ou revisão obrigatória.

## Troca de escritor solicitada: Spacebunny — 06/10/2026

Juan pediu Spacebunny no OpenCode para escrever código. O catálogo local lista
opencode/space-bunny-free e opencode-go/space-bunny. A segunda conexão já havia
informado saldo insuficiente com outro modelo; não comprar créditos ou repetir
falhas desse provedor. Preparada prova somente leitura da opção gratuita.

A revisão automática rejeitou a criação/primeiro prompt dessa prova por envio
do contrato privado a novo provedor. Nenhuma sessão Spacebunny foi criada pelo
comando rejeitado. Foi solicitada autorização explícita nesta conversa para
código/contratos ao Spacebunny, mantendo credenciais e .env proibidos.
Enquanto a resposta estiver pendente, não enviar o repositório/contrato por
atalho e não parar o implementador atual. Se autorizada, verificar execução
real do modelo, preparar checkpoint/handoff, confirmar fim do escritor antigo
e só então substituir sessions.json por um único escritor Spacebunny.
Preservar sessão/diff/logs, GLM e Flash separados. Não perguntar novamente
quando a autorização chegar nem presumir aprovação de silêncio/heartbeat.

Juan autorizou explicitamente “código e contratos ao Spacebunny” nesta conversa.
Prova opencode/space-bunny-free ses_eedf9dfbbffeWworn6QCnVl1Zl executou read do
contrato e respondeu corretamente; não foi escritor. A rejeição de revisão
automática foi resolvida pela autorização nova, sem contorno. Checkpoint do
escritor anterior solicitado antes da troca; credenciais/env continuam proibidos.

Troca concluída às 16:25Z, após confirmação de inatividade de todos os papéis
e checkpoint terminal: nova sessão implementadora ses_eedf75d61ffeYK4MADSQrXnuQM
em opencode/space-bunny-free no mesmo checkout. Handoff
orchestration/spacebunny-handoff-20261006.md e export da sessão anterior preservados.
Nenhum background pendente no checkpoint. Endpoint de mídia parcial teve seis
testes unitários com mocks; novo schema de salvos/moderação ainda ausente.
Build do baseline anterior não corresponde a esse delta; completar integração
e provas do novo candidato. GLM e Flash seguem separados; nenhuma conclusão
de fidelidade/runtime decorre da troca de modelo.

Às 16:58Z, o schema novo já está escrito e testado pelo executor. O checkpoint
de ausência de schema acima descreve somente a troca de 16:25Z. A migration
20261006164652 corrige três achados da coordenação: leitura da trilha exclusiva
da operação, negação de UPDATE direto da marca mesmo ao operador dono e negação
de metadados forjados no INSERT. Codex conferiu SQL e negativas/positivas; log
pgtap-guard-fixes-run5 registra 99 arquivos, 1316 assertions, PASS em 15s.
Isso não substitui revisão independente. O primeiro E2E desktop de salvar,
reload, lista, desfazer e retorno passou; o log conserva erro de stream do servidor.
Spacebunny segue ativo com integração/provas restantes. Não iniciar GLM delta
ou Flash002 antes do novo candidato estável, contrato e hashes válidos.

Às 17:28Z, a correção mantém o formulário de restauração montado e o E2E run8
avançou além do feedback de restauração e da checagem active/hidden=false no banco.
A falha seguinte espera o título de detalhe ao recarregar a rota da conversa;
Codex encaminhou a diferença concreta de destino para provas separadas de detalhe
e contexto da conversa. Run8 ainda é FAIL, não conclusão. Spacebunny segue ativo;
preservar logs e não duplicar gate ou iniciar revisão enquanto integra o lote.

Às 20:13Z, a coordenação retomou após indisponibilidade da revisão automática
por limite de uso; não houve compra, contorno ou troca de escritor. Spacebunny
entregou novo candidato e ficou inativo às 19:12Z. Codex conferiu GATE VERDE,
21 E2E passando no run15 e revalidou os 1204 hashes do snapshot after-runtime,
com BUILD_ID wITXiIVv0a4vhurshsnJ0 correspondente. Contrato FIGMA002 válido.
A mesma sessão GLM002 recebeu reavaliação somente do delta, sem defesa do executor.
Não retomar escritor durante essa revisão nem criar revisão integral duplicada.
Flash002 ainda não iniciado. Capturas com zero high não aprovam fidelidade; a
captura mobile de detalhe dita full não mostra as seções inferiores por scroll
interno. Codex deve confrontar composição e completar prova visual; não declarar
produção pronta pela entrega ou pelos logs do executor.
