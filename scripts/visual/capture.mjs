// Visual capture + deterministic UI audit for the Bivaque build loop.
//
// Produces, per run:
//   .visual/<run>/shots/<route>--<viewport>.png   screenshots for visual review
//   .visual/<run>/report.json                     machine-readable findings
//   .visual/<run>/report.md                       findings a text-only model can act on
//
// The JSON/markdown audit exists so the loop still self-corrects when the driving
// model cannot read images. Screenshots stay authoritative for taste; the audit is
// authoritative for the mechanical rules (touch targets, overflow, contrast, motion).

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "@playwright/test"
import {
  assessCapture,
  DYNAMIC_HEADING,
  isCaptureReportPassing,
  summarizeCaptures,
} from "./capture-proof.mjs"

const BASE_URL = process.env["BIVAQUE_VISUAL_BASE_URL"] ?? "http://127.0.0.1:3000"
const OUT_ROOT = process.env["BIVAQUE_VISUAL_OUT"] ?? ".visual"
const RUN_ID = process.env["BIVAQUE_VISUAL_RUN"] ?? new Date().toISOString().replace(/[:.]/g, "-")
const ROUTE_PATH = process.env["BIVAQUE_VISUAL_ROUTE"]
const SCENARIO = process.env["BIVAQUE_VISUAL_SCENARIO"]

// Fixture de captura de Moradia: o anúncio REAL de `supabase/seed.sql`
// (`b2000000-…0001`, "Apartamento 2 quartos", ativo, com `property_details` e
// foto da fixture de mídia). O id anterior (`d0000000-…0001`) nunca existiu no
// seed — a ficha caía no não-encontrado e a captura declarava "sem h1".
const IMOVEIS_FIXTURE_ID = "b2000000-0000-4000-8000-000000000001"

// Conta do seed por trás de `account:` de uma rota. O e-mail é dado público do
// seed local (a senha vem de BIVAQUE_VISUAL_PASSWORD, como na conta global), e
// vive aqui — não no `.env.local` — para que a captura seja reproduzível por
// quem clonar o repositório. BIVAQUE_VISUAL_EMAIL__<CONTA> continua vencendo.
export const SEED_ACCOUNTS = {
  // operador@ é o único ator com linha em `operators`.
  operador: "operador@bivaque.example.invalid",
  // prestador-seed@ tem `provider_accounts` — as telas de vitrine exigem isso.
  prestador: "prestador-seed@bivaque.example.invalid",
  // verified-no-membership@ é verificado e não tem localidade: /onboarding o
  // manda para o passo de localidade, que é a tela real.
  novato: "verified-no-membership@bivaque.example.invalid",
  // rejected@ tem outcome "rejected": o funil NÃO redireciona e ele vê o passo
  // de verificação; /onboarding/documento mostra "Precisamos de outro arquivo".
  rejeitado: "rejected@bivaque.example.invalid",
  // admissao-1@ tem outcome "pending" — a tela "/onboarding/status".
  pendente: "admissao-1@bivaque.example.invalid",
  // membro-1@ é quem pediu o serviço 40000000-…0023 (o prestador é o outro
  // lado): o detalhe só existe para quem participa.
  membro1: "membro-1@bivaque.example.invalid",
  // visual@ é o ator com denúncias próprias e conversa DM semeadas (RECON-051).
  // Sem ele, `fixture: "own-report"` não tem o que resolver.
  visual: "visual@bivaque.example.invalid",
}

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
]

