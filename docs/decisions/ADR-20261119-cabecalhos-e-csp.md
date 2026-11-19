# ADR-20261119 — cabeçalhos de segurança, CSP e limpeza ao sair

- Status: Aceito por delegação — aguarda ratificação do dono (19/11/2026, lote ENDURECE-002)
- Decisor: agente coordenador (mandato de 02/11), a pedido do coordenador do projeto (endurecimento parte B, antes do LAN-PROVA)
- Lotes afetados: web (Next, todas as respostas), app em `/app`, F10 (sair da conta)

## Contexto

O Next responde hoje só com `Content-Security-Policy: frame-ancestors 'none'` e
`X-Frame-Options: DENY` (SEC-007). Sem `script-src`, um XSS que escape do React executa sem
barreira. Sem `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS e COOP, o navegador fica
nos padrões dele, que variam. Ao sair pelo app, a rota `POST /api/app/voce/sair` apaga os cookies
da sessão. Rascunhos, preferências e o cache HTTP continuam no aparelho, e isso pesa num aparelho
compartilhado (público de famílias e de quartel).

## Decisão

1. **Cabeçalhos em toda resposta do Next** (páginas, `/api` e `/app`):
   - `X-Content-Type-Options: nosniff`;
   - `Referrer-Policy: strict-origin-when-cross-origin`;
   - `Permissions-Policy` negando câmera, microfone, geolocalização, pagamento e USB, salvo o
     recurso que o produto usa de fato (a localização é por CEP no servidor, então a geolocalização
     fica negada, a menos que o lote prove uso real);
   - `Cross-Origin-Opener-Policy: same-origin`;
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains` (sem `preload`; entrar na
     lista de preload é decisão do dono, porque prende o domínio ao HTTPS para sempre);
   - os dois cabeçalhos de moldura do SEC-007, sem mudança.
2. **CSP aplicada, não só em report-only.**
   - **Páginas do Next:** nonce por requisição gerado no proxy, com
     `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`,
     `form-action 'self'` e `frame-ancestors 'none'`.
   - **App em `/app`:** o `index.html` é arquivo do build e não recebe nonce, então a política é
     estática, com `script-src 'self'` e nenhum script inline.
   - `style-src` aceita `'unsafe-inline'`, porque o React e as peças usam `style` inline; injetar
     estilo sem script não executa código, e o risco residual (vazamento por seletor CSS) é baixo
     para o lançamento.
   - `connect-src` e `img-src` listam só as origens usadas: a do Supabase do ambiente e a do storage de mídia. As origens vêm das variáveis públicas do ambiente,
     nunca escritas fixas.
3. **`Clear-Site-Data: "cache", "storage"`** na resposta de sucesso de `POST /api/app/voce/sair`.
   - Sem `"cookies"`: os cookies da sessão já saem pelo `signOut`, e limpar todos apagaria também o
     registro de consentimento.
   - Resposta de erro não leva o cabeçalho: se a saída falhou, a pessoa não perde o rascunho.
4. **Prova:**
   - nenhuma violação de CSP no console nos fluxos e2e do app e da web;
   - cabeçalhos conferidos com `curl -I` no build de produção local;
   - teste positivo e negativo do `Clear-Site-Data`;
   - sair pelo app leva à entrada sem quebrar a tela nova.

## Consequências

- As páginas Next são renderizadas por requisição e não podem ficar em cache de CDN.
- Ligar o Sentry no navegador exige adicionar sua origem à CSP.
- HSTS com `includeSubDomains` prende os subdomínios do host por dois anos.

- Um script de terceiro novo (analytics, mapa) precisa entrar na CSP de forma explícita; antes
  disso, o navegador bloqueia e a violação aparece no console e no e2e.
- O app de loja (Capacitor) carrega o mesmo build. A WebView ignora `Clear-Site-Data` em parte, e
  o empacotamento (LAN-LOJA) confere a limpeza nativa ao sair.
- HSTS sem `preload` é reversível baixando o `max-age`; com `preload` não seria.
- Fica para depois do lançamento (endurecimento parte C): `report-to` com coleta de violações,
  `require-trusted-types-for` e `style-src` sem `'unsafe-inline'`.
