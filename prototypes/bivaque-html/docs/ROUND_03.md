# Bivaque — Rodada 03: Desapegos, Imóveis e Negócios

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-003.task.yml` (R2). Base: `840c805f`.

**Veredito: PASS.** Publicar, rascunho, editar, encerrar, excluir, salvar, interesse,
oferta, visita, contatos, galeria, indicação, assumir e editar página de negócio estão
comprovados em execução. Foram corrigidos 2 defeitos reais e o gate completo está verde.

## Defeitos encontrados pela prova e corrigidos

Cada um tem checkpoint que falhou antes da correção e passa depois.

1. **Formulário inválido não levava ao erro** (`features/listings/editor.js`,
   `validFields`). Isso vale para todos os formulários. O foco ia para o último campo
   inválido, ou para nenhum: no celular, quem tocava em Publicar com erro no topo não
   via o problema. Agora o foco e a rolagem vão para o **primeiro** campo inválido.
2. **Indicar de novo o mesmo negócio duplicava o seu depoimento**
   (`features/businesses/indication.js`). Agora abre o negócio e avisa "Você já indicou
   este negócio", como já fazia o botão "Indicar este negócio".

## Comprovado em execução

Prova: `scripts/bivaque-html/round03-proof.mjs`. São 18 checkpoints por contexto, em
375/768/1440 × claro/escuro:

- publicar desapego e imóvel, com persistência após reload e presença em Meus anúncios;
- validação de título, preço, quartos e área, com foco no primeiro campo inválido;
- rascunho: salvar, reabrir após reload, publicar e remover o rascunho;
- editor com alterações pede confirmação ao fechar, e "continuar" preserva o texto;
- editar sem duplicar;
- encerrar e reativar com desfazer;
- excluir com confirmação e desfazer;
- contatos recebidos;
- comprador: salvar (persistente), "Tenho interesse" abre a conversa ligada ao anúncio
  e "voltar" retorna ao anúncio;
- oferta: vazia é recusada; válida fica como rascunho na conversa para revisão;
- combinar visita;
- negócio: criar com validação de WhatsApp e site, orçamento abre conversa ligada,
  indicação mínima de 12 caracteres e única, link do WhatsApp com DDI (registrado,
  não aberto), salvar;
- indicar negócio novo, assumir com nome obrigatório, publicar a página, ver pedidos
  recebidos e editar;
- galeria com duas fotos enviadas pelo editor;
- falha de gravação ao publicar mantém editor e texto, com aviso.

| Prova | Resultado |
| --- | --- |
| Referência, build determinístico, testes do builder | PASS |
| Rodada 03, matriz completa | PASS, 108/108, 0 erros JS, 0 requisições externas |
| Regressão Rodada 02 | PASS, 72/72 |
| Regressão Rodada 01 | PASS |
| Visual | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |
| Revisão independente | Sem achados CRITICAL/HIGH/MEDIUM |

Candidato: `4834e15aa6a52da85e3763edbe43a8286e73273b64e34c51b8e3bddae606cef8`.

## Infraestrutura

`scripts/bivaque-html/proof-harness.mjs` concentra servidor, contextos, cliques no
Material Web, links externos registrados e relatório. Uma rodada nova escreve só os
checkpoints e chama `runProof(checkpoints, "roundNN")`. A Rodada 02 foi mantida
como estava.

## Pendências registradas

- Revisão LOW: `if(!duplicate.myInd)` em `submitIndicate` ficou redundante após a
  correção (simplificação opcional). Ao focar o primeiro campo, o balão nativo de
  validade do último pode sumir; o erro do Material continua visível.
- Fotos: o teste usa PNG gerado; compressão e limites de tamanho de foto real não
  foram medidos.
- Pagamento, destaque e benefícios pagos ficam na Rodada 06 (Monetização).
- Próxima pelo roadmap: **04 Comunidades/Grupos e Memória/Indicações**, que inclui o
  defeito conhecido `join-group`: grupo fechado anuncia avaliação, mas aprova por timer.
