# Arquitetura do protótipo HTML (intenção, não código pronto)

## Fonte congelada
- `prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html` é imutável.
- `prototypes/bivaque-html/src/` contém as fontes extraídas do HTML por rodada.
- `prototypes/bivaque-html/dist/Bivaque_Material_Web.html` é o artefato gerado por build determinístico.
- `prototypes/bivaque-html/docs/` recebe inventário e evidências de captura/QA.

## Partição sugerida (ajustar após medir importâncias e dependências)
```
src/
  shell/           # topbar, nav desktop/mobile, criar, dialogs, router, themes
  tokens/          # Material Web tokens e componentes compartilhados
  data/demo/       # dados sintéticos, fixtures e cenários
  features/
    auth/  home/  search/  community/  groups/  memory/
    listings/  properties/  businesses/  services/
    events/  messaging/  profile/  family/  transfers/
  utilities/       # helpers puros, storage demo, form, sanitização
  motion/          # transições e microfeedback respeitando reduced-motion
```

## Construção portável
- A saída continua sendo um HTML único que funciona abrindo pelo navegador via servidor estático. Antes de prometer suporte `file://`, **testar** as restrições reais de ES modules/CORS/CDN.
- Extrair sem alterar DOM/classe, ids, Material Web, CSS tokens ou resultado visual na primeira rodada.
- Elementos importados e imagens inline/data-URL são parte da baseline. Não substituir automaticamente por SVG genérico, ícone errado ou placeholder.
- Build deve ser reproduzível com instruções locais e não exigir token de produção.

## Ownership
O coordenador atribui diretórios concretos. Shell/tokens -> Frontend; animation -> Motion; contracts/views de domínio -> especialistas; tools/build -> Arquitetura; QA -> não escreve produção durante revisão.

## Integração depois do protótipo
Não portar o HTML pronto como um segundo app paralelo. Planejar um adaptador gradual para interfaces do `bivaque-community` (auth, profiles, listings, provider_profiles, events, groups, reports, notifications, messages) preservando estrutura visual aprovada.