// Route identity is explicit, and EVERY route in ROUTES declares it. A route
// with no declaration stays invalid — that is the contract. But "no static
// title" is not the same as "no identity": a detail page, a profile or a city
// names itself from data. Those declare DYNAMIC_HEADING, which still requires a
// real, non-empty h1 and still refuses a login, a fallback or the wrong actor.
// Leaving them undeclared reddened the whole loop for reasons unrelated to any
// screen under work, which is how a fail-closed rule turns into a disabled tool.
// `tests/scope/visual-capture-proof.test.mjs` fails if the two lists drift.
export const HEADINGS = {
  "/": "Bivaque",
  "/login": "^Que bom ter você de volta\\.$",
  "/signup": "^Vamos começar\\.$",
  "/consent": "^Antes de entrar, conheça as regras\\.$",
  // Os títulos que o funil escreve de verdade (onboarding/page.tsx:258, 275): o
  // contrato anterior citava copy que não existe em nenhum arquivo do
  // repositório — foi escrita de memória, nunca medida, e a tela real não podia
  // passar. Com o ator certo (rejeitado@) o passo de verificação aparece.
  "/onboarding": "^(Verificar meu acesso|Aceite seu convite\\.|Preparando o próximo passo\\.)$",
  // status/page.tsx:90.
  "/onboarding/status?status=pending": "^Estamos analisando sua identidade$",
  "/onboarding/welcome": "^Você chegou ao Bivaque\\.$",
  // O h1 real do passo (locality/page.tsx:117) é a pergunta, não o rótulo do
  // passo no guia: o contrato antigo veio da prancha e nunca foi medido — com
  // o ator certo (verificado sem localidade) a tela aparece e o título é este.
  "/onboarding/locality": "^Qual cidade você quer explorar\\?$",
  "/admissions": "^Fila de admissões$",
  "/reports": "^Fila de denúncias$",
  "/arrivals": "^Chegadas declaradas$",
  "/guide-queue": "Guia|Referências",
  "/inicio": "Bom dia|Boa tarde|Boa noite|Olá",
  "/explorar": "Explorar",
  // h1 medido no arquivo que renderiza a rota (servicos/page.tsx:520): sem
  // termo a tela é "Prestadores de serviço"; com termo, "Resultados para …" —
  // e a variante com termo é chave própria logo abaixo.
  "/explorar/servicos": "^Prestadores de serviço$",
  // /configuracoes/page.tsx:6 redireciona para a subrota de notificações, e é
  // isso que a captura registra; a rota declara expectedPath para o destino.
  "/configuracoes": "^Configurações · Notificações$",
  "/groups": "Grupos",
  "/communities": "Comunidades",
  // O h1 desta rota é o NOME da comunidade principal de quem lê ("Vila
  // Ajuricaba" para a conta de captura), caindo para "Cidade, UF" só quando não
  // há vila — dado, não contrato. Com "Comunidade|Manaus" fixo a captura saía
  // INVALID em três viewports mesmo com a tela certa na frente.
  "/community": DYNAMIC_HEADING,
  "/guide": "Guia",
  "/events": "^Explorar eventos$",
  "/notifications": "^Notificações$",
  "/messages": "^Mensagens$",
  "/recommendations": "^Indicações$",
  "/prestador": "^Pedidos para você$",
  "/prestador/ficha": "^Minha ficha$",
  "/prestador/catalogo": "^Publicar item$",
  // RECON-024 trouxe estas duas ao entrar na integração, sem contrato — e o
  // guard-rail do RECON-040 cobrou na hora. Títulos lidos do h1 de cada página.
  "/prestador/atendimento": "^Área de atendimento$",
  "/prestador/conta": "^Conta$",
  // Named by their own data: the community, the guide entry, the group, the
  // event, the member and the city carry the title. The fixture id pins WHICH
  // record; the h1 text belongs to the seed, not to this file.
  "/communities/71000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  "/guide/a0000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  // Grupos vivem em 60000000-… no seed; 70000000-… é a faixa dos EVENTOS, então
  // o id antigo capturava o não-encontrado e a rota declarava "sem h1".
  "/groups/60000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  "/communities/71000000-0000-4000-8000-000000000001/indicar-prestador": DYNAMIC_HEADING,
  "/prestadores/30000000-0000-4000-8000-000000000010": DYNAMIC_HEADING,
  "/profile": DYNAMIC_HEADING,
  "/localidade": DYNAMIC_HEADING,
  // RECON-040 — as 37 rotas entregues depois que o guard-rail ficou parado na
  // branch lateral. Cada valor abaixo veio do h1 que o arquivo que renderiza a
  // rota realmente escreve; a rota cujo título é o próprio dado usa
  // DYNAMIC_HEADING. Query string é chave própria: /guide e /guide?q=escola são
  // duas entradas, como /explorar/servicos e a variante com termo.
  "/recuperar-senha": "^Esqueceu sua senha\\?$",
  "/nova-senha": "^Este link não vale mais$",
  // O mesmo caminho serve dois painéis legítimos: o pendente (sessionStorage)
  // e o "nada para confirmar". A variante ?estado=expirado é chave própria.
  "/auth/confirmar-email": "^(Confira seu e-mail|Nada para confirmar)$",
  "/auth/confirmar-email?estado=expirado": "^Confira seu e-mail$",
  "/onboarding/documento": "^(Enviar identidade|Precisamos de outro arquivo)$",
  "/onboarding/perfil": "^Deixe com a sua cara\\.$",
  "/mercado": "^O que você precisa pode estar por perto$",
  "/mercado/novo": "^Novo anúncio$",
  "/meus-anuncios": "^Meus anúncios$",
  "/mercado/a0000000-0000-4000-8000-000000000001/editar": "^Editar anúncio$",
  // O h1 do detalhe é o título do próprio evento.
  "/events/70000000-0000-4000-8000-000000000005": DYNAMIC_HEADING,
  // Evento da conta de captura (RECON-051): a única rota de EDIÇÃO de evento
  // que o ator pode abrir — editar exige ser o organizador.
  "/events/70000000-0000-4000-8000-0000000000a1/editar": "^Editar evento$",
  "/events/novo": "^Novo evento$",
  "/events/70000000-0000-4000-8000-000000000005/perguntas":
    "^(Sua pergunta|Perguntas sobre este evento)$",
  "/communities/71000000-0000-4000-8000-000000000001/admin/media": "^Imagens da comunidade$",
  "/communities/71000000-0000-4000-8000-000000000001/admin/pending": "^Pedidos de entrada$",
  "/auth/callback-error": "^Não foi possível entrar$",
  // O h1 é "Seu guia de {cidade}": prefixo fixo, a cidade é dado.
  "/guide?q=escola": "^Seu guia de ",
  "/guide/a0000000-0000-4000-8000-000000000001/correcao": "^Sugerir atualização$",
  "/explorar/servicos?q=climatiza": "^Resultados para “climatiza”$",
  "/explorar/busca?q=escola": "^Resultados para “escola”$",
  // Prancha 84 painel 2: o estado vazio da busca agrupada. Termo que não casa
  // com nada no seed — a captura prova o estado real, não um card inventado.
  "/explorar/busca?q=translado": "^Resultados para “translado”$",
  // RECON-049 (par 84): o termo que casa com um PRESTADOR e com o evento
  // semeado prova as seções "Serviços" e "Eventos" do agrupamento — sem ele, a
  // captura só mostrava o Guia e a ausência das outras seções parecia defeito.
  "/explorar/busca?q=manaus": "^Resultados para “manaus”$",
  "/explorar/busca?q=piquenique": "^Resultados para “piquenique”$",
  "/imoveis": "^Explorar moradia$",
  "/imoveis/novo": "^Novo anúncio de moradia$",
  // A ficha do imóvel é nomeada pelo título do anúncio.
  "/imoveis/b2000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  "/imoveis/alertas": "^Meus alertas$",
  "/pedidos/novo?prestador=30000000-0000-4000-8000-000000000010": "^Do que você precisa\\?$",
  "/pedidos": "^Meus pedidos$",
  // O título do pedido vem da primeira linha da própria descrição do pedido.
  "/pedidos/40000000-0000-4000-8000-000000000023": DYNAMIC_HEADING,
  "/recommendations?focus=80000000-0000-4000-8000-000000000f00": "^Indicações$",
  "/salvos": "^Salvos$",
  "/ajuda": "^Ajuda$",
  "/denuncias": "^Confiança e privacidade$",
  "/denuncias/nova?tipo=post&id=80000000-0000-4000-8000-000000000f01": "^Denunciar publicação$",
  "/denuncias/<own-report>": "^Acompanhar denúncia$",
  "/messages/<thread>": "^Mensagens$",
  // As subrotas de Configurações têm título próprio no H1 da área: a área
  // continua nomeada ("Configurações") e a subtela entra no mesmo H1. Assim uma
  // captura que aterrissasse na subtela errada deixa de passar como válida
  // (RECON-042, defeito 3). As duas pontas — título e mapa — andam juntas.
  "/configuracoes/notificacoes": "^Configurações · Notificações$",
  "/configuracoes/conta": "^Configurações · Conta$",
  "/configuracoes/familia": "^Configurações · Família$",
  "/configuracoes/bloqueados": "^Configurações · Privacidade$",
}

