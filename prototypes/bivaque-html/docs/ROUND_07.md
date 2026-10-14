# Bivaque — Rodada 07: polimento premium

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-007.task.yml` (R2). Base: `485395cd`.

**Veredito: PASS.** Os critérios medidos passam, com 3 correções baseadas em evidência, regressão completa verde e gate verde. A medição não substitui uma auditoria de acessibilidade com tecnologia assistiva real (ver limites).

## Método: medir antes de mexer

Toda mudança precisava de evidência objetiva, conforme a auditoria UX da Rodada 01
("acabamento motivado por evidência"). A prova `round07-proof.mjs` **mediu primeiro** e
só o que falhou foi corrigido. Duas suspeitas da recomendação anterior **não se
confirmaram** e não foram alteradas:

- **Aviso cobrindo a barra inferior ou o "Criar":** sem sobreposição em 375, 768 e
  1440 px. O caso visto na varredura da Rodada 06 era momentâneo.
- **"Criar" ou barra escondendo o fim das telas:** o último controle de cada tela
  ficou alcançável. O app rola dentro de um contêiner próprio, e a primeira versão do
  teste rolava a janela errada.

## Medições (critérios objetivos)

| Critério | Antes | Depois |
| --- | --- | --- |
| Aviso não cobre navegação nem Criar | PASS | PASS |
| Fim de cada tela alcançável | PASS | PASS |
| Nome acessível em todo controle e `alt` em imagens | PASS | PASS |
| Aviso anunciado a leitor de tela (`role=status`/`aria-live`) | PASS | PASS |
| Contraste de texto WCAG AA (4,5:1; 3:1 em texto grande), no alcance medido (ver limites) | **FAIL**: "Ocultar" 4,48:1 | PASS |
| Alvo de toque mínimo WCAG 2.2 (24 px) | PASS | PASS |
| Movimento reduzido respeitado em menu e diálogo | PASS | PASS |
| Mensagem de erro diz o que corrigir | **FAIL**: "Confira a data, o horário e a descrição" | PASS |
| Data vazia no encontro tem mensagem própria (achado da revisão) | **FAIL**: "precisa ser hoje ou depois" | PASS |

A medição de contraste compõe camadas semitransparentes. Quando há foto por baixo, usa
o pior caso entre fundo branco e fundo preto. A primeira versão acusava os selos sobre
fotos ("Imóvel", "Patrocinado"), mas uma captura confirmou texto branco sobre fundo
escuro a 84%, e a medição foi corrigida antes de qualquer mudança no app.

## Correções

1. **Botão "Ocultar"** (revelado ao arrastar uma pergunta): a cor fixa passou de
   `#71787D` para `#6C7378` (`motion/gestures.js`), de 4,48:1 para cerca de 4,8:1. O
   token global de contorno **não** foi alterado.
2. **Mensagens de validação específicas**, cada uma dizendo o que corrigir:
   - encontro, na ordem dos campos: nome, "Informe a data do encontro", "A data do
     encontro precisa ser hoje ou depois", horário e descrição. A revisão
     independente (MEDIUM) apontou que a data **vazia** recebia a mensagem de data
     passada; corrigido, com checkpoint que falhou antes e passa depois;
   - anúncio: título, preço, bairro e descrição, cada um com sua mensagem;
   - cidade e momento: "Informe a data de chegada" ou "de saída";
   - cadastro: "Escolha sua cidade" ou "Informe a data da chegada ou mudança".

## Prova

| Prova | Resultado |
| --- | --- |
| Referência, build determinístico, testes do builder | PASS |
| Rodada 07, matriz completa | PASS, 48/48, 0 erros JS, 0 requisições externas |
| Rodada 06 (varredura de botões) | PASS, 36/36 |
| Rodadas 05 / 04 / 03 / 02 | 72/72 / 78/78 / 108/108 / 72/72 |
| Rodadas 01 e 00.1 | PASS / PASS |
| Visual | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets). Primeira execução falhou no lint do próprio script de prova (reatribuição de parâmetro); corrigido e checkpoint de contraste repetido na matriz completa: 6/6 |
| Revisão independente | 1 MEDIUM no app corrigido (data vazia); limites da régua registrados abaixo |

Candidato: `0057525214630429c17ffee631e26ed4edb6a3b7682095dc40cb93646e797f2c`.

## Limites desta medição (apontados pela revisão independente)

A régua é útil para regressão, mas **não é uma auditoria WCAG completa**:

- **Contraste:** ignora texto esmaecido (opacidade ou cor translúcida), lê a cor pelo
  elemento hospedeiro (os botões Material pintam rótulo e fundo dentro do shadow DOM)
  e não abre diálogos. O tema escuro só é medido com `--full`.
- **Nome acessível:** não cobre interruptor, rádio, caixa de seleção, seleção e abas
  do Material. `alt=""` passa mesmo em imagem informativa.
- **Fim de tela:** verifica o centro do último controle com ação, não a base de
  cartões altos nem texto sem ação.
- **Movimento reduzido:** cobre o menu Criar e o diálogo de cidade; não cobre o
  gesto de arrastar nem a rolagem suave.
- **Tecnologia assistiva real** (VoiceOver/TalkBack), texto ampliado do sistema e
  estados de foco e hover não foram testados. Isso é obrigatório antes do lançamento,
  com uma ferramenta dedicada (axe-core) e teste manual.
- Animações novas não foram adicionadas: nada na medição as exigia. Transições do
  cartão para o detalhe são decisão de design, a aprovar.
