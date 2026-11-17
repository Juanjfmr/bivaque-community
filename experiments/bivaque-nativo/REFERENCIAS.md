# Bivaque nativo (versão de teste) — referências

Experimento pedido pelo dono em 17/11/2026: o app em React Native com componentes nativos
(React Native Reusables, Moti, Reanimated, Skia), set próprio de ícones e ilustrações em SVG gerado
por IA, e animações de assinatura (Rive para estados interativos, Lottie para carregamento,
sucesso e vazios). Não substitui o `apps/app` nem a decisão do Capacitor; é para testar no aparelho.

## Régua (Nextdoor no Mobbin)

| Tela | Referência | O que levar |
|---|---|---|
| Início (feed) | [Nextdoor feed](https://mobbin.com/screens/ed9fc5ab-889d-45e3-81bf-015ad6b46c69) | cartão por post sobre fundo cinza; autor + bairro + tempo; ações em pílulas (útil, comentar) à esquerda e compartilhar/⋯ à direita |
| Criar | [Composer](https://mobbin.com/screens/f73c204e-80a9-4f18-98d5-23b25f500455), [Composer com tipos](https://mobbin.com/screens/f67a2fcd-638d-4823-a6d9-151a75552037) | X à esquerda, público + Publicar no topo; autor; texto livre; atalhos em blocos largos (anunciar, evento) |
| Mercado | [For Sale & Free](https://mobbin.com/screens/e20e764b-bd26-4adb-b8d9-e7ecb2ecb0ed) | busca no topo; grade 2 colunas com foto quadrada, título, preço · distância |
| Boas-vindas da cidade | [Bairro](https://mobbin.com/screens/f0b2ac3d-75b2-4f56-af18-24f4417377c9) | blocos com ícone grande e números da cidade |
| Você | [Perfil](https://mobbin.com/screens/65872c7c-a677-4f58-94da-297d99f77a0b) | capa, avatar grande, nome, local; "só você vê" com Salvos e Eventos; listas de grupos |

## Regras de produto que valem aqui

- Navegação: Início · Comunidade · [Criar] · Mercado · Você, com Conversas no topo.
- Brasa só no ato de criar; Ardósia conclui (Publicar, Continuar). ADR-20261102-paleta-fria.
- Nada de Força, OM, posto ou selo de verificação visível para outros membros.
- Dados de demonstração sintéticos; nenhum dado real.
- Movimento respeita "reduzir movimento" do sistema.
