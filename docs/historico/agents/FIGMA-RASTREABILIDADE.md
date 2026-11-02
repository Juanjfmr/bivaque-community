# Figma atual: autoridade, trabalho e evidências

Registro de 06/10/2026, America/Manaus. Os logs usam UTC e podem mostrar 07/10.
Card único: **FIGMA-WEB-ATUAL** (RECON-PRANCHAS-RESTANTES segue done na main). Este documento é um índice de auditoria,
não uma fila adicional nem uma declaração de produção pronta.

## Referência vigente

[Protótipo Bivaque no Figma](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4).
Arquivo `niuOHiHkyc9eGaIQBY9hq4`, Web `7:5`, Mobile `7:6` como referência responsiva.
Figma e decisões posteriores do dono governam aparência, navegação, estados e
experiência. O board histórico não mede cobertura deste protótipo.

- [Mapa atual de telas, estados e interações](FIGMA-ATUAL-COBERTURA.md).
- [Processo e histórico de coordenação](OPENCODE-FIGMA-CONTINUO.md).
- [Contrato shell/Conversas](tasks/FIGMA-001.task.yml).
- [Contrato Imóveis, Salvar/Reportar e mídia](tasks/FIGMA-002.task.yml).
- [ADR de salvos e moderação, aprovado pelo dono](../decisions/ADR-20261006-anuncios-salvos-e-moderacao.md).
- [Board gerado](../../tools/backend-kanban/BOARD.md), com histórico preservado.

Decisões explícitas: Comunidades fora da navegação; Conversas no topo;
até 12 fotos. Não reabrir essas escolhas por documentação anterior divergente.

## Preservação Git e atribuição

[Checkpoints e commits](../evidence/figma-2026-10-06/checkpoints.json) registra
os commits locais de preservação dos dois checkouts. Eles têm status
**WIP_NOT_APPROVED**: salvar o código não certifica correção, fidelidade ou runtime.

Os checkouts continham alterações anteriores à execução Figma, inclusive landing,
Mobile, instruções e reconstruções anteriores. Os snapshots preservam esse estado
herdado e a implementação atual; não atribuem todo o diff ao Spacebunny ou ao Codex.
Nenhum reset, checkout forçado ou descarte foi usado. Índices Git separados evitam
alterar o staging ou HEAD do escritor. Uma credencial literal em handoff antigo foi
redigida somente na cópia commitada e identificada no manifesto.

- [Manifesto de fontes do worktree Figma](../evidence/figma-2026-10-06/production-source-manifest.json).
- [Manifesto do checkout principal, incluindo alterações herdadas](../evidence/figma-2026-10-06/origin-source-manifest.json).
- [Inventário com SHA-256 das evidências locais](../evidence/figma-2026-10-06/local-artifacts-manifest.json).

Os manifestos registram base, commit, árvore, origem e hashes. Os artefatos brutos
continuam no caminho local registrado: não foram publicados logs de sessão, `.env`,
credenciais ou dumps. Hash comprova integridade do arquivo, não resultado PASS.
Pareceres textuais selecionados foram copiados para este dossiê e verificados.

## Trabalho realizado e limites da aceitação

| Lote | Trabalho preservado | Evidência registrada | O que ainda falta |
|---|---|---|---|
| FIGMA-001 | Shell, caixa e thread de Conversas; ciclo de resposta do prestador em `/prestador/conversas`; acesso com dois atores e negação real de terceiro | GLM PASS e Flash PASS; 24 provas UI, 21 E2E e 31 hashes MATCH no candidato daquela rodada | HTTP 500 sem causa confirmada, flake na ficha e negativa de reports preexistente; não declarar produto pronto |
| FIGMA-002 | Catálogo, detalhe, publicação/revisão, edição, rascunho, filtros, interesse/conversa; 12 fotos, EXIF, RLS, salvos privados, denúncias, operação, trilha e bytes autenticados | pgTAP delta: 99 arquivos/1323 assertions PASS; 655 unitários PASS; nova rodada E2E delta run15: 27 PASS em 9,6 min nos três viewports, após run14 com 21 PASS/6 FAIL | Novo gate/capturas/hash estáveis, checkpoint do candidato, reavaliação GLM do delta, runtime Flash novo e aprovação visual |
| Coordenação | Inventário Figma Web/Mobile e reactions por Luna; contratos e ADR; troca controlada de provedores; preservação de sessões/handoffs; reconciliação do board | Node IDs no mapa, contratos, pareceres e manifestos deste dossiê; 118 cards preservando todos os 114 IDs da main e suas provas | Publicação autorizada dos registros e continuidade dos módulos restantes |

