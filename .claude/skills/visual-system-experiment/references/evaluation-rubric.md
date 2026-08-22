# Régua de avaliação de candidato visual

Aplique na ordem. Não misture: um candidato reprovado nos eliminatórios não entra na
comparação estética, por melhor que pareça.

## 1. Eliminatórios (passa / não passa)

| Critério | Reprova quando |
|---|---|
| Alvo de toque | qualquer alvo interativo abaixo do mínimo do `DESIGN_SPEC` em 375 |
| Contraste | texto ou ícone informativo abaixo do mínimo, em claro **ou** escuro |
| Foco | foco de teclado invisível, ou ordem de foco que não segue a leitura |
| Semântica | papel/rótulo errado (botão que é `div`, campo sem label associada) |
| Token | valor cru onde existe token; token inventado fora do `DESIGN_SPEC` |
| Regressão | um estado que existia (vazio, carregando, erro) sumiu |
| Fronteira | escreveu fora de `allowed_paths` |

Reprovou em qualquer linha: candidato **inválido**. Registre a linha, não negocie.

## 2. Objetivo (medido, não opinado)

- Achados da auditoria `.visual/<run>/`, por severidade — mesmo conjunto de rotas para todos.
- Estados cobertos: vazio, carregando, erro, sucesso, permissão negada.
- Reaproveitamento: componentes existentes usados **vs.** inventados. Inventar sem
  necessidade é dívida, não originalidade.
- Tamanho do diff. Menor não vence sozinho, mas diferença grande precisa de justificativa.
- Comportamento em 375 / 768 / 1440.

## 3. Ofício (argumentado, e marcado como argumento)

- **Hierarquia**: o olho encontra primeiro a ação principal?
- **Ritmo**: o espaçamento tem sistema, ou cada bloco negociou o seu?
- **Densidade**: cabe a informação que a tela precisa carregar, sem ruído?
- **Coerência**: parece o mesmo produto das outras telas, ou uma ilha bonita?
- **Voz**: o texto fala como o produto fala com militar, veterano e pensionista?

## 4. Saída do juiz

- Tabela candidato × critério, com evidência (`arquivo:linha`, número da auditoria).
- Ranking **com distância**: "A e B empatam, C fica atrás" é resultado válido.
- A pergunta que sobra para o humano, explícita.
- `NENHUM` quando ninguém passa os eliminatórios. O menos ruim não é vencedor.
