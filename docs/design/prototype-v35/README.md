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

No celular (ou janela de 390 px):

8. Barra inferior com cinco abas; **+** no topo; a lupa abre a busca em folha; **arraste a alça** da folha.
9. **Toque longo** num cartão abre o menu em folha e não abre o cartão; toque curto abre o cartão.
10. Ative "reduzir movimento" no sistema: nada anima e tudo continua funcionando.

## Como verificar

```sh
node docs/design/prototype-v35/verify.mjs   # 47 sondas, 91 verificações; a maioria roda em 1440 e 390 px
node docs/design/prototype-v35/mutate.mjs   # quebra 15 invariantes; termina em 0 só se todas forem detectadas
```

As 69 verificações do v34 continuam (três mudaram de texto ou seletor; cada mudança está no PR) e há 22 novas.
A verificação é do próprio implementador, **não** é revisão independente.

## O que mudou em relação ao v34

- **Visual:** tokens de cor, tipografia, espaço, raio, sombra e movimento; ícones SVG num sprite único (nenhum
  glifo Unicode como ícone); estados de foco, hover, erro e vazio; mídia com esqueleto e reserva.
- **Navegação:** paleta de comandos, atalhos, trilha nas telas de segundo nível, folha inferior com alça no
  celular, título e anúncio por página, transição de tela.
- **Menus de contexto:** botão ⋯ sempre visível; clique direito, tecla de menu e toque longo abrem o mesmo menu.
  Anúncio nunca oferece "por que apareceu".
- **Feedback:** "Desfazer" em salvar, ocultar, arquivar, silenciar, encerrar, dispensar e presença; validação inline.
- **Copy:** 41 trocas em commit isolado (`git log` mostra qual), para poder ser revertido sozinho.

## O que continua simulado ou sem prova

- Relógio da demonstração e respostas simuladas de terceiros (proposta, aceite, aprovação de comunidade).
- Sem latência de rede simulada de propósito: atraso falso esconderia o comportamento real.
- Só tema claro. Sem modo escuro.
- Chromium apenas. Nada foi testado em Safari, Firefox, aparelhos reais, VoiceOver ou NVDA; a acessibilidade
  provada é de semântica ARIA, teclado, alvo de 44 px e contraste medidos.
- **Polimento não é validação.** Um protótipo mais bonito não prova escala, recorrência nem diferenciação, e não
  substitui teste de usabilidade com pessoas. As fronteiras R3 (publicação, ingresso, consentimento, ordenação
  paga) continuam pedindo ADR antes de virarem produto.
