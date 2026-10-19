# Bivaque — Rodada 42: teclado certo e vibração leve

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-042.task.yml` (R1). Base: `9b35a312`.
Lote mobile 2.

**Veredito: PASS.**

## O que mudou

- **Teclado numérico em todo campo de número:**
  - a regra fica no `field()`, para nenhum campo novo esquecer;
  - corrige seis campos que abriam o teclado de letras: quartos, área, vagas, valor da oferta,
    valor e prazo da proposta, e vagas do encontro;
  - preço e condomínio continuam com o teclado decimal.
- **Tecla "Buscar"** no teclado da busca do topo e da busca de grupos.
- **Autopreenchimento:**
  - o próprio nome (entrada, configurações e reivindicar negócio) e o WhatsApp do negócio;
  - o nome fictício do familiar convidado fica sem, para o celular não sugerir o seu.
- **Vibração leve,** só no Android (o iPhone ignora), nunca duas seguidas em menos de 80 ms:
  - ao salvar anúncio ou negócio;
  - ao indicar;
  - ao passar do ponto no deslizar de uma conversa;
  - ao passar do ponto de fechar arrastando a foto;
  - ao trocar a altura da folha do bairro.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 42 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Gate completo | PASS |

O teclado é conferido no campo interno do Material, onde o `inputmode` chega. A vibração é
conferida por um substituto de `navigator.vibrate`. Não há captura: teclado e vibração não
aparecem em imagem.
