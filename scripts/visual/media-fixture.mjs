// Fixture de MÍDIA para o seed local.
//
// O seed é SQL puro e não cria bytes: nenhuma tela com foto (mercado, moradia,
// vitrine de prestador, avatar, capa de comunidade) podia ser provada em
// runtime por falta de objeto no bucket — não por falta de UI. Este script sobe
// PNGs determinísticos pelo Storage API (o único caminho: storage.objects tem
// trigger que recusa INSERT/DELETE direto para servir arquivo) e amarra as
// linhas que os referenciam.
//
// Idempotente: rodar de novo sobrescreve objeto e linha. Rodar DEPOIS de
// `supabase db reset`, que zera as linhas mas deixa os arquivos no bucket.
//
//   node scripts/visual/media-fixture.mjs
//
// Cores diferentes por grupo deixam a captura legível: dá para ver no print
// qual bucket respondeu.

import { readFileSync } from "node:fs"
import { deflateSync } from "node:zlib"
import { createClient } from "@supabase/supabase-js"

const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=")
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")]
    }),
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── PNG mínimo, sem dependência: header + IDAT (zlib) + IEND ────────────────
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

/** PNG de cor sólida com uma faixa mais clara — 4:3, como as fotos do produto. */
function makePng(width, height, [r, g, b]) {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0
    offset += 1
    for (let x = 0; x < width; x += 1) {
      const stripe = y > height * 0.62
      raw[offset] = stripe ? Math.min(255, r + 40) : r
      raw[offset + 1] = stripe ? Math.min(255, g + 40) : g
      raw[offset + 2] = stripe ? Math.min(255, b + 40) : b
      offset += 3
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const results = []
function report(label, detail) {
  results.push(label)
  console.log(`ok   ${label} — ${detail}`)
}

async function upload(bucket, path, png) {
  const { error } = await supabase.storage.from(bucket).upload(path, png, {
    contentType: "image/png",
    upsert: true,
  })
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`)
}

// ── 1. Fotos de anúncio (mercado e moradia) ────────────────────────────────
const { data: listings, error: listingError } = await supabase
  .from("listings")
  .select("id, kind, status")
  .in("status", ["active", "paused", "reserved"])
if (listingError) throw new Error(listingError.message)

let listingPhotos = 0
for (const [index, listing] of (listings ?? []).entries()) {
  const palette = listing.kind === "property" ? [214, 226, 209] : [206, 219, 231]
  const png = makePng(
    640,
    480,
    palette.map((channel) => (channel + index * 7) % 240),
  )
  const path = `${listing.id}/seed-0.png`
  await upload("listing-photos", path, png)

  const { error: deleteError } = await supabase
    .from("listing_photos")
    .delete()
    .eq("listing_id", listing.id)
  if (deleteError) throw new Error(deleteError.message)
  const { error: insertError } = await supabase
    .from("listing_photos")
    .insert({ listing_id: listing.id, path, position: 0 })
  if (insertError) throw new Error(insertError.message)
  listingPhotos += 1
}
report("fotos de anúncio", `${listingPhotos} anúncios com capa no bucket listing-photos`)

// ── 2. Fotos da vitrine do prestador ──────────────────────────────────────
const { data: providers, error: providerError } = await supabase
  .from("provider_profiles")
  .select("id")
if (providerError) throw new Error(providerError.message)

let portfolioPhotos = 0
for (const provider of providers ?? []) {
  const path = `${provider.id}/portfolio/seed-0.png`
  await upload("provider-photos", path, makePng(800, 600, [222, 214, 196]))

  const { error: deleteError } = await supabase
    .from("provider_portfolio_photos")
    .delete()
    .eq("provider_id", provider.id)
  if (deleteError) throw new Error(deleteError.message)
  const { error: insertError } = await supabase
    .from("provider_portfolio_photos")
    .insert({ provider_id: provider.id, photo_path: path, caption: "Foto de exemplo", position: 0 })
  if (insertError) throw new Error(insertError.message)
  portfolioPhotos += 1
}
report("foto do prestador", `${portfolioPhotos} ficha(s) com foto no bucket provider-photos`)

// ── 3. Avatares das contas que a captura e o E2E usam ─────────────────────
const AVATAR_OWNERS = [
  "20000000-0000-4000-8000-000000000001", // visual@ (conta de captura)
  "20000000-0000-4000-8000-000000000008", // dono-vila@
  "20000000-0000-4000-8000-00000000000a", // prestador-seed@
  "30000000-0000-4000-8000-000000000001", // membro-1@
  "30000000-0000-4000-8000-00000000001a", // membro-26@
]
let avatars = 0
for (const [index, userId] of AVATAR_OWNERS.entries()) {
  await upload(
    "avatars",
    `${userId}/seed-avatar.png`,
    makePng(256, 256, [120 + index * 9, 150, 130]),
  )
  avatars += 1
}
report("avatares", `${avatars} contas com avatar no bucket avatars`)

// ── 4. Imagens da comunidade (faixa e miniatura) ──────────────────────────
const { data: communities, error: communityError } = await supabase
  .from("communities")
  .select("id, owner_user_id")
  .eq("is_deleted", false)
if (communityError) throw new Error(communityError.message)

let communityImages = 0
for (const community of communities ?? []) {
  for (const kind of ["banner", "thumbnail"]) {
    // O caminho NAO e livre: o app assina sempre `communityImagePath(id, kind)`,
    // isto e, `<id>/banner` e `<id>/thumbnail` (community-media.ts:30-32), e a
    // policy de storage confere `communities.banner_path = objects.name`. Uma
    // fixture que inventa nome de arquivo (`seed-banner.png`) grava ponteiro que
    // o app nunca pede: as imagens caem no estado "sem imagem" e a captura
    // fotografa o vazio como se fosse a prancha entregue. Medido em 16/09/2026
    // pela revisao independente do RECON-034.
    const path = `${community.id}/${kind}`
    await upload(
      "community-images",
      path,
      makePng(960, 360, kind === "banner" ? [186, 205, 190] : [201, 196, 214]),
    )
    const { error } = await supabase.rpc("set_community_image", {
      p_community_id: community.id,
      p_kind: kind,
      p_path: path,
      p_caller_user_id: community.owner_user_id,
    })
    if (error) throw new Error(`set_community_image ${kind}: ${error.message}`)
    communityImages += 1
  }
}
report("imagens de comunidade", `${communityImages} ponteiros (faixa e miniatura)`)

// ── 5. Capa do evento (prancha 70) ────────────────────────────────────────
// O caminho tem de viver na pasta do organizador: é o que o trigger
// validate_event_cover_path_trigger confere na própria linha.
const { data: events, error: eventError } = await supabase
  .from("events")
  .select("id, organizer_id, cover_path")
  .eq("status", "upcoming")
if (eventError) throw new Error(eventError.message)

let eventCovers = 0
for (const [index, event] of (events ?? []).entries()) {
  const path = `${event.organizer_id}/seed-cover-${event.id}.png`
  await upload("event-photos", path, makePng(960, 360, [196 + (index % 3) * 8, 208, 186]))
  const { error } = await supabase.from("events").update({ cover_path: path }).eq("id", event.id)
  if (error) throw new Error(`cover do evento ${event.id}: ${error.message}`)
  eventCovers += 1
}
report("capas de evento", `${eventCovers} eventos futuros com capa no bucket event-photos`)

console.log(`\n${results.length} grupos de mídia aplicados`)
