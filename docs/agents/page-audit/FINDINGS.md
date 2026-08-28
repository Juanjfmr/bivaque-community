# Page Audit Findings

Ledger de achados da auditoria página a página.

## Formato obrigatório

Cada finding deve conter:

- `PA-###` — ID estável;
- Page ID(s);
- dimensão;
- severidade;
- status de evidência;
- regra `DS-*` / `VG-*` aplicável;
- evidência concreta;
- impacto no usuário;
- critério de fechamento;
- link para issue/PR de correção quando existir.

Não registrar “parece ruim”, “moderno”, “clean” ou preferências sem regra/evidência.

## Carry-in queue — evidência já existente a reatribuir por página

O `PHASE6_REVIEW.md` já mantém evidência runtime válida que não deve ser descartada. Ao auditar a página correspondente, revalidar ou reutilizar somente quando a condição de evidence reuse continuar verdadeira.

| Contrato | Baseline existente | Alvo provável da auditoria |
|---|---|---|
| `DS-010` | scope/locality truth falha no shell para conta Rio | páginas `member_shell` afetadas |
| `DS-011` | parent/landed state diverge entre mobile e rail/sidebar | páginas aninhadas do `member_shell` |
| `DS-014/015` | erro pode colapsar em empty semantics em grupos | `GRP-01` e fluxos similares |
| `DS-016/027` | mensagem crua de backend pode chegar ao usuário | páginas que usam shared error path |
| `DS-021` | compound control de localidade não satisfaz contrato canônico de tabs | página onde o controle é renderizado |
| `DS-029` | runtime não pode alegar WCAG AA enquanto falha objetiva conhecida persistir | auditoria transversal + páginas afetadas |
| `DS-035` | copy portuguesa sem diacríticos foi observada em fallback de rota | estados de erro/fallback aplicáveis |

Esses itens não recebem automaticamente um novo `PA-*`. O finding nasce quando a auditoria consegue atribuir a violação a uma página/estado concreto.

## Findings confirmados

Nenhum ainda nesta branch. O scaffold não transforma evidência histórica em novo veredito sem atribuição por página.
