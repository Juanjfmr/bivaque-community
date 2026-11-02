---
id: ADR-20261101-foto-e-resposta-nos-grupos
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan: docs/agents/regua-nextdoor/HANDOFF.md (seção 5, "Foto em publicação e resposta encadeada mudam o ADR da Comunidade")
critic_verdict: pending
critic_review:
---

# Foto na publicação e resposta a comentário nos grupos

## Problem

Pela régua Nextdoor (01/11/2026), três flows de grupo ficaram abaixo da régua:
- **Group detail** e **Post detail:** publicação só com texto e sem resposta a comentário;
- **Adding a comment:** a caixa de comentar fica no fim da página.

O ADR-20261024-redesenho-da-comunidade não prevê foto em publicação nem resposta encadeada. Os dois mudam o
domínio: armazenamento, tratamento de imagem e regras de leitura e escrita.

## Decision

Decisões do dono em 01/11/2026, nesta sessão.

1. **Foto na publicação de grupo: até 4 por publicação. Nenhuma no comentário, por enquanto.**
   - O envio passa pelo tratamento do servidor (`sanitize-image`: sem EXIF e sem localização), como manda o
     ADR-20261024-front-react-spa §5.4.
   - A foto tem a mesma visibilidade da publicação. Grupo Fechado: só membros, por URL assinada de vida curta.
   - Apagar a publicação apaga as fotos. A moderação remove a foto junto com a publicação e guarda a evidência para o
     operador.
   - Se o grupo tem regra sobre fotos (ex.: crianças), ela aparece no momento de anexar.
2. **Resposta a comentário: um nível.**
   - "Responder" cria uma resposta logo abaixo do comentário, com o nome de quem foi respondido.
   - Resposta de resposta fica no mesmo nível, sob o mesmo comentário, sem árvore.
   - A resposta segue as regras do comentário: quem pode ler, escrever, editar e apagar, o bloqueio e a moderação.
3. **Junto, sem mudar o domínio** (já previstos ou só de tela):
   - "Útil" também no comentário (a reação já existe; passa a valer para o comentário);
   - barra de comentar fixa no rodapé;
   - botão de escrever sempre visível no grupo;
   - boas-vindas a quem acabou de entrar ("Diga olá" e "Convidar").

### O que não muda

Continuam como estão:
- os estados do grupo (Aberto, Fechado, Encerrado);
- publicação só em grupo;
- o "Útil" como única reação;
- marcar o comentário que resolveu;
- ocultar publicação.

A matriz de permissão do ADR da Comunidade (§3.2) ganha as linhas de foto e de resposta antes de qualquer migration.

## Alternatives considered

1. **Foto também no comentário (1 por comentário).** Adiada pelo dono: dá mais para moderar e guardar.
2. **Árvore de respostas com vários níveis.** Rejeitada: fica estreita e difícil de ler no celular.
3. **Sem resposta, só citar o comentário.** Rejeitada: mantém o grupo abaixo da régua.
4. **Sem foto.** Rejeitada: é a maior lacuna de funcionalidade do grupo.

## Market or reference baseline

- Nextdoor:
  - [Post detail](https://mobbin.com/flows/f2e0310e-3db2-4ff5-94bf-c056533b7d79): foto, barra de comentar fixa,
    Curtir e Responder;
  - [Adding a comment](https://mobbin.com/flows/a0263dfd-ec72-4a91-b9b1-d9bce04e99ba);
  - [Joining a group](https://mobbin.com/flows/88ee2616-ba57-4ea9-a45f-5944cfeb116d): "Diga olá" e "Divulgue o grupo".
- Instagram e Facebook: resposta em um nível, com o nome de quem foi respondido.

## Proposed divergence from baseline

- Sem foto no comentário (o Nextdoor permite).
- Sem reações variadas, decisão anterior: o "Útil" fica como única reação.

## Evidence and sources

- `docs/agents/regua-nextdoor/HANDOFF.md` §5; `AVALIACAO-79-FLOWS.md` (Grupos; Publicar e interagir).
- ADR-20261024-redesenho-da-comunidade (§1, §3.2); ADR-20261024-front-react-spa §5.4.
- Prévia clicável: `apps/app/src/previa-grupos/`.

## Benefits

- O grupo fica no nível da régua em funcionalidade.
- A conversa fica legível no celular.
- A foto resolve publicações que hoje precisam de três parágrafos (desapego, festa, problema na casa).

## Risks

- **Foto com dado sensível (criança, farda, placa, documento).** Mitigações:
  - a regra do grupo aparece no momento de anexar;
  - denúncia com motivo;
  - remoção pela moderação com evidência guardada;
  - o servidor tira a localização.
- **Custo de armazenamento:** limite de 4 fotos, tamanho máximo no servidor e redução de resolução no envio.
- **Leitura indevida em grupo Fechado:** URL assinada de vida curta e teste negativo por papel na matriz.

## Reversal cost

Médio. É uma migration aditiva (tabela de mídia da publicação e coluna de resposta no comentário), com bucket e
policies. Para voltar, basta esconder na tela; os dados ficam.

## Success metric

- Publicações com foto entre as publicações de grupo.
- Taxa de perguntas com comentário "resolveu" em 7 dias.
- Tempo até o primeiro comentário.
- Provas: pgTAP positivo e negativo por papel para foto e resposta; e2e de publicar com foto e responder, em
  375/768/1440.

## Reopen condition

Volume de denúncias por foto acima do de texto. Pedido recorrente de foto no comentário.
