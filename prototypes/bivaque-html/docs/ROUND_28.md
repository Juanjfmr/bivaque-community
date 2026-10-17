# Bivaque — Rodada 28: o que o selo "verificado" significa

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-028.task.yml` (R1). Base: `2e602fc8`.
Último item do lote B. Referência do Mobbin: folha "Freshness guaranteed" da Glovo.

**Veredito: PASS.**

## O que mudou

O selo "Perfil verificado" do anúncio e a linha de verificação da página do negócio agora
abrem uma explicação, tanto pelo toque quanto pelo teclado. O texto segue o
ADR-20260816-forma-da-admissao:

- **Vínculo com as Forças conferido:** o Bivaque confere em fonte pública oficial (Portal da
  Transparência) que a pessoa é militar, veterana ou pensionista. Os dados consultados não
  ficam guardados; fica só o resultado.
- **O resto é declarado pela pessoa:** nome, cidade e bairro. O selo não confirma endereço.
- **O anúncio é de quem anuncia:** preço, estado do item e condições do imóvel são
  responsabilidade de quem publica. O selo não é garantia de negócio.
- **Combine com cuidado:** ver pessoalmente, em lugar movimentado, sem pagar adiantado, e usar
  "Denunciar".

A folha também avisa que, neste protótipo, a verificação é simulada. Ao fechar, o foco volta ao
selo.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 28 (2 verificações; 375 e 1440, claro) | PASS, 4/4 |
| Gate completo | PASS |

Fecha o lote B. A revisão única, a bateria completa, a aprovação visual e o deploy vêm em
seguida.

## Revisão independente do lote B (Rodadas 25 a 28)

Sem CRITICAL nem HIGH. Os 6 MEDIUM foram corrigidos:

1. **Fundo da tela:** pausar, excluir ou desfazer um alerta não atualizava a faixa do catálogo
   nem a contagem em Você. Agora atualiza.
2. **Alertas duplicados:** a mesma busca escolhida em outra ordem (pets e mobiliado ×
   mobiliado e pets) virava um segundo alerta. Agora a comparação ignora a ordem.
3. **Mensagens escondidas:** "alerta de outra cidade" e "alerta não existe mais" apareciam no
   aviso de rodapé, por baixo do diálogo. Agora aparecem dentro da lista.
4. **"Continuar" sem etapa à vista:** com 3 ou mais etapas feitas, o botão apontava para uma
   etapa que o cartão não mostrava. Agora o cartão mostra a etapa atual e as vizinhas.
5. **Texto do selo:**
   - "Nome e cidade" (sem bairro), como diz o ADR;
   - a família entra por convite de quem já foi verificado;
   - "O anúncio é de quem anuncia" e "Combine com cuidado" ficam identificados no código como
     orientação de produto, não decisão de ADR.
6. **Validação do assistente:** vagas, condomínio e data não eram validados. Agora são;
   condomínio negativo não deixa seguir.

LOW corrigidos:

- plural de quarto e vaga na revisão;
- contagem da etapa sem anúncio duplo ao leitor de tela;
- `aria-haspopup` no ícone do negócio;
- alvo de toque do selo com 32 px;
- exemplo do simulador sem preço zero.

| Prova (375 e 1440, claro) | Resultado |
| --- | --- |
| Rodada 25, com ordem dos filtros e fundo atualizado | PASS, 16/16 |
| Rodada 26, com a etapa atual à vista | PASS, 10/10 |
| Rodada 27, com condomínio inválido | PASS, 16/16 |
| Rodadas 28 e 15 | PASS: 4/4, 10/10 |
| Gate completo | PASS |
