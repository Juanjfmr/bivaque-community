# Execução contínua do Figma — 05/10/2026

Autorização: o responsável pediu execução contínua com OpenCode e determinou que
Codex seja o coordenador. Este protocolo usa o card RECON-PRANCHAS-RESTANTES e
os contratos existentes. Não cria outra fila de produto.

| Papel | Responsável | Limite |
|---|---|---|
| Coordenação e avanço | Codex nesta conversa | Distribui, confronta provas, recupera falhas |
| Implementação | alibaba-token-plan/qwen3.8-max | Único escritor do checkout |
| Revisão independente | alibaba-token-plan/glm-5.3 | Lê contrato, referência e diff; não implementa |
| Prova de runtime | alibaba-token-plan/deepseek-v4.1-flash | Testa o candidato; não corrige código |

Checkout: `C:/Users/juana/.codex/worktrees/figma-production/bivaque-community`.
Executor atual: `ses_ef21a4896ffeBHjUCPxo7A4Sjk`.
Referências atuais: `.visual/opencode-figma-20261005/references/` no checkout.

## Ciclo

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