export const ROUTES = [
  { path: "/", name: "root", auth: false },
  { path: "/login", name: "login", auth: false },
  { path: "/signup", name: "signup", auth: false },
  { path: "/recuperar-senha", name: "recuperar-senha", auth: false },
  { path: "/nova-senha", name: "nova-senha", auth: false },
  // RECON-018 (prancha 37): os três painéis do cartão de confirmação. A rota é
  // alcançável por sessão de membro no proxy; o painel pendente e o expirado
  // dependem do estado local (sessionStorage) que `pendingEmail` planta, com
  // um endereço de exemplo — fixture de tela, não dado real.
  { path: "/auth/confirmar-email", name: "auth-confirmar-email", auth: true },
  {
    path: "/auth/confirmar-email",
    name: "auth-confirmar-email-pendente",
    auth: true,
    pendingEmail: "ana@exemplo.invalid",
  },
  {
    path: "/auth/confirmar-email?estado=expirado",
    name: "auth-confirmar-email-expirado",
    auth: true,
    pendingEmail: "ana@exemplo.invalid",
  },
  { path: "/consent", name: "consent", auth: false },
  // Sem sessão o funil não abre: o visitante é mandado ao login. Isso é a
  // prova do PORTÃO, não da tela — por isso a rota declara o destino e o h1 da
  // tela de login em vez do contrato de /onboarding (que fica para a variante
  // autenticada, onde a tela aparece de verdade).
  {
    path: "/onboarding",
    name: "onboarding",
    auth: false,
    expectedPath: "/login*",
    heading: "^Que bom ter você de volta\\.$",
  },
  // Com sessão o funil decide o passo pelo outcome do ator: verificado sem
  // localidade cai na localidade, pendente na situação, e "rejected" é o único
  // que permanece no passo de verificação. A conta global (verificada, com
  // localidade) era mandada para /community e a captura chamava isso de defeito.
  { path: "/onboarding", name: "onboarding", auth: true, account: "rejeitado" },
  // Sem `status` a pagina redireciona para /onboarding, entao o caminho nu nunca
  // poderia ser evidencia da tela de situacao: ele aterrissa em outro lugar por desenho.
  {
    path: "/onboarding/status?status=pending",
    name: "onboarding-status",
    auth: true,
    account: "pendente",
  },
  // "Precisamos de outro arquivo" só aparece para outcome "rejected".
  { path: "/onboarding/documento", name: "onboarding-documento", auth: true, account: "rejeitado" },
  { path: "/onboarding/welcome", name: "onboarding-welcome", auth: true },
  // Verificado e sem localidade: é este ator que para na escolha de localidade.
  { path: "/onboarding/locality", name: "onboarding-locality", auth: true, account: "novato" },
  { path: "/onboarding/perfil", name: "onboarding-perfil", auth: true },
  // As quatro telas do operador exigem a linha em `operators` (seed:
  // operador@). Com a conta global elas caíam em /community e a captura
  // declarava "Operator surface not reached".
  { path: "/reports", name: "admin-reports", auth: true, account: "operador" },
  { path: "/admissions", name: "admin-admissions", auth: true, account: "operador" },
  { path: "/guide-queue", name: "admin-guide-queue", auth: true, account: "operador" },
  { path: "/groups", name: "groups", auth: true },
  // Grupos do seed são 60000000-… (70000000-… é a faixa dos eventos).
  { path: "/groups/60000000-0000-4000-8000-000000000001", name: "group-detail", auth: true },
  { path: "/profile", name: "profile", auth: true },
  { path: "/events", name: "events", auth: true },
  // O id antigo (80000000-…) é de POST no seed, não de evento: a rota de detalhe
  // capturava o 404 honesto há runs. Eventos são 70000000-… no seed.
  { path: "/events/70000000-0000-4000-8000-000000000005", name: "event-detail", auth: true },
  // RECON-025: o Mercado. A rota de detalhe depende de um anúncio no seed,
  // que este lote não pode criar (supabase/seed.sql fora dos allowed_paths);
  // capture-a quando a fixture existir.
  { path: "/mercado", name: "mercado", auth: true },
  { path: "/mercado/novo", name: "mercado-novo", auth: true },
  // RECON-026: a gestão dos próprios anúncios. `/meus-anuncios` é rota fixa. A
  // edição depende de um anúncio no seed; `supabase/seed.sql` está fora dos
  // allowed_paths deste lote, então o caminho fica cadastrado com um id
  // determinístico e a captura cai no estado honesto "indisponível" até existir
  // a fixture — nunca em 404 silencioso nem em tela de login.
  { path: "/meus-anuncios", name: "meus-anuncios", auth: true },
  {
    path: "/mercado/a0000000-0000-4000-8000-000000000001/editar",
    name: "mercado-editar",
    auth: true,
  },
  // RECON-029: o evento REAL do seed (organizador 30000000-...-001) — o id
  // acima é um post id, não um evento; esta fixture concreta sustenta a captura
  // do detalhe e do fio de pergunta.
  {
    path: "/events/70000000-0000-4000-8000-000000000005",
    name: "event-detail-seeded",
    auth: true,
  },
  // RECON-029 (R34/R35): rotas novas. Fixture concreta = evento do seed
  // (organizador 30000000-...-001) e a conta visual (Ana Verificada), que NÃO
  // organiza o evento semeado — por isso `perguntas` cai no painel "Pedir mais
  // informações" e `editar` exige a conta organizadora numa run dedicada.
  { path: "/events/novo", name: "event-novo", auth: true },
  {
    path: "/events/70000000-0000-4000-8000-000000000005/perguntas",
    name: "event-perguntas",
    auth: true,
  },
  {
    // Editar exige ser o organizador: o evento é o da CONTA DE CAPTURA
    // (70000000-…0009, semeado para isso), não um evento de terceiro.
    path: "/events/70000000-0000-4000-8000-0000000000a1/editar",
    name: "event-editar",
    auth: true,
  },
  { path: "/community", name: "community", auth: true },
  { path: "/communities", name: "communities", auth: true },
  // RECON-034 — apresentação com faixa/miniatura e o console de imagens do dono.
  {
    path: "/communities/71000000-0000-4000-8000-000000000001",
    name: "community-detail",
    auth: true,
  },
  {
    path: "/communities/71000000-0000-4000-8000-000000000001/admin/media",
    name: "community-admin-media",
    auth: true,
  },
  {
    path: "/communities/71000000-0000-4000-8000-000000000001/admin/pending",
    name: "community-admin-pending",
    auth: true,
  },
  {
    path: "/auth/callback-error",
    name: "auth-callback-error",
    auth: false,
  },
  { path: "/guide", name: "arrival-guide", auth: true },
  // RECON-021: prova que o Ver-todos do grupo Guia chega com o filtro `q`
  // preenchido (hunk de uma linha no /guide).
  { path: "/guide?q=escola", name: "arrival-guide-termo", auth: true },
  // RECON-030: o artigo estruturado (prancha 25) estende a entrada curada.
  // Fixture concreta do seed: Escola Modelo do Centro (Manaus, aprovada).
  {
    path: "/guide/a0000000-0000-4000-8000-000000000001",
    name: "guide-article",
    auth: true,
  },
  {
    path: "/guide/a0000000-0000-4000-8000-000000000001/correcao",
    name: "guide-article-correcao",
    auth: true,
  },
  // G0 (reconstrução visual 2026-09-06): containers novos da navegação.
  { path: "/inicio", name: "inicio", auth: true },
  { path: "/explorar", name: "explorar", auth: true },
  { path: "/explorar/servicos", name: "explorar-servicos", auth: true },
  // RECON-021: painel direito da prancha 61 com o fixture real do seed —
  // capturar com BIVAQUE_VISUAL_EMAIL=membro-25@ (unico ator que ve o
  // prestador pela RLS).
  { path: "/explorar/servicos?q=climatiza", name: "explorar-servicos-termo", auth: true },
  // RECON-021: fixture concreta do seed de Manaus — "escola" casa com a
  // entrada aprovada "Escola Modelo do Centro" e NÃO pode casar com a
  // pendente "Escola de Acolhimento Militar" (status pending, RLS).
  { path: "/explorar/busca?q=escola", name: "explorar-busca", auth: true },
  { path: "/explorar/busca?q=translado", name: "explorar-busca-vazio", auth: true },
  { path: "/explorar/busca?q=manaus", name: "explorar-busca-servico", auth: true },
  { path: "/explorar/busca?q=piquenique", name: "explorar-busca-evento", auth: true },
  // Onda T Task 4: the "cidade" container's actual landing page — NAV_ITEMS
  // pointed here since E10 (406d4f6), but the route did not exist until T4.
  { path: "/localidade", name: "localidade", auth: true },
  // RECON-027: Moradia. `/imoveis` e `/imoveis/novo` não dependem de fixture.
  // O detalhe aponta para a fixture de anúncio que `supabase/seed.sql` precisa
  // criar (fora do allowed_paths deste lote) — sem ela a captura cai no 404
  // honesto, que NÃO conta como fidelidade comprovada.
  { path: "/imoveis", name: "imoveis", auth: true },
  { path: "/imoveis/novo", name: "imoveis-novo", auth: true },
  { path: `/imoveis/${IMOVEIS_FIXTURE_ID}`, name: "imoveis-detail", auth: true },
  // RECON-028: gestão dos alertas (prancha 65, painel 2). A tela renderiza o
  // estado vazio honesto enquanto `supabase/seed.sql` não tiver um alerta — o
  // seed está fora do allowed_paths deste lote, então a captura prova o estado
  // vazio real, não fidelidade de cartão populado.
  { path: "/imoveis/alertas", name: "imoveis-alertas", auth: true },
  // Onda T Task 5: o console do fundador. Com a conta global (sem operador) ele
  // rende o estado vazio honesto; a captura da tela real usa operador@.
  { path: "/arrivals", name: "admin-arrivals", auth: true, account: "operador" },
  // Onda G: a vitrine do prestador. Com a conta global (membro sem vila) a
  // ficha pública renderiza o 404 honesto e o painel o estado sem-permissão —
  // as telas do CRUD são do prestador do seed, e agora a rota diz isso em vez
  // de depender de alguém lembrar de rodar com a variável trocada.
  { path: "/prestador", name: "provider-panel", auth: true, account: "prestador" },
  { path: "/prestador/ficha", name: "provider-ficha", auth: true, account: "prestador" },
  { path: "/prestador/catalogo", name: "provider-catalogo", auth: true, account: "prestador" },
  // RECON-024 (prancha 23): Área de atendimento e Conta do negócio.
  {
    path: "/prestador/atendimento",
    name: "provider-atendimento",
    auth: true,
    account: "prestador",
  },
  { path: "/prestador/conta", name: "provider-conta", auth: true, account: "prestador" },
  {
    path: "/prestadores/30000000-0000-4000-8000-000000000010",
    name: "provider-public-ficha",
    auth: true,
  },
  // RECON-022: o formulário de pedido com destinatário fixo na URL. A fixture
  // concreta é a ficha semeada da vitrine G (Climatiza Manaus).
  {
    path: "/pedidos/novo?prestador=30000000-0000-4000-8000-000000000010",
    name: "pedido-novo",
    auth: true,
  },
  // RECON-023: a lista e o detalhe da prancha 17. A fixture concreta e o
  // pedido semeado de membro-1@ para a Climatiza Manaus (seed.sql) — e o
  // detalhe só existe para quem participa: sem `account`, o ator global
  // (dono-vila@) não é parte e a rota capturava o não-encontrado.
  { path: "/pedidos", name: "pedidos", auth: true },
  {
    path: "/pedidos/40000000-0000-4000-8000-000000000023",
    name: "pedido-detalhe",
    auth: true,
    account: "membro1",
  },
  {
    path: "/communities/71000000-0000-4000-8000-000000000001/indicar-prestador",
    name: "provider-indicar",
    auth: true,
  },
  { path: "/groups", name: "groups", auth: true },
  { path: "/events", name: "events", auth: true },
  { path: "/recommendations", name: "recommendations", auth: true },
  // RECON-035: a conversa vive na aba "Pedidos". O foco no pedido semeado
  // (visual@ é a autora) pré-seleciona a aba para a captura mostrar o ator e
  // o destino sem depender de clique.
  {
    path: "/recommendations?focus=80000000-0000-4000-8000-000000000f00",
    name: "recommendations-conversa",
    auth: true,
  },
  { path: "/messages", name: "messages", auth: true },
  { path: "/notifications", name: "notifications", auth: true },
  { path: "/profile", name: "profile", auth: true },
  // RECON-032 (pranchas 54 e 56). Fixtures concretas, não templates:
  // - /denuncias/nova: alvo é um post do seed que o visual@ vê pela RLS e
  //   ainda não denunciou (medido em 10/09/2026 com o token dele via REST);
  //   mantém o formulário aberto na captura. A spec e2e deste lote denuncia o
  //   mesmo post e resolve a denúncia que cria, então ele segue apto aqui.
  // - /denuncias/<own-report>: o id da denúncia do próprio ator é resolvido na
  //   hora por REST (fixture "own-report"). O seed gera ids aleatórios, então
  //   id fixo aqui virava fixture morta a cada reset do banco compartilhado.
  // - /messages/<thread>: idem, por REST (fixture "own-thread"): a conversa
  //   do ator é lida com o token dele. Antes o id vinha de um arquivo escrito
  //   por tests/e2e/recon-032-messages.spec.ts, e a captura só passava depois
  //   de rodar a suíte e2e inteira — quem capturava primeiro via defeito.
  //   As duas usam a conta do seed que TEM denúncia e conversa (visual@).
  { path: "/salvos", name: "salvos", auth: true },
  { path: "/ajuda", name: "ajuda", auth: true },
  { path: "/denuncias", name: "denuncias", auth: true },
  {
    path: "/denuncias/nova?tipo=post&id=80000000-0000-4000-8000-000000000f01",
    name: "denuncia-nova",
    auth: true,
  },
  {
    path: "/denuncias/<own-report>",
    name: "denuncia-detalhe",
    auth: true,
    account: "visual",
    fixture: "own-report",
  },
  {
    path: "/messages/<thread>",
    name: "message-thread",
    auth: true,
    account: "visual",
    fixture: "own-thread",
  },
  // RECON-031 — configurações (prancha 52) e confiança (prancha 56). A fixture
  // é a conta do seed: membro verificado (default), com a coluna vertical de
  // seções e as subrotas reais.
  // /configuracoes redireciona para a subrota de notificações: o destino é
  // contrato declarado, não surpresa (a tela é a mesma, o caminho muda).
  {
    path: "/configuracoes",
    name: "configuracoes",
    auth: true,
    expectedPath: "/configuracoes/notificacoes",
  },
  { path: "/configuracoes/notificacoes", name: "configuracoes-notificacoes", auth: true },
  { path: "/configuracoes/conta", name: "configuracoes-conta", auth: true },
  { path: "/configuracoes/familia", name: "configuracoes-familia", auth: true },
  { path: "/configuracoes/bloqueados", name: "configuracoes-bloqueados", auth: true },
]

