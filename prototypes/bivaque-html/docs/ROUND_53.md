# Bivaque — Rodada 53: landing com amostra grátis

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-053.task.yml` (R1). Base: `00e6dbac`.
Lote Entrada. Maquete v2 aprovada ("Sim, como na v2"), feita com a crítica própria e a do GPT.
Referências: DoorDash, Public, Vipps e Starling, no Mobbin.

**Veredito: PASS.**

## O que mudou

- **Landing pública** (`#entrar`), fora da navegação do app:
  - "Muda a cidade. Fica a sua rede.", para quem é e "Só entra quem tem o vínculo confirmado";
  - "Quero fazer parte", "Recebi um convite de familiar" e "Entrar";
  - no computador, duas colunas.
- **Amostra grátis na própria página** (decisão do dono: a degustação fica aqui; quem está em análise
  não lê o Bivaque):
  - por cidade, com exemplos do arquivo da comunidade, sem identificar membros;
  - o resto travado: "+ N indicações resolvidas em Manaus · Entre para ver tudo e perguntar";
  - cidade sem exemplos: "Ainda reunindo exemplos" e quantas famílias já estão lá.
- **Sair** (Você → Sair): pede confirmação, mantém os dados de teste e leva à landing. Sem conta,
  qualquer rota interna volta para a landing; com conta, a landing não aparece.
- **Entrar** volta ao mesmo perfil (até a Rodada 55, sem formulário).

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 53 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Rodada 02 (cadastro e controles do protótipo) | PASS, 24/24 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round53/telas/`. Maquetes: `.visual/bivaque-html-entrada/`.