O candidato anterior FIGMA-002 `wITXiIVv0a4vhurshsnJ0`, com 1204 hashes,
gate verde e E2E run15 com 21 PASS, é **baseline anterior aos reparos**.
Não usar seu PASS para o código modificado posteriormente.

Pareceres FIGMA-001 preservados: [revisão técnica](../evidence/figma-2026-10-06/figma001-review-verdict.md)
e [runtime independente](../evidence/figma-2026-10-06/figma001-runtime-verdict.md).
São textos finais dos modelos, sem prompts/ferramentas. Seus limites permanecem
registrados; preservação documental não renova o PASS contra alterações posteriores.

GLM 5.3 via Nvidia fez primeira revisão de aproximadamente 79 minutos e delta de
169 minutos. [Primeiro parecer](../evidence/figma-2026-10-06/glm-figma002-first-review.md)
e [parecer delta](../evidence/figma-2026-10-06/glm-figma002-delta-review.md) foram
preservados. Codex recusou fechamento mesmo após PASS técnico: aviso de ocultação
na edição, negativa de report de outro tipo, semântica de filtros e compatibilidade
da API antiga exigiam reparos. GLM nesse provedor não aceita PNG; seu parecer não
aprova fidelidade visual. Não ampliar seu uso antes de medir achados e retrabalho.

Rodada run14 falhou nos três viewports em denúncia/moderação e no título atualizado
do imóvel na conversa. Após diagnóstico por etapas, a denúncia desktop passou em
uma execução dirigida de 40,1 segundos; o diagnóstico revelou espera da captura
por imagem sem `src`. Isso não fecha os três viewports nem o lote. A captura não
pode ignorar fotos reais quebradas ou fabricar aprovação. Exigir nova prova completa.

Atualização 07/10/2026 02:25Z: Codex leu o log bruto
`figma002-runtime/e2e-delta-repair-run15.log`: **27 passed (9.6m)**.
Denúncia/moderação e publicação/edição/interesse/conversa passaram em 375/768/1440.
O [registro de integridade desta rodada](../evidence/figma-2026-10-06/repair-run15-proof.json)
identifica log, checkpoint terminal e helper de captura por SHA-256.
O implementador atribuiu o timeout à espera sem limite por imagem lazy e a falha
de conversa ao resíduo da execução interrompida. A hipótese de redirecionamento
ocasional para onboarding continua sem reprodução. O helper agora limita a espera,
mas suas capturas ainda exigem auditoria de fotos visíveis e das seções inferiores.
Esse PASS E2E é prova do executor conferida pelo coordenador; não substitui gate
final, revisão independente, hashes do candidato ou aprovação visual.

## Sessões e responsabilidades

| Papel | Modelo/provedor | Sessão e estado no registro |
|---|---|---|
| Coordenação | Codex | Confere evidências, adjudica revisão e mantém este índice/card |
| Implementador atual | `opencode/space-bunny-free` | `ses_eedf75d61ffeYK4MADSQrXnuQM`; único escritor; checkpoint solicitado para versionar o estado |
| Revisor FIGMA-002 | `nvidia/z-ai/glm-5.3` | `ses_eeec158c6ffehXpLc0ilkJFz6n`; inativo aguardando novo candidato |
| Runtime FIGMA-001 | DeepSeek V4.1 Flash, TokenPlan naquela rodada | `ses_eefd3e9f5ffeOQp6O91qgVMuWC`; PASS histórico limitado ao candidato 001 |
| Runtime FIGMA-002 | `nvidia/deepseek-ai/deepseek-v4.1-flash` previsto | Ainda não iniciado; exige aprovação técnica Codex e candidato congelado |
| Inventário/critica ADR | GPT-6 Luna | Subagente solicitado pelo dono; preparação não é implementação/runtime |