// --------------------------------------------------------------------------
// .env.local fallback — when process env is empty, parse the local dotenv file
// --------------------------------------------------------------------------

function parseEnvFile(path) {
  try {
    const content = readFileSync(path, "utf-8")
    const result = {}
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

const APP_DOTENV = join(import.meta.dirname, "..", "..", "apps", "web", ".env.local")
const dotEnv = parseEnvFile(APP_DOTENV)
const TOKEN_SOURCE = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "..", "..", "packages", "tokens", "src", "tokens.json"),
    "utf8",
  ),
)

// --------------------------------------------------------------------------
// Public-only runs need no credentials. Protected runs fail before browsing if
// sign-in is unavailable; login screenshots cannot certify member/operator UI.
// --------------------------------------------------------------------------

// Uma rota pode exigir outra pessoa: a prancha 56 mostra a tela de uma conta
// com dados, e nem todo ator do seed compartilha todo contexto. `account` na
// rota lê BIVAQUE_VISUAL_EMAIL__<CONTA>/BIVAQUE_VISUAL_PASSWORD__<CONTA> e cai
// na conta global quando não definida.
//
// Duas formas de chamada convivem de propósito: a captura pede uma conta
// nomeada do seed (`fetchSession("operador")`), e a prova de operação pede um
// e-mail direto (`fetchSession({ email })`), porque ali o ator é o próprio
// objeto da prova e não pode depender de variável de ambiente.
export async function fetchSession(input) {
  const options = typeof input === "string" ? { account: input } : (input ?? {})
  const { account, email: emailOverride } = options
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    dotEnv["NEXT_PUBLIC_SUPABASE_URL"] ??
    dotEnv["SUPABASE_URL"]
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? dotEnv["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  const suffix = account ? `__${account.toUpperCase()}` : ""
  // Conta nomeada cai na conta GLOBAL quando não existe variável — e foi assim
  // que a captura do operador, do prestador e do novato saiu com o ator errado
  // por semanas, sem falhar. Conta nomeada sem mapa é erro, não fallback.
  const mapped = account ? SEED_ACCOUNTS[account] : undefined
  if (account && !emailOverride && !mapped) {
    const declared =
      process.env[`BIVAQUE_VISUAL_EMAIL${suffix}`] ?? dotEnv[`BIVAQUE_VISUAL_EMAIL${suffix}`]
    if (!declared) {
      throw new Error(
        `Conta de captura desconhecida: "${account}". Declare em SEED_ACCOUNTS (capture.mjs) ` +
          `ou defina BIVAQUE_VISUAL_EMAIL${suffix}.`,
      )
    }
  }
  const email =
    emailOverride ??
    process.env[`BIVAQUE_VISUAL_EMAIL${suffix}`] ??
    dotEnv[`BIVAQUE_VISUAL_EMAIL${suffix}`] ??
    mapped ??
    process.env["BIVAQUE_VISUAL_EMAIL"] ??
    dotEnv["BIVAQUE_VISUAL_EMAIL"]
  const password =
    process.env[`BIVAQUE_VISUAL_PASSWORD${suffix}`] ??
    dotEnv[`BIVAQUE_VISUAL_PASSWORD${suffix}`] ??
    process.env["BIVAQUE_VISUAL_PASSWORD"] ??
    dotEnv["BIVAQUE_VISUAL_PASSWORD"]

  if (!url || !anonKey || !email || !password) {
    throw new Error("Protected capture requires Supabase URL/key and BIVAQUE_VISUAL_EMAIL/PASSWORD")
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(`Visual sign-in failed (HTTP ${response.status})`)
  }

  // supabase-js derives its storage key from the first hostname label.
  const ref = new URL(url).hostname.split(".")[0]
  const session = await response.json()
  // expires_at é epoch em segundos. A corrida completa passa de uma hora, então
  // guardá-lo é o que permite trocar o token antes de ele vencer.
  return {
    storageKey: `sb-${ref}-auth-token`,
    session,
    expiresAt:
      typeof session?.expires_at === "number"
        ? session.expires_at
        : Math.floor(Date.now() / 1000) + (session?.expires_in ?? 3600),
  }
}

// Fixtures concretas de rotas dinâmicas. Duas fontes, ambas reais:
// - arquivo (`.visual/fixtures/<nome>.json`), escrito pelo spec e2e que cria a
//   linha;
// - consulta REST com o token do próprio ator (denúncia própria e conversa: o
//   seed gera ids aleatórios, então id fixo morre a cada reset). É a forma
//   preferida: não depende de outro spec ter rodado antes.
// Sem fixture a captura falha alto — fotografar 404 disfarçado não é evidência.

// A linha do PRÓPRIO ator, lida com o token dele — a RLS decide o que existe.
async function actorRow(route, auth, path, params) {
  if (!auth?.session?.access_token) {
    throw new Error(`rota ${route.name}: fixture "${route.fixture}" exige sessão autenticada`)
  }
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    dotEnv["NEXT_PUBLIC_SUPABASE_URL"] ??
    dotEnv["SUPABASE_URL"]
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? dotEnv["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  const query = new URLSearchParams(params)
  const response = await fetch(`${url}/rest/v1/${path}?${query.toString()}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${auth.session.access_token}` },
  })
  const rows = response.ok ? await response.json() : []
  return Array.isArray(rows) ? rows[0] : undefined
}

