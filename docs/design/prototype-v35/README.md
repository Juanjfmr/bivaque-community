# Protótipo v35 — acabamento de produto

**Status: candidato de referência visual. Não é a autoridade do produto nem runtime.** Empilhado sobre o v34
(PR #87). A autoridade visual segue sendo `docs/design/visual-guide-2026-09-06/`; o dono autorizou, só para este
protótipo, liberdade para evoluir visual e navegação. Quem travar o v35 como referência precisa registrar que isso
troca a navegação de 06/09 (Início / Explorar / Comunidades / Perfil) por Início / Resolver / Comunidade /
Conversas / Você, com **Contribuir** na barra superior no celular.

## Como abrir

Abra `Bivaque_v35.html` no navegador. Dados 100% fictícios; o estado fica no `localStorage`
(`bivaque-v35`). A tipografia (Public Sans) vem de `apps/web/app/fonts` por caminho relativo: copiado sozinho, o
arquivo cai na fonte do sistema e o layout muda um pouco. As fotos vêm do Unsplash (terceiro, só imagem) e
precisam de internet; quando falham, o cartão mostra uma reserva de imagem.

## Roteiro de teste (10 minutos)

No computador:

1. **Ctrl+K** (⌘K no Mac), digite `moradia`, use as setas e Enter. Depois `/` e `?`.
2. **g** e uma letra: `g r` Resolver, `g c` Comunidade, `g m` Conversas, `g v` Você, `g n` Notificações, `g h` Início.
3. Serviços → botão **⋯** de um cartão. Depois **clique direito** no cartão e **Shift+F10** com o foco no título.
4. Ocultar um prestador → **Desfazer** → ocultar de novo → Você → **Itens ocultos** → Mostrar de novo.
5. Conversas → **⋯** → Silenciar ou Arquivar → "Ver arquivadas".
6. Contribuir → Desapego → **Ver prévia** com tudo vazio, depois com preço `abc`.
7. Notificações → **⋯** → Dispensar. Você → Meu negócio → enviar proposta vazia.
8. **Filtros:** Imóveis (chegada) → 3+ quartos, 1+ vaga, aluguel de 3000 a 4200, comodidade "Piscina". Repare que
   cada opção mostra quantos resultados dá e que a que daria zero fica desabilitada. Serviços → tipo "Elétrica,
   hidráulica e reparos" → especialidade "Elétrica" → troque o tipo e veja a especialidade sair. Ordene por preço
   e confira que o anúncio continua na faixa própria. Deixe tudo sem resultado e use a sugestão "Tirar…".
9. Contribuir → Imóvel: preencha os campos novos (banheiros, vagas, área, condomínio, comodidades, garantia),
   publique e ache o imóvel pelos filtros.

No celular (ou janela de 390 px):

10. Barra inferior com cinco abas; **+** no topo; a lupa abre a busca em folha; **arraste a alça** da folha.
11. **Toque longo** num cartão abre o menu em folha e não abre o cartão; toque curto abre o cartão.
12. Em qualquer catálogo, **Filtros (n)** abre a folha; o botão "Ver N imóveis" acompanha as escolhas.
13. Ative "reduzir movimento" no sistema: nada anima e tudo continua funcionando.

## Como verificar

```sh
node docs/design/prototype-v35/verify.mjs                 # 55 sondas, 107 verificações; a maioria roda em 1440 e 390 px
MOTION=normal node docs/design/prototype-v35/verify.mjs   # a mesma suíte com animação e transição ligadas
node docs/design/prototype-v35/mutate.mjs                 # quebra 37 invariantes; termina em 0 só se todas forem detectadas por asserção
```

Por padrão as sondas rodam com **movimento reduzido**, que dá medidas estáveis de posição e tamanho. Isso pode esconder
defeitos que só existem com movimento ligado, por isso a mesma suíte também roda com `MOTION=normal`, e as duas passam na versão registrada no plano. A P41 confere, nos dois
modos, que anima quando pode e não anima quando o sistema pede.

As 69 verificações do v34 continuam. Dez sondas herdadas mudaram: P03, P03b, P07 e P13 (texto novo da copy);
P27, P29 e P31 (seletor ou fluxo novo: o botão flutuante saiu, o menu conta como efeito, linhas de pergunta e de
conversa entram na medida de alvo); P32 (mais frases proibidas); P05 (o cartão do prestador passa a ser achado
pelo título, e não por um trecho de texto que agora também aparece nas especialidades); P35 (confere também os
campos novos dos formulários). O harness também mudou: cada contexto nasce com movimento reduzido (veja acima) e
com limite de 8 s por ação. Nenhuma sonda foi enfraquecida; P05, P27, P29, P32 e P35 foram ampliadas. Há 24
verificações novas do polimento e 14 dos filtros. A verificação é do próprio implementador, **não** é revisão
independente.

O v34 tinha 9 mutantes (M1 a M9) e o v35 tem 37: os 9 herdados e 28 novos, e as 19 sondas novas (P36 a P54) têm ao
menos um. Uma quebra só conta como detectada quando a sonda **falha por asserção**: falha por exceção da sonda ou
por erro de JavaScript da página (a página só quebrou) não conta. `MUT=M9,M15` roda só alguns.

## O que mudou em relação ao v34

- **Visual:** tokens de cor, tipografia, espaço, raio, sombra e movimento; ícones SVG num sprite único (nenhum
  glifo Unicode como ícone); estados de foco, hover, erro e vazio; mídia com esqueleto e reserva.
- **Navegação:** paleta de comandos, atalhos, trilha nas telas de segundo nível, folha inferior com alça no
  celular, título e anúncio por página, transição de tela.
- **Menus de contexto:** botão ⋯ sempre visível; clique direito, tecla de menu e toque longo abrem o mesmo menu.
  Anúncio nunca oferece "por que apareceu".
- **Feedback:** "Desfazer" em salvar, ocultar, arquivar, silenciar, encerrar, dispensar e presença; validação inline.
- **Copy:** 41 trocas em commit isolado (`git log` mostra qual), para poder ser revertido sozinho.
- **Filtros de verdade nos seis catálogos** (Imóveis, Serviços, Desapegos, Eventos, Benefícios, Referências): painel
  fixo à esquerda no computador e folha "Filtros (n)" no celular; cada opção mostra quantos resultados dá e fica
  desabilitada quando daria zero; filtros ativos viram etiquetas com ✕; "Limpar tudo"; ordenar; "N imóveis" anunciado
  para leitor de tela; sem resultado, a tela diz qual filtro tirar e quantos voltam. O anúncio obedece ao filtro e
  continua na faixa própria; ordenar nunca o move.
  - **Imóveis:** tipo, quartos, banheiros, vagas, área, aluguel, condomínio (teto e incluso), bairro, comodidades
    (todas as marcadas), garantia aceita (qualquer uma), mobiliado, aceita animais e disponível quando eu chegar.
  - **Serviços:** tipo em dois níveis (categoria e especialidade), região atendida, recomendado pela comunidade,
    contratações, "a partir de" e atende aos sábados.
  - **Desapegos:** categoria e tipo de item, preço, condição, retirada e bairro.
  - Os formulários de anunciar pedem os campos novos e o que a pessoa publica aparece nos filtros.

## O que continua simulado ou sem prova

- Relógio da demonstração e respostas simuladas de terceiros (proposta, aceite, aprovação de comunidade).
- Sem latência de rede simulada de propósito: atraso falso esconderia o comportamento real.
- **Dados dos filtros:** 21 prestadores, 14 imóveis, 20 desapegos, 20 eventos e 14 benefícios, o bastante para as
  combinações darem resultado. Isso não prova que os campos servem a quem aluga ou contrata de verdade: a lista de
  campos de imóvel segue o padrão dos portais e é decisão do dono.
- Os filtros ficam só na memória da sessão: recarregar a página os zera. Um serviço publicado fica em verificação e
  não aparece nos filtros até ser aprovado (não há aprovação simulada).
- Só tema claro. Sem modo escuro.
- Chromium apenas. Nada foi testado em Safari, Firefox, aparelhos reais, VoiceOver ou NVDA; a acessibilidade
  provada é de semântica ARIA, teclado, alvo de 44 px e contraste medidos.
- **Polimento não é validação.** Um protótipo mais bonito não prova escala, recorrência nem diferenciação, e não
  substitui teste de usabilidade com pessoas. As fronteiras R3 (publicação, ingresso, consentimento, ordenação
  paga) continuam pedindo ADR antes de virarem produto.
