// Constantes de fixture do lote RECON-032 no banco local semeado.
// IDs medidos em 10/09/2026 via leitura do stack compartilhado (seed.sql gera
// UUIDs fixos nestas faixas). Se o banco for resetado com outro seed, as
// capturas e specs deste lote apontam para aqui.

export const VISUAL_EMAIL = "visual@bivaque.example.invalid"
export const OPERADOR_EMAIL = "operador@bivaque.example.invalid"
export const MEMBRO_1_EMAIL = "membro-1@bivaque.example.invalid"
export const MEMBRO_1_USER_ID = "30000000-0000-4000-8000-000000000001"
export const PRESTADOR_EMAIL = "prestador-seed@bivaque.example.invalid"

// unico pedido de indicacao do seed; origem do toggle Salvar e fixture da
// captura /salvos
export const REQUEST_ID = "80000000-0000-4000-8000-000000000f00"
export const REQUEST_TITLE = "Alguém conhece um bom encanador?"

// post do seed que o visual@ VE pela RLS e ainda nao denunciou (medido via
// REST com o token dele em 10/09/2026) — alvo do fluxo de denuncia deste lote
// e da captura /denuncias/nova. Os posts 80000000-…-001..00f ja tem denuncia
// aberta do seed; este (autor dono-vila) nao.
export const REPORT_TARGET_POST_ID = "80000000-0000-4000-8000-000000000f01"

// Localidade do piloto: o teste de leitura cria a propria publicacao nela e
// outro membro comenta, o que gera a nao-lida (trigger notify_comment). O seed
// nao garante nao-lidas que sobrevivam a execucoes.
export const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"

// ficha publica do prestador-seed — contexto provider do open_conversation
export const PROVIDER_PROFILE_ID = "30000000-0000-4000-8000-000000000010"
export const PROVIDER_USER_ID = "20000000-0000-4000-8000-00000000000a"