// O `sub` do JWT é o id do ator: a conversa é filtrada por participante.
function actorId(auth) {
  const token = auth?.session?.access_token
  if (typeof token !== "string") return null
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))
    return typeof payload?.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}

async function resolveRoutePath(route, auth) {
  if (!route.fixture) return route.path

  if (route.fixture === "own-report") {
    const row = await actorRow(route, auth, "reports", {
      select: "id",
      order: "created_at.desc",
      limit: "1",
    })
    if (typeof row?.id !== "string") {
      throw new Error(`rota ${route.name}: o ator não tem denúncia própria para a fixture`)
    }
    return `/denuncias/${row.id}`
  }

  if (route.fixture === "own-thread") {
    const me = actorId(auth)
    if (!me) throw new Error(`rota ${route.name}: sessão sem id de ator para a conversa`)
    const row = await actorRow(route, auth, "dm_conversations", {
      select: "id",
      or: `(participant_a.eq.${me},participant_b.eq.${me})`,
      order: "created_at.desc",
      limit: "1",
    })
    if (typeof row?.id !== "string") {
      throw new Error(`rota ${route.name}: o ator não participa de nenhuma conversa`)
    }
    return `/messages/${row.id}`
  }

  const file = join(OUT_ROOT, "fixtures", `${route.fixture}.json`)
  try {
    const { path } = JSON.parse(readFileSync(file, "utf8"))
    if (typeof path !== "string" || path.length === 0) {
      throw new Error(`fixture ${route.fixture}: campo "path" ausente`)
    }
    return path
  } catch (error) {
    throw new Error(
      `rota ${route.name} exige a fixture "${route.fixture}" (${file}): ${error.message}. ` +
        "Rode o spec e2e que a cria antes da captura.",
    )
  }
}

// --------------------------------------------------------------------------
// audit — runs inside the page, returns plain JSON
// --------------------------------------------------------------------------