Fonte canônica dos IDs atuais: `orchestration/sessions.json` do helper na pasta
local `.visual/opencode-figma-20261005/`. OpenAI
`ses_eef1c5897ffekiWHMU12yPayH4` e sessões Qwen anteriores permanecem preservadas.
O histórico de trocas e falhas dos provedores está no documento de coordenação.
Não comprar créditos nem mudar credenciais. Spacebunny foi explicitamente autorizado
a receber código/contratos; dados de autenticação e `.env` continuam proibidos.

## Restante do produto

Início/Busca, Desapegos, Negócios/Serviços, Encontros, Memória, Guias, Benefícios,
perguntas à cidade, Perfil/Configurações, entrada/elegibilidade e retorno/Andamento
ainda exigem reconciliação e fechamento contra o Figma atual. Capacidades históricas
podem ser reutilizadas; não representam aprovação atual nem ausência total de código.
O mapa vincula os nodes; cada próximo contrato deve registrar rota, ação, persistência,
retorno, recuperação e negação. A contagem de cards não fornece percentual de conclusão.

O dono pediu limpeza do board: seis cards foram reconciliados com snapshots de
histórico, três W00 congelados e nenhum dos 73 IDs removido. Não reiniciar W00,
criar outra fila ou marcar done sem provas. Mobile não bloqueia conclusão web.

O confronto posterior com `origin/main` revelou **114 cards na main**, incluindo
44 IDs ausentes no checkout antigo. A primeira reconciliação (117 cards) trocou o
conteúdo de seis cards da main pela versão do checkout antigo e reabriu
RECON-PRANCHAS-RESTANTES, fechado na main em 18/09 com RECON-032/038 dependentes
done — a validação do board reprovava. Correção de 07/10: os seis cards mantêm o
status e o texto da limpeza pedida pelo dono, com todas as provas, testes e links
da main restaurados; RECON-PRANCHAS-RESTANTES volta a done como na main; a
coordenação Figma passa ao card **FIGMA-WEB-ATUAL**. Board publicado: **118 cards**.
O checkpoint de 73 cards é histórico, não a versão a publicar.

Validação do registro: `board.mjs --check` válido, testes de escopo e varredura de
segredos verdes na revisão publicada. A varredura ganhou uma exceção estreita para
links `figma.com/design/<chave>/`, com teste positivo e dois negativos.

Checkpoints locais: `9c30c40d522cd26dd14f8c5397324fb4560e7a88` (worktree Figma)
e `6d6f713af318c059fee685dc0140427a6a6842b0` (checkout principal herdado).
Branch documental: `docs/figma-rastreabilidade-20261006`, baseada na main remota
`1134c7cece57c6c734d68cead6e2c6f47f4ae1e7`. Os manifestos permitem localizar cada
arquivo no snapshot e conferir o conteúdo sem presumir que o HEAD do escritor mudou.

## Segurança operacional e próximo checkpoint

Somente API 55621/DB 55622 com seed preservado e pgTAP 55722 sem seed foram
autorizados para estas provas. Stacks compartilhados 553/554 permanecem intocados.
Migrations são append-only; não resetar shared ou apagar fixtures de outras provas.
Limpeza usa IDs/caminhos próprios, guard exato 55621 e manifesto preservado.

Antes de cada nova entrega: commit/checkpoint identificável, contrato válido,
build e hashes correspondentes; revisão independente do delta; runtime independente;
capturas 375/768/1440 comparadas ao Figma, incluindo rolagem interna inferior.
Nunca promover snapshot WIP a produção por relato ou orçamento esgotado.
Push, PR, merge e deploy dependem da autorização vigente; este registro local
não afirma que já foi incorporado à `main` remota.
