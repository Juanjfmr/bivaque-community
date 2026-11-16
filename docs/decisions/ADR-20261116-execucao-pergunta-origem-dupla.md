# ADR-20261116 — execução da pergunta de origem dupla (Também perguntar à cidade)

- Status: Aceito por delegação — aguarda ratificação do dono (16/11/2026, lote RUN-178/F04)
- Decide sobre: ADR-20261024-redesenho-da-comunidade §1 (regra já aceita pelo dono, R3, critic PASS) — este ADR não reabre a regra; registra as duas escolhas de execução que ele deixou em aberto e o knock-on de privacidade que o §1 chamou de "leituras que dependem da origem"
- Lotes afetados: F04 (TAMBEM-PERGUNTAR), contagens de perguntas, composer de grupo

## Contexto

A regra aceita: pergunta feita em grupo Aberto aparece também nas Indicações da cidade, com o nome do grupo, mudando numa migration só (CHECK de origem + policy de INSERT + leituras). Restaram duas ambiguidades que o card registrou como escolhas: a FORMA (linha única recomendada pelo ADR vs vínculo post↔request que um mapa anterior aventou) e o que acontece com as leituras/escritas adjacentes que hoje tratam "origem de grupo" como caso proibido (policy de saves com 403 literal "Perguntas de grupo ainda não podem ser seguidas", atalho de contagem que ignora linhas de grupo, e o feed do grupo que só lê posts).

## Decisão

1. **Forma: linha única.** A pergunta publicada no grupo com "também perguntar à cidade" CRIA UMA linha em `recommendation_requests` com origem dupla (locality_id + group_id) — não um post espelhado. Motivos: foi a forma aceita pelo dono no ADR-20261024 (CHECK único, INSERT único); evita divergência e propagação de edição/exclusão entre duas cópias; uma linha = autor único, respostas únicas, cascade já existente. O post não é criado.
2. **Onde a linha aparece:** nas Indicações da cidade (o `list_indications` vigente já junta e já devolve group_name) e NO FEED DO GRUPO, por leitura nova que intercala as perguntas abertas do grupo entre os posts usando o cartao existente (já desenhado para o tipo Pergunta e a linha 'Também perguntada à cidade'; a galeria DEV exercitava o visual sem dados). Pergunta de origem dupla abre na ficha normal de pergunta (Pergunta.tsx) com a origem nomeada e link do grupo.
3. **Avisos:** o composer de grupo Aberto mostra a copy prometida desde o protótipo ('sua pergunta aparecerá na cidade com o nome do grupo') antes de publicar; grupos Fechados/Encerrados não veem a opção (a policy também veta).
4. **Saves e contagens revisadas na MESMA migration:** a policy de seguir pergunta passa a aceitar linha de origem dupla para quem pode vê-la (a cidade vê; a frase 403 'perguntas de grupo não podem ser seguidas' sai de circulação) e o atalho de contagem que ignorava linhas de grupo é removido — a origem dupla é pergunta para todos os efeitos de leitura. pgTAP cobre seguir-pergunta-de-grupo (positivo: membro; negativo: não membro de grupo fechado via INSERT vetado) e a contagem nova.

## Consequências

- R3 real continua sendo o do ADR-20261024 (CHECK+policy na mesma migration, 4 negativos por escrita direta: não membro, grupo Fechado, grupo Encerrado, cidade diferente) — nada aqui relaxa os vetos; a migration nova é única e executada via `supabase migration new` (as faixas antigas nunca usadas ficam intocadas).
- Knock-on declarado: números de "resolvidas"/contagem mudam quando linhas de grupo entram no bolo (precedente registrado do 6→7 no RUN-159); testes de contagem acompanham na mesma revisão, não depois.
- A pergunta publicada no grupo deixa de ser um post e portanto não tem foto no corpo — o tipo Pergunta da ficha aceita corpo textual; se o dono quiser pergunta com foto na cidade, é produto novo, não este card.