function auditPage({ nonTextPairs, minimumTextSize, readingMeasureMax }) {
  const findings = []
  const add = (rule, severity, selector, detail) =>
    findings.push({ rule, severity, selector, detail })

  const describe = (element) => {
    const id = element.id ? `#${element.id}` : ""
    const cls = typeof element.className === "string" ? `.${element.className.split(/\s+/)[0]}` : ""
    return `${element.tagName.toLowerCase()}${id}${cls}`.slice(0, 80)
  }

  const parseColor = (value) => {
    const match = /rgba?\(([^)]+)\)/.exec(value)
    if (!match) return null
    const parts = match[1].split(",").map((part) => Number.parseFloat(part))
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
  }

  const luminance = (color) => {
    const channel = (raw) => {
      const c = raw / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  }

  const contrast = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (high + 0.05) / (low + 0.05)
  }

  const tokenColor = (name) => {
    const probe = document.createElement("span")
    probe.style.color = `var(${name})`
    document.body.append(probe)
    const color = parseColor(getComputedStyle(probe).color)
    probe.remove()
    return color
  }

  const backgroundOf = (element) => {
    let node = element
    while (node) {
      const color = parseColor(getComputedStyle(node).backgroundColor)
      if (color && color.a > 0.9) return color
      node = node.parentElement
    }
    return { r: 255, g: 255, b: 255, a: 1 }
  }

  // 1. horizontal overflow — the page body must never scroll sideways
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
    add(
      "layout-overflow",
      "high",
      "html",
      `scrollWidth ${document.documentElement.scrollWidth} > clientWidth ${document.documentElement.clientWidth}`,
    )
  }

  const interactive = [...document.querySelectorAll("a, button, [role='button'], input, select")]

  // Fonts must be served by the application itself. This catches a stylesheet or
  // component that silently reintroduces a hosted font after the local loader runs.
  for (const entry of performance.getEntriesByType("resource")) {
    const url = new URL(entry.name)
    if (/\.(?:woff2?|ttf|otf)(?:$|\?)/i.test(url.pathname) && url.origin !== location.origin) {
      add(
        "external-font-request",
        "high",
        url.hostname,
        "font asset requested outside the app origin",
      )
    }
  }

  // Um controle visualmente oculto (padrão do react-aria: o <input> com
  // clip-path inset(50%) dentro do <label>) não é o alvo de toque — quem
  // recebe o toque é o label que o envolve, e o desenho que anima é o
  // controle visível. Medir o input acusa 13x13 num alvo que ninguém mira.
  const visuallyHidden = (node) => {
    for (let current = node; current; current = current.parentElement) {
      const style = getComputedStyle(current)
      if (style.clipPath === "inset(50%)" || style.clip === "rect(0px, 0px, 0px, 0px)") return true
      const rect = current.getBoundingClientRect()
      if (rect.width <= 1 && rect.height <= 1 && style.overflow === "hidden") return true
    }
    return false
  }

  // O desenho que anima é o primeiro filho visível do label (o controle
  // pintado); o label em si é só a área de toque.
  const drawnControl = (label, control) => {
    for (const child of label.querySelectorAll("*")) {
      if (child === control) continue
      const rect = child.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0 && !visuallyHidden(child)) return child
    }
    return label
  }

  // O alvo de ponteiro de um controle dentro de <label> é o label inteiro —
  // clicar nele aciona o controle. Vale para o input visualmente oculto do
  // react-aria E para o checkbox desenhado de 20x20 cujo label tem 44px de
  // altura: medir o quadradinho reprovava um alvo que está certo.
  const hiddenControlTarget = (element) => {
    if (!["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName)) return null
    const label = element.closest("label")
    if (!label) return null
    return { sizeEl: label, motionEl: drawnControl(label, element) }
  }

  for (const element of interactive) {
    const hiddenControl = hiddenControlTarget(element)
    const sizeEl = hiddenControl ? hiddenControl.sizeEl : element
    const motionEl = hiddenControl ? hiddenControl.motionEl : element
    // O alvo de um controle rotulado é a UNIÃO entre o label e o próprio
    // controle. Medido em /signup: a caixa de aceite ocupa 44x44 e o label tem
    // 26px de altura porque o margin: -12px do desenho devolve a folga ao fluxo
    // do texto — medir só o label reprovava um alvo que é 44x44 de verdade, e
    // medir só o controle reprovaria o checkbox de 20px cujo label de 222x44 é
    // a área clicável. A união é o que o dedo alcança.
    // Um elemento escondido (display:none) mede 0x0 na origem: entrar na união
    // com esse retângulo inflava o alvo para a página inteira. Só retângulos
    // com área entram.
    const rectOf = (node) => {
      const rect = node.getBoundingClientRect()
      return rect.width === 0 && rect.height === 0 ? null : rect
    }
    const box = (() => {
      const outer = rectOf(sizeEl)
      const inner = rectOf(element)
      if (!hiddenControl) return inner ?? outer ?? { width: 0, height: 0 }
      if (!outer) return inner ?? { width: 0, height: 0 }
      if (!inner) return outer
      const left = Math.min(outer.left, inner.left)
      const top = Math.min(outer.top, inner.top)
      const right = Math.max(outer.right, inner.right)
      const bottom = Math.max(outer.bottom, inner.bottom)
      return { width: right - left, height: bottom - top }
    })()
    if (box.width === 0 && box.height === 0) continue

    // Artefato de framework: o <select> oculto que o react-aria renderiza para
    // um Select/ListBox é 1x1, com tabindex="-1" e sem nome acessível — não é
    // alvo de ponteiro nem de teclado. A isenção vale com ou sem label em volta;
    // o que NÃO pode passar é controle pequeno dentro de label grande (o
    // checkbox desenhado de 20px), e é por isso que a medida é a do alvo todo.
    if (
      box.width <= 4 &&
      box.height <= 4 &&
      element.tabIndex < 0 &&
      element.getAttribute("aria-hidden") !== "false"
    ) {
      continue
    }

    // 2. touch targets — 44x44 CSS px minimum
    if (box.width < 44 || box.height < 44) {
      add(
        "touch-target",
        "high",
        describe(sizeEl),
        `${Math.round(box.width)}x${Math.round(box.height)} (min 44x44)`,
      )
    }

    // 3. motion presence — interactive elements need a state transition
    const animates = (node) => {
      const style = getComputedStyle(node)
      if (style.transitionDuration.split(",").some((d) => Number.parseFloat(d) > 0)) return true
      return Number.parseFloat(style.animationDuration) > 0
    }
    // Controle dentro de <label>: quem anima é a ESTRUTURA pintada do controle,
    // não um filho escolhido a dedo. Medido em /denuncias/nova (radio do
    // react-aria): o primeiro filho visível do label é o wrapper que guarda o
    // input (62x44, sem transição) e o desenho que anima é o irmão
    // `radio__control` (16x16, 0.2s). Medir só o primeiro filho reprovava o
    // controle certo. Sem label, o alvo continua sendo o próprio elemento.
    const hasMotion = hiddenControl
      ? [element, sizeEl, ...sizeEl.querySelectorAll("*")].some(animates)
      : animates(motionEl)
    if (!hasMotion) {
      add("no-transition", "medium", describe(motionEl), "no transition/animation on interactive")
    }

    // 4. accessible name
    // Resolve `<label for=id>` associations: a label-for is a valid source of
    // an accessible name (ARIA), and the repo labels inputs through it (the
    // HeroUI lesson — its Input does not forward aria-label). Without this
    // resolution every properly-labeled input is a false positive every wave.
    let name = (element.getAttribute("aria-label") ?? "").trim()
    // aria-labelledby é a associação do react-aria para radio/checkbox: sem
    // resolvê-la, um controle corretamente rotulado vira "sem nome".
    if (name.length === 0) {
      const ids = (element.getAttribute("aria-labelledby") ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      const partes = ids
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim()
      if (partes.length > 0) name = partes
    }
    if (name.length === 0 && element.id) {
      const labeled = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
      name = (labeled?.textContent ?? "").trim()
    }
    // O <label> que ENVOLVE o controle também dá o nome acessível — é o caso do
    // radio/checkbox do react-aria, cujo input vive dentro do label. Sem esta
    // resolução, todo radio do produto virava "input sem nome": o mesmo tipo de
    // falso positivo que a régua de alvo de toque tinha.
    if (name.length === 0) {
      name = (element.closest("label")?.textContent ?? "").trim()
    }
    if (name.length === 0) {
      name = (element.textContent ?? "").trim()
    }
    if (name.length === 0) {
      name = (element.getAttribute("title") ?? "").trim()
    }
    if (name.length === 0) {
      add("missing-accessible-name", "high", describe(element), "no label, text, or title")
    }
  }

  // 5. text contrast + minimum size
  const textNodes = [...document.querySelectorAll("p, span, h1, h2, h3, h4, li, label, a, button")]
  for (const element of textNodes) {
    if (!element.textContent || element.textContent.trim().length === 0) continue
    const box = element.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue

    const style = getComputedStyle(element)
    const size = Number.parseFloat(style.fontSize)
    if (size < minimumTextSize)
      add("font-too-small", "medium", describe(element), `${size}px (min ${minimumTextSize}px)`)

    const foreground = parseColor(style.color)
    if (!foreground) continue
    const ratio = contrast(foreground, backgroundOf(element))
    const large = size >= 24 || (size >= 18.66 && Number.parseInt(style.fontWeight, 10) >= 700)
    const required = large ? 3 : 4.5
    if (ratio < required) {
      add(
        "contrast",
        "high",
        describe(element),
        `${ratio.toFixed(2)}:1 (needs ${required}:1) — ${style.color} on background`,
      )
    }
  }

  // Reading surfaces opt into the measure audit with a class or data attribute.
  // The estimate uses the current font size and the CSS `ch` convention, so it
  // remains useful across the three capture widths without hardcoded layout sizes.
  for (const element of document.querySelectorAll(".measure-reading, [data-reading-measure]")) {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const size = Number.parseFloat(style.fontSize)
    if (box.width === 0 || size === 0) continue
    // Caracteres por linha é o que o texto REALMENTE tem por linha, não a
    // largura da caixa dividida por meio em. Medido em /prestadores/<id>: a
    // bio tem 42 caracteres e cabe em UMA linha, mas o parágrafo é um bloco de
    // 616px dentro de uma coluna larga — a conta pela caixa dava 88 e reprovava
    // uma linha que não existe. O número de linhas vem da altura dividida pela
    // entrelinha; um parágrafo longo continua reprovando se suas linhas passarem
    // do limite.
    const lineHeight = Number.parseFloat(style.lineHeight)
    const lines =
      Number.isFinite(lineHeight) && lineHeight > 0
        ? Math.max(1, Math.round(box.height / lineHeight))
        : 1
    const text = (element.textContent ?? "").trim()
    if (text.length === 0) continue
    const charactersPerLine = text.length / lines
    if (charactersPerLine > readingMeasureMax) {
      add(
        "reading-measure",
        "medium",
        describe(element),
        `${Math.round(charactersPerLine)} characters per line (max ${readingMeasureMax})`,
      )
    }
  }

  // 6. non-text contrast — focus rings and control boundaries are measured
  // from the generated token values, not inferred from text color.
  const cssVariable = (reference) => {
    const [layer, name] = reference.split(".")
    return `--${layer}-${name}`
  }
  for (const {
    name,
    foreground: foregroundReference,
    background: backgroundReference,
  } of nonTextPairs) {
    const foregroundToken = cssVariable(foregroundReference)
    const backgroundToken = cssVariable(backgroundReference)
    const foreground = tokenColor(foregroundToken)
    const background = tokenColor(backgroundToken)
    if (!foreground || !background) {
      add(
        "non-text-contrast-unmeasurable",
        "high",
        name,
        "focus or control-boundary token is not a color",
      )
      continue
    }
    const ratio = contrast(foreground, background)
    if (ratio < 3) {
      const rule = name.startsWith("focus-")
        ? "non-text-contrast-focus"
        : "non-text-contrast-control-boundary"
      add(
        rule,
        "high",
        name,
        `${ratio.toFixed(2)}:1 (needs 3:1) — ${foregroundToken} on ${backgroundToken}`,
      )
    }
  }

  // 7. design-token discipline — no raw colors in inline styles
  for (const element of document.querySelectorAll("[style]")) {
    const inline = element.getAttribute("style") ?? ""
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(inline)) {
      add("hardcoded-color", "medium", describe(element), inline.slice(0, 100))
    }
  }

  // 8. images need alt text
  for (const image of document.querySelectorAll("img")) {
    if (image.getAttribute("alt") === null) {
      add("missing-alt", "high", describe(image), image.getAttribute("src") ?? "")
    }
  }

  // 9. exactly one h1 per screen
  const h1Count = document.querySelectorAll("h1").length
  if (h1Count !== 1) add("heading-structure", "medium", "h1", `${h1Count} h1 elements (expected 1)`)

  // 10. active navigation — each visible nav has exactly one current item (rubrica item 4).
  // O item corrente pode ser um link (aria-current="page"), um <span> na trilha
  // — a página atual de um breadcrumb NÃO é link para si mesma — ou uma aba
  // (aria-selected="true"). A régua exigia <a>, e por isso reprovava toda
  // trilha correta: /mercado já marcava a página atual com
  // <span aria-current="page"> e ainda assim aparecia como "0 active nav items".
  // Corrigido aqui, na régua, e não no markup — virar link para a própria
  // página para agradar o medidor seria o defeito.
  for (const nav of document.querySelectorAll("nav")) {
    if (nav.offsetWidth === 0 && nav.offsetHeight === 0) continue
    const anchors = nav.querySelectorAll("a")
    if (anchors.length === 0) continue
    const current = nav.querySelectorAll(
      '[aria-current="page"], a[data-active="true"], a[role="tab"][aria-selected="true"]',
    )
    if (current.length !== 1) {
      add(
        "nav-active",
        "medium",
        "nav",
        `${current.length} active nav items (expected 1) in nav: ${nav.getAttribute("aria-label") || "unlabeled"}`,
      )
    }
  }

  // 11. forbidden copy — the same privacy vocabulary the database rejects
  // 10. forbidden copy — the same privacy vocabulary the database rejects
  // (see supabase/migrations/20260802001300_fix_forbidden_content_regex.sql).
  // The DB guards post bodies; the UI copy must guard itself.
  //
  // The match targets *exposure* — the vocabulary used to label or attribute
  // a value to the user (e.g. "sua patente", "Patente:"). Pedagogical
  // negation copy in `/consent` ("Nenhum dado pessoal sensível (CPF, patente,
  // endereço) será armazenado") is intentionally allowed: telling the user
  // what is NOT stored is the contract itself. Same for the runbook docs.
  const exposure =
    /((?:sua|seu|do usu[áa]rio|do membro|minha|seus|suas)\s+)?\b(patente|posto militar|gradua[çc][ãa]o militar|organiza[çc][ãa]o militar|endere[çc]o residencial|selo de verifica[çc][ãa]o|verificado publicamente)\b\s*[:-]/i
  const bodyText = document.body.innerText || ""
  const hit = exposure.exec(bodyText)
  if (hit) {
    add("forbidden-copy", "high", "body", `forbidden term exposed in UI copy: "${hit[0]}"`)
  }
  return {
    findings,
    title: document.title,
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    url: location.pathname,
  }
}

// --------------------------------------------------------------------------

// driver
// --------------------------------------------------------------------------

async function main() {
  const runDir = join(OUT_ROOT, RUN_ID)
  const shotsDir = join(runDir, "shots")
  if (SCENARIO && !["publish", "edit"].includes(SCENARIO)) {
    throw new Error(`Unknown visual scenario: ${SCENARIO}`)
  }
  if (SCENARIO && ROUTE_PATH && ROUTE_PATH !== "/inicio") {
    throw new Error(`The ${SCENARIO} scenario starts at /inicio`)
  }
  // BIVAQUE_VISUAL_ROUTE casa o caminho exato ou o nome da rota — o nome é a
  // única forma de pedir uma rota cujo caminho só existe em runtime (fixture).
  // Lista separada por vírgula roda várias rotas num único processo, para que o
  // report.json da run carregue a prova de todas elas de uma vez.
  const requestedList = (SCENARIO ? "/inicio" : (ROUTE_PATH ?? ""))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  const selected = requestedList.length
    ? ROUTES.filter(
        (route) => requestedList.includes(route.path) || requestedList.includes(route.name),
      )
    : ROUTES
  const routes = [
    ...new Map(selected.map((route) => [`${route.path}:${route.auth}`, route])).values(),
  ].map((route) => ({
    ...route,
    name: `${route.name}${route.auth ? "--authenticated" : "--visitor"}${SCENARIO ? `--${SCENARIO}` : ""}`,
    // A rota pode declarar o próprio contrato de h1: uma rota de fronteira (o
    // funil sem sessão, por exemplo) não aterrissa na própria tela, e o título
    // honesto é o da tela onde ela aterrissa.
    expectedHeading: route.heading ?? HEADINGS[route.path],
    operator: ["/admissions", "/reports", "/guide-queue", "/arrivals"].includes(route.path),
    dialog:
      SCENARIO === "publish"
        ? "Criar publicação"
        : SCENARIO === "edit"
          ? "Editar publicação"
          : undefined,
  }))
  mkdirSync(shotsDir, { recursive: true })

  if (routes.length === 0) {
    throw new Error(`No visual route configured for ${ROUTE_PATH}`)
  }

  // supabase-js stores the session in localStorage; @supabase/ssr (the new B2
  // middleware) reads it from a cookie of the same name. Without the cookie the
  // server-side middleware has no session and redirects every gated route to
  // /login. Os dois são reaplicados quando o token é renovado no meio da corrida.
  async function applySession(context, route, auth) {
    if (!route.auth || !auth) return
    const sessionValue = `base64-${Buffer.from(JSON.stringify(auth.session)).toString("base64url")}`
    await context.addCookies([
      { name: "bivaque-consent-version", value: "2", url: BASE_URL },
      { name: auth.storageKey, value: sessionValue, url: BASE_URL },
    ])
    await context.addInitScript(
      ([key, session]) => window.localStorage.setItem(key, JSON.stringify(session)),
      [auth.storageKey, auth.session],
    )
  }

  // Navegação e espera de h1 ficam em funções próprias porque a captura pode
  // precisar repetir as duas depois de renovar o token.
  async function openRoute(page, targetPath) {
    const response = await page.goto(targetPath, { waitUntil: "networkidle", timeout: 30_000 })
    await page.waitForTimeout(400)
    return response
  }

  async function waitForHeading(page, route) {
    if (!route.expectedHeading) return
    // A data-named route waits for any h1: matching the sentinel would just
    // burn the timeout on every viewport and prove nothing.
    const wanted =
      route.expectedHeading === DYNAMIC_HEADING
        ? page.getByRole("heading", { level: 1 })
        : page.getByRole("heading", { level: 1, name: new RegExp(route.expectedHeading, "i") })
    await wanted
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {})
  }

  const sessions = new Map()
  // A corrida completa passa de uma hora e o access token vale exatamente uma:
  // sem trocar o token, as últimas rotas aterrissam em /login e o relatório
  // declara defeito de tela onde houve token vencido.
  const RENEW_MARGIN_SECONDS = 300
  async function sessionFor(route, options = {}) {
    const key = route.account ?? ""
    const cached = sessions.get(key)
    const stale = cached && cached.expiresAt - RENEW_MARGIN_SECONDS <= Math.floor(Date.now() / 1000)
    if (!cached || stale || options.force) {
      sessions.set(key, await fetchSession(route.account))
    }
    return sessions.get(key)
  }

  // Entrar é pré-requisito da evidência, não parte dela: se a sessão não abre,
  // a corrida termina declarando captura inválida em vez de estourar. Captura
  // que morre no meio deixa um diretório com prancha de menos e nenhum aviso.
  // Cada conta é aberta uma vez aqui, porque uma delas pode falhar sozinha.
  const contas = [...new Set(routes.filter((route) => route.auth).map((r) => r.account ?? ""))]
  for (const conta of contas) {
    try {
      await sessionFor({ account: conta || undefined, auth: true })
    } catch (error) {
      writeResults(
        runDir,
        routes.flatMap((route) =>
          VIEWPORTS.map((viewport) => ({
            route: route.path,
            viewport: viewport.name,
            status: 0,
            error: error.message,
            findings: [],
            proof: { valid: false, failures: [error.message] },
          })),
        ),
        false,
      )
      return
    }
  }

  // Same dev-host escape hatch as playwright.config.ts: point at a system Chrome when
  // the managed browser bundle is not installed.
  const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  const results = []

  for (const viewport of VIEWPORTS) {
    for (const route of routes) {
      // Public routes must be inspected as visitors see them. Reusing a signed-in
      // context makes `/` redirect to the member funnel and turns a landing audit
      // into a consent-screen audit.
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        baseURL: BASE_URL,
        locale: "pt-BR",
      })

      let auth = await sessionFor(route)
      await applySession(context, route, auth)

      // RECON-018: espelha a flag local que o cadastro escreve antes de mandar
      // para /auth/confirmar-email (chave em
      // apps/web/app/components/auth/resend-clock.ts — manter em sincronia).
      // Sem ela a rota captura o painel "nada pendente", que também é estado
      // válido, mas não é o painel da prancha.
      if (route.pendingEmail) {
        await context.addInitScript(
          ([payload]) =>
            window.sessionStorage.setItem("bivaque:confirmacao-pendente", JSON.stringify(payload)),
          [{ email: route.pendingEmail, lastResendAt: null }],
        )
      }

      const page = await context.newPage()
      const consoleErrors = []
      let pageErrors = 0
      page.on("pageerror", () => {
        pageErrors += 1
      })
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200))
      })

      const label = `${route.name}--${viewport.name}`
      let targetPath = route.path
      try {
        targetPath = await resolveRoutePath(route, auth)
        let response = await openRoute(page, targetPath)
        // Um destino /login numa rota autenticada que não o espera é token
        // vencido, não defeito de tela: reabre a sessão e navega de novo, uma
        // vez. Se ainda assim aterrissar em /login, o veredito fica como está.
        if (
          route.auth &&
          route.expectedPath !== "/login*" &&
          new URL(page.url()).pathname === "/login"
        ) {
          auth = await sessionFor(route, { force: true })
          await applySession(context, route, auth)
          response = await openRoute(page, targetPath)
        }
        await waitForHeading(page, route)
        if (SCENARIO === "publish") {
          await page
            // O composer real escreve "O que você quer compartilhar?" desde a
            // RECON-002; o seletor antigo ("No que você está pensando?") deixava
            // o cenário publish morrer em timeout e a composição da prancha 45
            // sem captura nenhuma.
            .getByRole("button", { name: "O que você quer compartilhar?", exact: true })
            .click()
          await page
            .getByRole("dialog", { name: route.dialog, exact: true })
            .waitFor({ state: "visible" })
        }

        if (SCENARIO === "edit") {
          // Prancha 45 painel 3 (edição): o item "Editar publicação" só existe
          // no menu do PRÓPRIO autor (a autoria é conferida no servidor), e o
          // post do autor vem da fixture RECON-051.
          const card = page
            .locator("article")
            .filter({ hasText: "horta comunitária da vila" })
            .first()
          await card.getByRole("button", { name: "Mais opções" }).first().click()
          await page.getByRole("menuitem", { name: "Editar publicação" }).click()
          await page
            .getByRole("dialog", { name: route.dialog, exact: true })
            .waitFor({ state: "visible", timeout: 15_000 })
        }

        // Two shots per route: the fold shot keeps first-impression detail legible for
        // visual review, the full-page shot carries scroll rhythm and the bottom states.
        const fold = join(shotsDir, `${label}--fold.png`)
        const full = join(shotsDir, `${label}--full.png`)
        await page.screenshot({ path: fold })
        await page.screenshot({ path: full, fullPage: true })
        const audit = await page.evaluate(auditPage, {
          nonTextPairs: TOKEN_SOURCE.contrast.nonTextPairs,
          minimumTextSize: TOKEN_SOURCE.contrast.minimumTextSize,
          readingMeasureMax: Number(TOKEN_SOURCE.primitive["type-reading-max-characters"]),
        })
        const observed = {
          heading: audit.heading,
          operator: await page
            .getByRole("navigation", { name: "Painel do operador", exact: true })
            .isVisible(),
          dialog:
            route.dialog &&
            (await page.getByRole("dialog", { name: route.dialog, exact: true }).isVisible())
              ? route.dialog
              : null,
          fallback: await page
            .getByText(
              /Página não encontrada|Application error|Você ainda não tem acesso|Não foi possível carregar|Algo deu errado/,
            )
            .first()
            .isVisible(),
          pageErrors,
        }
        const landedOn = new URL(page.url()).pathname + new URL(page.url()).search
        const proof = assessCapture({
          // Rota com fixture tem identidade no caminho RESOLVIDO: o sentinela
          // (/denuncias/<own-report>) é o alvo pedido, não o destino real.
          route: route.expectedPath ? route : { ...route, expectedPath: targetPath },
          authenticated: Boolean(auth),
          status: response?.status() ?? 0,
          landedOn,
          observed,
        })

        results.push({
          route: route.path,
          target: targetPath,
          viewport: viewport.name,
          status: response?.status() ?? 0,
          landedOn,
          actor: route.operator ? "operator" : route.auth ? "member" : "visitor",
          state: SCENARIO ?? "route",
          proof,
          screenshot: fold,
          screenshotFull: full,
          consoleErrors: consoleErrors.splice(0),
          ...audit,
        })
      } catch (error) {
        results.push({
          route: route.path,
          target: targetPath,
          viewport: viewport.name,
          status: 0,
          error: String(error).slice(0, 300),
          findings: [],
          proof: { valid: false, failures: ["Capture did not reach its expected state"] },
        })
      } finally {
        await context.close()
      }
    }
  }

  await browser.close()
  writeResults(runDir, results, [...sessions.values()].some(Boolean))
}

