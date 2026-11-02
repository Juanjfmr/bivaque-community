# Padrão de tela — régua Nextdoor (01/11/2026)

O dono aprovou o F01 refeito e pediu que ele seja o padrão das próximas jornadas. As peças (cor, forma, texto,
ícone, imagem) estão em [IDENTIDADE-DAS-PECAS.md](IDENTIDADE-DAS-PECAS.md). Referência viva:
`apps/app/src/previa-f01/` (prévia em `/app/previa/f01`, só no servidor de desenvolvimento). Este padrão se
soma à régua do [HANDOFF](HANDOFF.md) (quatro dimensões) e não a substitui.

## O que deixava as telas amadoras

Antes da reconstrução, a mesma tela juntava estes problemas:
- parágrafo cinza de 2 a 5 linhas embaixo de todo título;
- tudo em cartão branco igual;
- seis tamanhos de texto;
- rótulo em negrito pequeno em cima de cada campo;
- foto sem relação com o assunto (máquina de café em "Saúde");
- a mesma foto em duas telas;
- coluna de celular solta no computador;
- ícone que não faz nada;
- texto que explica o sistema: métricas da plataforma, "consulta" e "Contagens arredondadas e só a partir de 10".

## Regras

**Texto**
- O título é a pergunta ou a afirmação para a pessoa. O apoio tem no máximo uma linha. Explicação longa vai para
  um "Por que…?" que abre e fecha.
- A tela fala com a pessoa, nunca descreve o sistema. Fica fora da tela:
  - mecanismo, nome de função, "consulta";
  - regra de privacidade (ela vale no código);
  - métrica da plataforma.
- O momento de valor é conteúdo concreto do momento da pessoa. Exemplo: perguntas de quem chegou antes e o
  próximo encontro, nunca "mais de 1.000 membros".
- O botão diz o que acontece ("Enviar código", "Confirmar vínculo", "Continuar com 2 grupos").
- Todo erro diz como sair.

**Escala, cor, forma, ícone e imagem**
- Desde 02/11 valem as regras de [IDENTIDADE-DAS-PECAS.md](IDENTIDADE-DAS-PECAS.md). Elas substituem a escala, o
  raio, o acento e a regra de imagem que estavam aqui (Serif 30 em todo título, botão de raio 12, Brasa em ícone e
  link, monograma).
- Espaço: múltiplos de 8 (8, 16, 24, 32, 48).

**Composição**
- Lista com divisória no lugar de cartão. Cartão só onde agrupa uma ação (ex.: primeiros passos) e em cada
  publicação do feed.
- O rótulo fica dentro do campo e sobe ao digitar. Código de verificação em casas.
- Barra de ação fixa no rodapé do celular, sempre no mesmo lugar.
- O computador tem duas colunas com contexto (fases e ilustração), nunca a coluna do celular solta.
- Nenhum ícone decorativo que pareça ação. Item feito fica marcado, sem riscado.

## Prova antes de mostrar ao dono

1. Percorrer a jornada por robô em 375, 768 e 1440, claro e escuro, conferindo erro de console e transbordo.
2. Montar a folha de capturas e olhar tela por tela contra as regras acima.
3. Avaliar pela régua do HANDOFF (funcionalidade, praticidade, interface, clareza).
