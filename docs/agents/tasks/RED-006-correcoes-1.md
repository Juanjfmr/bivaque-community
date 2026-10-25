# RED-006 — lista única de correções do julgamento, 25/10/2026

Mesma etapa, mesmos allowed_paths e retry_budget 3. Executor relata duas rodadas;
esta retomada C1 usa SOMENTE a rodada restante 3/3. C1 não é lote nem orçamento novo.
Se não fechar, HUMAN_DECISION real. Sem instalar, delegar, background, commit ou
escrever PRONTO. Só a cadeia escreve marcador. Preserve WIP e negativos anteriores.

1. service-requests.sql:96-99 mede leitura negada antes da criação de qualquer pedido.
   A negativa retargetada para outra cidade passa com tabela vazia, inclusive com RLS
   quebrada. Mova essa medição para depois de um pedido real existir e de a parte
   autorizada lê-lo. Troque para a identidade 003, prove que não lê o pedido existente,
   restaure a identidade correta e preserve todos os demais testes, inclusive o
   terceiro 002 da mesma cidade. Não apenas renomeie o teste. Mantenha ou aumente
   o plano, não reduza. O negativo de criação pelo RPC pode continuar antes da criação.
2. cancelled-notice: service_role é o canal real de settle_account_possessions e está
   autorizado como exceção técnica explícita no contrato, sem mudança de produção.
   Prove a fronteira antes da purga: chamadas reais authenticated e anon devem negar
   com 42501 sobre alvo válido, sem mudar os pedidos; restaure o contexto e só então
   execute como service_role e preserve as oito asserções de efeito/avisos. Aumente
   o plano pelas negativas novas. Nunca conceda grant nem edite migration para verde.
   Se encontrar grant indevido, preserve FAIL e registre defeito real fora do escopo.
3. p_user_id de settle_account_possessions é a CONTA-ALVO da purga, não o ator
   autenticado. Corrija comentários/mapa/STATUS que chamam esse parâmetro de ator
   explícito. A autorização desta função depende do canal privilegiado, não desse UUID.
   Leituras como postgres são observação de estado, sem alegar RLS.
4. Corrija o mapa sem esconder semântica: o negativo antigo dependia de 002 pending
   na vila A. Essa barreira exclusiva de vila foi extinta pela decisão R1-220/ADR;
   o negativo com 003 de outra cidade é NOVO E INDEPENDENTE. Retire a afirmação de
   que nenhuma extinção ocorreu e de mera troca de montagem equivalente. Cite decisão
   aprovada e preserve os negativos não exclusivos da vila, incluindo terceiro 002.
5. Comentários/docs chamam 002 e 003 de verificados, mas foundation.inc só verifica
   001. Ajuste a descrição aos fatos, sem modificar fixture compartilhada. Corrija
   também git status para incluir os dois documentos permitidos; nenhum resultado
   ou papel pode ser descrito mais forte que a prova.
6. Rode as provas do contrato na rodada restante: comando exato banco pela fila,
   db:lint pela fila, gate completo com configuração pública apenas no processo.
   Atualize STATUS e R3-RED-006 com resultados reais por arquivo, mapa, planos novos,
   logs UTF-8, hash inalterado, total agregado e falhas classificadas. Não diga que
   agregado, permissões/RLS ou segurança passaram. Se defeito real fora do escopo,
   não repita tentativa idêntica. Não avance para RED-007.

O snapshot RED-006-C1-base contém o WIP antes da retomada. Qwen compara o diff
completo contra b0e4e7a4 e o delta desse snapshot. Correções do instrumento serão
julgadas pelo Codex, modelo diferente do produtor. Não use subagentes.
