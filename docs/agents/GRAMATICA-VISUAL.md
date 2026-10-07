# Gramática visual — extração executável

> **O que este documento é:** a tradução em regras verificáveis do contrato visual **já autorizado**.
> **O que ele não é:** uma nova direção visual, uma nova paleta, um novo sistema de componentes ou
> uma substituição do [guia visual](../design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md),
> do [mapa de telas](../design/visual-guide-2026-09-06/MAPA-DE-TELAS.md) ou do
> [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
>
> Origem: pedido do responsável em 2026-09-24, após comparação com um produto externo feito em
> horas cujo visual se mostrou mais coerente que o do Bivaque apesar de ter menos telas e nenhuma
> auditoria. O diagnóstico não foi "falta aparência melhor", foi **falta de regra verificável**.
>
> Nenhuma regra abaixo cria comportamento, autorização, dado ou aparência novos. Regra sem fonte
> autorizada está marcada **PROPOSTA** e não pode ser tratada como contrato antes de adjudicação —
> coerente com `docs/agents/design-audit/ADJUDICATION.md` ("do not add an unadjudicated rule during
> rewrite/cleanup").

---

## 1. Por que este documento existe

O Bivaque tem **vocabulário** visual (tokens primitivos, semânticos, wrappers, rubrica) e não tem
**gramática**: regra operacional que diga qual é o esqueleto obrigatório de uma tela, o que a cor
pode significar, e como um número se comporta numa coluna.

### 1.1 O que foi medido (2026-09-24, `scripts/visual/grammar.mjs`)

| Métrica | Valor |
|---|---:|
| Rotas medidas | 54 (1 experimento excluído) |
| **Aderência (§11.4)** | **31,5%** |
| Rotas com violação estrutural de rota | 29 |
| Rotas só com violação cosmética | 8 |
| Rotas limpas | 17 |

**O achado que decide:** as rotas que falham concentram-se no backlog já nomeado pela
[especificação de 08/09](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md) — W01
(admissão e acesso), W03 (administração de comunidade), W05 (Guia), W06 (serviços e prestador) — mais
as páginas legais. As telas que a §7 daquela especificação manda *"revisar e integrar"* — Início,
Explorar, Comunidades, Notificações, Grupos, Mensagens, Perfil, Configurações — estão **limpas**.

Ou seja: o vício não está espalhado pelo produto. Ele está concentrado onde o produto ainda não
acabou.

### 1.2 O vício é sistêmico antes de ser por tela

- **`PageHeader` aparece em 2 de 173 arquivos `.tsx`.** Existe um cabeçalho compartilhado e 53 de 54
  rotas compõem o seu à mão. Não é defeito de nenhuma tela isolada; é ausência de adoção do
  vocabulário que já existe.
- **Gradiente legado vive em 4 folhas `.module.css`** — incluindo a tela de login
  (`bivaque-sign-in.module.css`), `landing`, `onboarding` e `experimento`. São o regime visual
  anterior, ainda alcançável.
- 55 `page.tsx`, 267 arquivos, ~29.600 linhas em `apps/web`, quatro papéis e estados obrigatórios por
  rota — extensão em que coerência só sobrevive se estiver escrita.

Tokens são dicionário. Isto aqui é a gramática que falta: poucas regras, todas citáveis e a maioria
verificável por script.

---

## 2. Autoridade e leitura

Ordem de autoridade inalterada: produto/segurança → restrições técnicas do repositório →
`DESIGN_SYSTEM.md` → evidência externa → conhecimento genérico. Este documento só pode ser lido
dentro dessa ordem.

Notas de força (as mesmas do `DESIGN_SYSTEM.md` §1.1):

| Marca | Significado |
|---|---|
| **MUST** | protege confiança, acessibilidade ou coerência sistêmica |
| **SHOULD** | padrão que exige motivo para ser quebrado |
| **PROPOSTA** | sem fonte autorizada; precisa de adjudicação antes de virar contrato |

---

## 3. As quatro regras operacionais

### 3.1 Cor só aparece quando significa algo

**MUST.** A cor comunica um estado do produto, nunca decora. Fora dos papéis listados, a superfície
é canvas, surface, ink ou muted.

| Papel | Cor significa | Token (§4.2) |
|---|---|---|
| Ação principal | a coisa que a pessoa deve fazer nesta tela | `semantic.action-primary` |
| Contexto | localização, navegação e informação | `semantic.action-context` |
| Sucesso | confirmação positiva, adimplência, entrada | `semantic.success` |
| Atenção | pendência, vencimento, o que exige olhar | `semantic.warning` |
| Perigo | dano, denúncia, remoção, saída | `semantic.danger` |
| Seleção | aba ativa, item selecionado, destaque calmo | `semantic.selected` |

**MUST NOT:** cor como único sinal de estado (§4.2); gradiente decorativo; sombra colorida;
matiz fora dos papéis acima.

O que muda em relação ao que está escrito hoje: §4.2 lista os papéis e o uso, mas não **fecha** a
lista. Uma lista fechada é o que permite dizer "esta cor aqui não tem função" — e é o que o script
verifica.

### 3.2 Esqueleto obrigatório de tela

**MUST.** Toda rota de tarefa tem exatamente três camadas, nesta ordem:

1. **Cabeçalho** — um `h1` (`PageHeader`) dizendo o que a tela é, mais uma linha de contexto que
   explica o escopo ("o que entrou, o que saiu e quem está pendente").
2. **Números** — só quando a tela tem números que decidem algo. Todo número carrega subtexto: de
   onde veio ou o que significa.
3. **Detalhe** — a lista, tabela ou formulário.

**MUST NOT:** duas estruturas de topo diferentes na mesma rota; cabeçalho artesanal quando
`PageHeader` existe; `h1` fora do cabeçalho.

Fonte: `DESIGN_SYSTEM.md` §4.3 ("um `h1` por tela de tarefa"), §1.2.2 ("escolha um padrão e
componentes existentes antes de criar anatomia nova"), §11.1 (Hierarquia, Densidade).

O que muda: §1.2 diz **como construir**, mas nada obriga a tela a **reusar** o mesmo esqueleto. Com
`PageHeader` em 2 de 173 arquivos, o padrão existe e não é usado.

### 3.3 Regras numéricas

| Regra | Força | Fonte |
|---|---|---|
| Sinal antes do valor: `+ R$ 50,00` / `− R$ 89,00` | MUST | **PROPOSTA** |
| Cor pelo sinal: entrada positiva, saída negativa | MUST | **PROPOSTA** (deriva de §4.2) |
| Coluna de valor não quebra linha (`whitespace-nowrap`) | MUST | **PROPOSTA** |
| Algarismo tabular em coluna de valor (`tabular-nums`) | SHOULD | §4.3 (Meta) — **PROPOSTA** na forma executável |
| Todo número agregado tem subtexto | MUST | §11.1 (Hierarquia) — **PROPOSTA** na forma executável |
| Coluna com o mesmo valor em quase todas as linhas não existe | SHOULD | §11.1 (Densidade) — **PROPOSTA** |

Estas são as regras **sem fonte autorizada explícita** — e são exatamente as que teriam evitado os
defeitos observados no produto de referência (valor quebrando linha porque a coluna ao lado repetia
o mesmo nome 100% das vezes). Precisam de adjudicação antes de virarem gate.

### 3.4 Proibições

**MUST NOT**, verificáveis: emoji como ícone (`§10.3`); gradiente decorativo (`§4.1`);
`style={{}}` inline quando existe token (`§1.2.3`); valor bruto fora de token (`§1.2.3`, §11.4
"sem token cru"); valor Tailwind arbitrário `[...]` fora da escala (§8.2).

**MUST NOT**, só verificáveis em runtime (declaradas, não medidas hoje): card dentro de card; mais
de um nível de elevação na mesma superfície; duas tabelas de topo na mesma rota.

---

## 4. Tabela de regras

`classe` é o que a regra custa para consertar. É o corte que decide entre normalizar e recriar.

| ID | Regra | Classe | Detecção | Fonte |
|---|---|---|---|---|
| `G-01` | Rota sem `h1` e sem `PageHeader` | estrutural | estática | §4.3 |
| `G-02` | Cabeçalho artesanal (`h1` cru, sem `PageHeader`) | estrutural | estática | §1.2.2 |
| `G-03` | Lista sem estado vazio | estrutural | estática | §1.2.4, §11.1 |
| `G-04` | Leitura assíncrona sem estado de erro | estrutural | estática | §1.2.4, §11.1 |
| `G-05` | Leitura assíncrona sem estado de carregamento | estrutural | estática | §1.2.4, §11.1 |
| `G-10` | Cor bruta (hex/rgb/hsl) fora de token | cosmético | estática | §1.2.3, §11.4 |
| `G-11` | Valor Tailwind arbitrário `[...]` (medida chumbada) | cosmético | estática | §8.2 |
| `G-12` | Número formatado sem `nowrap`/`tabular-nums` | cosmético | estática | **PROPOSTA** |
| `G-13` | `style={{}}` inline | cosmético | estática | §1.2.3 |
| `G-14` | Gradiente decorativo | cosmético | estática | §4.1 |
| `G-15` | Emoji como ícone | cosmético | estática | §10.3 |
| `R-01` | Célula de valor quebrando linha | cosmético | runtime | **PROPOSTA** |
| `R-02` | Número agregado sem subtexto | estrutural | runtime | **PROPOSTA** |
| `R-03` | Coluna redundante (>90% das linhas com o mesmo valor) | estrutural | runtime | **PROPOSTA** |
| `R-04` | Card dentro de card | cosmético | runtime | **PROPOSTA** |
| `R-05` | Duas tabelas de topo na mesma rota | estrutural | runtime | **PROPOSTA** |

**Definição do corte:**

- **Cosmético** — conserta-se dentro da tela, sem tocar rota, dado, autorização ou componente
  compartilhado. É passada de normalização: um autor, uma passada, sempre publicável.
- **Estrutural** — a tela não compõe do vocabulário autorizado. Consertar significa reescrever a
  composição da tela, às vezes a rota. É onde recriar pode ser mais barato que reconciliar.

---

## 5. Camada de runtime — declarada e não executada

`R-01` a `R-05` exigem DOM renderizado. O audit atual
([`scripts/visual/capture.mjs`](../../scripts/visual/capture.mjs), linha 10) cobre as regras
**mecânicas**: alvo de toque, overflow, contraste, presença de movimento.

Ele **não** cobre nenhuma regra desta gramática, e é importante dizer por que: slop não é
mecanicamente inválido. Uma coluna de valor que quebra linha passa em contraste, passa em alvo de
toque, passa em movimento e passa em disciplina de token. Por isso a comparação externa de
2026-09-24 produziu um app visualmente coerente com o pior defeito possível numa tela de dinheiro.

Enquanto `R-01`–`R-05` não estiverem implementadas, **o placar é um limite inferior**: ele mede o
que é medível sem renderizar, não o que existe.

---

## 6. Como medir

```sh
node scripts/visual/grammar.mjs                 # placar do estado atual
node scripts/visual/grammar.mjs --json          # só JSON, para CI
node scripts/visual/grammar.mjs --top 20        # rotas mais violadas
```

A saída classifica cada rota por contagem estrutural e cosmética e calcula a **Aderência** definida
em `DESIGN_SYSTEM.md` §11.4 ("proporção de telas auditadas sem token cru nem violação de contrato").

O placar é instrumento de decisão, não gate. Ele vira gate só depois que as regras **PROPOSTA**
estiverem adjudicadas.
