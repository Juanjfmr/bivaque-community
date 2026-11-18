# ADR-20261112-cep-sem-coordenada

Status: Aceito por delegação — aguarda ratificação

Data: 12/11/2026

## Contexto

A localização do perfil segue o [ADR de localização](ADR-20261022-localizacao-padrao-de-mercado.md):
o CEP e a coordenada são dado de cálculo, privados, gravados só por `public.set_member_location`
(migração `20261110211702_profile_location.sql`). Hoje o banco exige tudo ou nada: a restrição
`profiles_location_all_or_nothing` e a função recusam CEP sem latitude e longitude.

A rota `PUT /api/app/voce/localizacao` geocodifica pelo servidor (BrasilAPI v2, com o Google como
reserva). Quando a BrasilAPI conhece o CEP mas não devolve coordenada — comum fora das capitais — o
geocodificador trata como `nao-encontrado` e a rota responde 422 «CEP não encontrado». A pessoa que
digitou um CEP verdadeiro fica travada com uma mensagem falsa (achado MÉDIO do revisor ed9d03ac no
PR #183; cartão `LOC-CEP-SEM-COORDENADA`).

## Decisão

1. **O CEP conhecido sem coordenada é guardado sem posição.** Nenhuma coordenada é inventada (nem
   centro da cidade, nem do bairro): o ADR de localização proíbe inventar coordenada.
2. O geocodificador passa a distinguir três respostas: `encontrado` (com coordenada), `sem-coordenada`
   (alguma fonte conhece o CEP, nenhuma devolve posição) e `nao-encontrado` (nenhuma fonte conhece).
   `indisponivel` continua igual. O Google continua sendo tentado antes de concluir `sem-coordenada`.
3. O banco aceita CEP com latitude e longitude nulas, e só assim: coordenada sem CEP continua
   proibida, e latitude e longitude andam juntas. A mudança é uma migração nova que troca a
   restrição e a função `set_member_location`; nenhuma migração aplicada é editada.
4. A rota responde 200 com a localização marcada como sem coordenada; o CEP que nenhuma fonte
   conhece continua 422 e a falha das fontes continua 503.
5. A tela de localização mostra o CEP guardado e avisa, em linguagem da pessoa, que a distância
   ainda não pode ser calculada para esse CEP. Todo cálculo de distância trata a origem sem
   coordenada como ausente, nunca como zero.

## Consequências

- Privacidade inalterada: CEP e coordenada continuam legíveis só pelo dono, gravados só pela função,
  e a resposta da rota segue sem latitude e longitude.
- O cache `public.cep_geocodes` não guarda CEP sem coordenada como se tivesse posição; uma nova
  tentativa de geocodificação pode trazer a coordenada depois.
- pgTAP cobre: CEP com coordenada, CEP sem coordenada aceito, coordenada sem CEP recusada,
  latitude sem longitude recusada, e a leitura negada a outro membro.

## Revisão e auditoria

Implementação delegada pelo contrato `RUN-138`. Antes do merge: revisão independente por outro
modelo e auditoria do `security-auditor` sobre a revisão entregue, registradas em
[RATIFICACAO.md](RATIFICACAO.md).
