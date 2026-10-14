# Bivaque — Rodada 02: acesso, cidade e momento, configurações

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-002.task.yml` (R2). Base: `f537625e`.
Formato enxuto definido no [HANDOFF](HANDOFF.md): uma frente, prova executável,
fechamento único.

**Veredito: PASS.** Acesso, cidade e momento e configurações estão comprovados em
execução, com 3 defeitos reais corrigidos e gate completo verde. Os domínios das
próximas rodadas continuam abertos.

## Escopo

Ações que estavam em categoria 4 (handler sem prova) no inventário da Rodada 01:
`onboarding`, `onboard-next`, `onboard-prev`, `onboard-finish`, `interest-toggle` no
cadastro, `city`, `apply-city`, `home-city`, `settings`, `prototype`,
`apply-prototype` e `reset-prototype`. Nenhuma tela foi redesenhada.

## Defeitos encontrados pela prova e corrigidos

Todos em `src/app/handlers.js`. Cada um tem um checkpoint que falha no código anterior
e passa no corrigido (verificação de regressão feita revertendo o arquivo).

1. **Troca de cenário descartava o número de famílias informado.** Agora o valor
   digitado é mantido; sem edição, vale o padrão do novo cenário (ajuste pedido pela
   revisão independente).
2. **Troca de cenário e "Recomeçar do zero" anunciavam sucesso mesmo com falha de
   gravação**, deixando memória e armazenamento divergentes. Agora o estado anterior é
   restaurado, o diálogo continua aberto e aparece só o erro.
3. **Cadastro aceitava "Estou saindo" sem destino ou com destino igual à cidade.**
   Agora pede um destino diferente, como já fazia o diálogo de Cidade.

## Comprovado em execução (`scripts/bivaque-html/round02-proof.mjs`)

12 checkpoints por contexto, em 375/768/1440 × claro/escuro:

- cadastro completo, com persistência após reload e limite de 3 interesses;
- validação de nome, termos, código de família inválido ou válido (convite marcado como usado), cidade, data e destino;
- verificação "em análise" salva, com aviso, e bloqueio de publicação;
- Voltar, voltar do navegador e Escape preservam o rascunho, não gravam dados parciais e devolvem o foco;
- cidade consultada: Criar desabilitado, aviso visível, nada publicado, retorno à cidade de origem;
- Configurações (nome, tema escuro, privacidade) persistem após reload;
- controles do protótipo (verificação, famílias, cenário, reinício);
- falha de gravação no cadastro e no reinício.

| Prova | Resultado |
| --- | --- |
| Referência congelada, build determinístico, 20 testes do builder | PASS |
| Rodada 02, matriz completa | PASS, 72/72 checkpoints, 0 erros JS, 0 requisições externas |
| Regressão Rodada 01 (jornadas globais) | PASS, 198 checkpoints |
| Visual (zona instável + hashes DOM/estilo) | PASS, 132 capturas, 12/12 cenários estritos |
| Gate completo do repositório | PASS (lint, typecheck, build, test, secrets) |
| Revisão independente (code-reviewer) | Sem achados CRITICAL/HIGH/MEDIUM; LOW 1 corrigido, LOW 2 abaixo |

Candidato: `6d62c647f08432bc709700684d29075c18348319e06b46fa275990e3016a1d02`.

## Limites e pendências

- Seleções do Material Web são feitas por clique real; a data usa o `input type=date` nativo.
- "Recomeçar do zero" sempre volta ao cenário "Cidade ativa", mesmo partindo de
  "Cidade começando". Esse comportamento é anterior a esta rodada e não foi alterado,
  porque é uma regra de produto.
- Verificação de identidade real, convites entre pessoas e cobrança continuam fora
  do protótipo.
- Próxima rodada pelo roadmap: **03 Desapegos, Imóveis e Negócios** (publicar, ver,
  editar, salvar, demonstrar interesse e encerrar).