function writeResults(runDir, results, authenticated) {
  const summary = summarizeCaptures(results)
  const { total, high, invalid } = summary
  // This identifies the runner checkout. A reviewer must also establish that
  // the server was built/started from this tree; a SHA alone cannot prove that.
  const runnerRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
  const runnerDirty =
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0
  const report = {
    runDir,
    authenticated,
    ...summary,
    runnerRevision,
    runnerDirty,
    baseURL: BASE_URL,
    fidelity: "not-assessed",
    results,
  }

  writeFileSync(join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`)

  const lines = [
    `# Visual audit — ${runDir}`,
    "",
    `Authenticated capture: **${authenticated ? "yes" : "no"}**`,
    `Capture identity: **${summary.valid ? "VALID" : "INVALID"}** (${invalid} invalid captures).`,
    `Runner revision: ${runnerRevision}; dirty: ${runnerDirty}; server: ${BASE_URL}.`,
    "Reference fidelity: **not assessed** — requires image comparison and independent review.",
    `Findings: **${total}** total, **${high}** high severity.`,
    "",
  ]

  for (const entry of results) {
    const findings = entry.findings ?? []
    lines.push(`## ${entry.route} @ ${entry.viewport} — HTTP ${entry.status}`)
    if (entry.error) lines.push(`- ERROR: ${entry.error}`)
    for (const failure of entry.proof?.failures ?? []) lines.push(`- INVALID: ${failure}`)
    const expected = entry.target ?? entry.route
    if (entry.landedOn && entry.landedOn !== expected) {
      lines.push(`- redirected to \`${entry.landedOn}\``)
    }
    if (entry.screenshot) {
      lines.push(`- fold: \`${entry.screenshot}\` · full: \`${entry.screenshotFull}\``)
    }
    for (const error of entry.consoleErrors ?? []) lines.push(`- console error: ${error}`)
    if (findings.length === 0) {
      lines.push(
        entry.proof?.valid
          ? "- no mechanical findings (fidelity not assessed)"
          : "- invalid capture; zero findings is not a pass",
      )
    } else {
      const grouped = new Map()
      for (const finding of findings) {
        const bucket = grouped.get(finding.rule) ?? []
        bucket.push(finding)
        grouped.set(finding.rule, bucket)
      }
      for (const [rule, bucket] of grouped) {
        lines.push(`- **${rule}** (${bucket[0].severity}) × ${bucket.length}`)
        for (const finding of bucket.slice(0, 5)) {
          lines.push(`  - \`${finding.selector}\` — ${finding.detail}`)
        }
      }
    }
    lines.push("")
  }

  writeFileSync(join(runDir, "report.md"), `${lines.join("\n")}\n`)
  console.log(`[visual] ${total} findings (${high} high) → ${join(runDir, "report.md")}`)
  if (!isCaptureReportPassing(report)) process.exitCode = 1
}

if (process.argv[1]?.endsWith("capture.mjs")) await main()
