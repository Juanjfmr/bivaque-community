# Bivaque — Rodada 05: Encontros/Eventos e avisos

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-005.task.yml` (R2). Base: `b85c65a3`.

**Veredito: PASS.** Encontros ligados e comprovados em execução, com os achados da revisão corrigidos e o gate completo verde.

## Situação encontrada

No HTML original congelado, os botões **Criar encontro, Editar encontro, Publicar,
Confirmar presença e Cancelar encontro não tinham tratamento**. O editor
(`openEventEditor`) e a gravação (`submitEvent`) existiam, mas nada os chamava. A
Rodada 01 desviou esses botões para um aviso de "dependência futura", como pedia o
escopo daquela rodada. Conversas e Avisos já tinham sido comprovados nas Rodadas
00.1 e 01.

## O que foi ligado (`src/app/handlers.js`, sem tela nova)

- **Criar e editar encontro** usam o editor existente. Validam título, local,
  descrição, data futura e, agora, **número de vagas** (inteiro de 1 a 10.000).
- **Confirmar presença**, com estas regras:
  - conta e desconta presenças;
  - recusa quando as vagas acabaram ou quando o encontro já aconteceu;
  - exige perfil verificado e não vale para encontro próprio;
  - o aviso diz "neste dispositivo", porque presença local não é confirmação
    operacional.
- **Cancelar encontro** pede confirmação, volta para a agenda e permite desfazer.
- **Denunciar** continua no aviso de dependência, porque exige moderação real.

## Defeitos da revisão independente, corrigidos com checkpoint

1. **MEDIUM:** o campo de vagas não era validado. Aceitava -3, 2,5 e 20.000, e um
   número negativo deixava o encontro "esgotado".
2. **LOW:** era possível confirmar presença em encontro que já aconteceu.

Os dois checkpoints falharam antes da correção e passam depois.

## Provas da Rodada 01 atualizadas

Três provas da Rodada 01 tratavam o encontro como dependência futura. Elas foram
ajustadas para o novo comportamento, mantendo a intenção de cada uma:

- **6 opções do Criar:** "Criar encontro" agora precisa abrir o editor de verdade
  (campo do título). A verificação ficou mais forte.
- **Histórico do Criar:** o nome foi atualizado e a asserção, que ficaria vazia, foi
  trocada pela exigência do campo do título.
- **Diálogo + recarga + voltar sem histórico fantasma:** o diálogo agora é o editor
  de um encontro próprio. A verificação de histórico e foco é a mesma. A revisão
  confirmou que a régua não foi afrouxada. Ressalva: o aviso de dependência (hoje só
  em Denunciar) perdeu essa cobertura específica de recarga.

## Comprovado em execução

Prova: `scripts/bivaque-html/round05-proof.mjs`. São 12 checkpoints por contexto, em
375/768/1440 × claro/escuro:

- criar e validar;
- vagas inválidas;
- editar sem duplicar;
- confirmar e cancelar presença com persistência;
- encontro lotado;
- encontro passado;
- cancelar encontro com desfazer;
- presença exige verificação;
- falha de gravação;
- agenda e voltar;
- nível de avisos de grupo.

| Prova | Resultado |
| --- | --- |
| Referência, build determinístico, testes do builder | PASS |
| Rodada 05, matriz completa | PASS, 72/72, 0 erros JS, 0 requisições externas |
| Regressão Rodada 04 | PASS, 78/78 |
| Regressão Rodada 03 | PASS, 108/108 |
| Regressão Rodada 02 | PASS, 72/72 |
| Regressão Rodada 01 | PASS |
| Visual | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |
| Revisão independente | 1 MEDIUM e 1 LOW corrigidos; demais LOW abaixo |

Candidato: `1352dea97e80025f352efc8062b43938161133731ae3c248e46178c7888a44c5`.

## Pendências registradas

- LOW: o encontro próprio que já passou mostra "Editar encontro", mas a data mínima
  impede salvar, com a mensagem genérica "Confira a data".
- Avisar quem confirmou presença sobre edição ou cancelamento depende de backend.
- Denúncia (`report`) segue como dependência de moderação real e sem a prova
  específica de recarga.
- Próxima e última pelo roadmap: **06 Monetização e acabamento final**, com prova
  ampla e a lista de adaptadores para o Supabase.
