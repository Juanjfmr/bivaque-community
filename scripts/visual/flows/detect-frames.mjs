// Detector de geometria das pranchas do guia visual.
//
// Cada prancha é um PNG com N telas/estados lado a lado, separadas por calhas de fundo. O
// gerador da galeria recorta cada quadro; este script acha as calhas e escreve frames.json.
// O recorte em si é feito por CSS na galeria — aqui só se mede, não se gera PNG.
//
// Sem dependência nova: os PNGs do guia são colorType 2 (RGB), bitDepth 8, sem entrelaçamento,
// então um leitor mínimo com node:zlib basta e roda em qualquer plataforma. O script não pode
// depender de sharp (transitivo, não declarado) nem de System.Drawing (não existe no CI Linux).
//
// Regra por contagem esperada (screens.length do manifest, confirmada em inspeção visual):
//   1 quadro  -> largura inteira (web de tela única)
//   2 quadros -> split na calha mais larga perto do centro (web de dois desktops)
//   >=3       -> calhas detectadas; se a contagem divergir, os N quadros mais largos
// As calhas SÃO lacunas intencionais entre quadros: os quadros não somam 1, e não devem.
//
// Uso:
//   node scripts/visual/flows/detect-frames.mjs [--check]
//     sem flag  -> escreve frames.json
//     --check   -> não escreve; falha (exit 1) se algum quadro divergir do manifest

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { inflateSync } from "node:zlib"

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const guideDir = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")
const outPath = join(repoRoot, "scripts", "visual", "flows", "frames.json")
const overridesPath = join(repoRoot, "scripts", "visual", "flows", "frames.overrides.json")

const CHECK = process.argv.includes("--check")

// Tolerâncias. Calha = coluna uniforme (std baixo) E com a cor do fundo (mean perto do canto).
// Exigir as duas separa a calha real de uma coluna que cruza uma área plana colorida.
const STD_TOL = 7
const MEAN_TOL = 9
const MIN_GUTTER = 4
const MIN_FRAME = 0.05

// ---------------------------------------------------------------- leitor de PNG mínimo

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("assinatura PNG inválida")

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idat = []

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset)
    offset += 4
    const type = buf.toString("ascii", offset, offset + 4)
    offset += 4
    const data = buf.subarray(offset, offset + length)
    offset += length
    offset += 4 // CRC, não verificado

    if (type === "IHDR") {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === "IDAT") {
      idat.push(data)
    } else if (type === "IEND") {
      break
    }
  }

  if (bitDepth !== 8) throw new Error(`bitDepth ${bitDepth} não suportado`)
  if (interlace !== 0) throw new Error("PNG entrelaçado não suportado")
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : 0
  if (channels === 0) throw new Error(`colorType ${colorType} não suportado`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)
  let pos = 0

  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const row = y * stride
    const prev = (y - 1) * stride
    for (let x = 0; x < stride; x++) {
      const byte = raw[pos++]
      const a = x >= channels ? out[row + x - channels] : 0
      const b = y > 0 ? out[prev + x] : 0
      const c = x >= channels && y > 0 ? out[prev + x - channels] : 0
      let value
      switch (filter) {
        case 0:
          value = byte
          break
        case 1:
          value = byte + a
          break
        case 2:
          value = byte + b
          break
        case 3:
          value = byte + ((a + b) >> 1)
          break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          value = byte + pred
          break
        }
        default:
          throw new Error(`filtro PNG ${filter} desconhecido`)
      }
      out[row + x] = value & 0xff
    }
  }

  return { width, height, channels, data: out }
}

// ---------------------------------------------------------------- calhas

function backgroundRuns(image) {
  const { width, height, channels, data } = image
  const sampleStep = 2
  const rows = Math.ceil(height / sampleStep)
  const means = new Float64Array(width)
  const stds = new Float64Array(width)

  for (let x = 0; x < width; x++) {
    let sum = 0
    let sumSq = 0
    for (let y = 0; y < height; y += sampleStep) {
      const i = (y * width + x) * channels
      const lum =
        channels >= 3 ? 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] : data[i]
      sum += lum
      sumSq += lum * lum
    }
    const mean = sum / rows
    means[x] = mean
    stds[x] = Math.sqrt(Math.max(0, sumSq / rows - mean * mean))
  }

  const background = means[1]
  const isGutter = (x) => stds[x] <= STD_TOL && Math.abs(means[x] - background) <= MEAN_TOL

  const runs = []
  let start = -1
  for (let x = 0; x < width; x++) {
    if (isGutter(x)) {
      if (start === -1) start = x
    } else if (start !== -1) {
      runs.push([start, x - 1])
      start = -1
    }
  }
  if (start !== -1) runs.push([start, width - 1])

  return { width, runs }
}

function panelsBetween(width, runs, minGutter) {
  const panels = []
  let cursor = 0
  for (const [start, end] of runs) {
    if (end - start + 1 < minGutter) continue
    if (start > cursor) panels.push([cursor, start - 1])
    cursor = end + 1
  }
  if (cursor < width - 1) panels.push([cursor, width - 1])
  return panels
}

function framesFor(artifact, image) {
  const expected = artifact.screens.length
  const { width, runs } = backgroundRuns(image)

  if (expected === 1) {
    return { panels: [[0, width - 1]], note: "quadro único" }
  }

  if (expected === 2) {
    // Dois desktops iguais, com um gutter mínimo exatamente no centro (medido em inspeção:
    // o split fica em 0.499–0.500 nas pranchas web, gutter de 0.003–0.010). A detecção de
    // calha não serve aqui: cada desktop tem margens claras internas que parecem fundo, e o
    // "gutter mais largo perto do centro" acaba cortando a margem do painel esquerdo.
    const half = width / 2
    const gutterHalf = Math.max(1, Math.round(width * 0.003))
    return {
      panels: [
        [0, Math.round(half - gutterHalf) - 1],
        [Math.round(half + gutterHalf), width - 1],
      ],
      note: "split central (dois desktops iguais)",
    }
  }

  const panels = panelsBetween(width, runs, MIN_GUTTER)
  if (panels.length === expected) return { panels, note: "calhas" }
  const widest = panels
    .slice()
    .sort((a, b) => b[1] - b[0] - (a[1] - a[0]))
    .slice(0, expected)
    .sort((a, b) => a[0] - b[0])
  return { panels: widest, note: `fallback: ${expected} maiores de ${panels.length} faixas` }
}

// ---------------------------------------------------------------- verificação

function validate(frames, expected) {
  const problems = []
  if (frames.length !== expected) problems.push(`contagem ${frames.length} != ${expected}`)
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]
    if (f.x < 0 || f.w <= 0 || f.x + f.w > 1.0001) problems.push(`quadro ${i + 1} fora dos limites`)
    if (f.w < MIN_FRAME) problems.push(`quadro ${i + 1} estreito demais (${f.w.toFixed(3)})`)
    if (i > 0) {
      const prevEnd = frames[i - 1].x + frames[i - 1].w
      if (f.x < prevEnd - 0.0005) problems.push(`quadro ${i + 1} sobrepõe o ${i}`)
    }
  }
  if (expected === 1 && frames[0] && frames[0].x !== 0)
    problems.push("quadro único não começa em 0")
  return problems
}

// ---------------------------------------------------------------- execução

const manifest = JSON.parse(readFileSync(join(guideDir, "manifest.json"), "utf8"))
const overrides = (() => {
  try {
    return JSON.parse(readFileSync(overridesPath, "utf8")).boards ?? {}
  } catch {
    return {}
  }
})()

const boards = {}
const lines = []
let failures = 0

for (const artifact of manifest.artifacts) {
  const expected = artifact.screens.length
  const image = decodePng(readFileSync(join(guideDir, artifact.file)))
  const override = overrides[artifact.id]

  let panels
  let note
  let source
  if (override?.frames?.length) {
    source = "override"
    note = override.note ?? "override manual"
    panels = override.frames.map((f) => [
      Math.round(f.x * image.width),
      Math.round((f.x + f.w) * image.width) - 1,
    ])
  } else {
    source = "detect"
    const result = framesFor(artifact, image)
    panels = result.panels
    note = result.note
  }

  const frames = panels.map(([start, end]) => ({
    x: Number((start / image.width).toFixed(5)),
    y: 0,
    w: Number(((end - start + 1) / image.width).toFixed(5)),
    h: 1,
  }))

  const problems = validate(frames, expected)
  if (problems.length) failures++

  boards[artifact.id] = {
    file: artifact.file,
    width: image.width,
    height: image.height,
    expected,
    detected: frames.length,
    ok: problems.length === 0,
    source,
    note,
    frames,
  }

  const spans = frames.map((f) => `${f.x.toFixed(3)}..${(f.x + f.w).toFixed(3)}`).join(" ")
  lines.push(
    `${problems.length ? "FAIL" : "ok  "} ${artifact.id.padEnd(36)} n=${frames.length}/${expected} ${spans}${problems.length ? `  << ${problems.join("; ")}` : ""}`,
  )
}

console.log(lines.join("\n"))
console.log(`\n${manifest.artifacts.length} pranchas, ${failures} divergentes`)

if (CHECK) {
  if (failures > 0) {
    console.error(
      "\n--check falhou: corrija a detecção ou registre override em frames.overrides.json",
    )
    process.exit(1)
  }
  console.log("--check ok")
} else {
  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        _note:
          "Geometria de recorte por prancha, gerada por detect-frames.mjs. x/y/w/h são relativos (0-1). As calhas entre quadros são lacunas intencionais: os quadros não somam 1. Não editar à mão — para corrigir uma prancha cuja detecção erra, registre-a em frames.overrides.json e regenere.",
        version: 1,
        generatedBy: "scripts/visual/flows/detect-frames.mjs",
        boards,
      },
      null,
      2,
    )}\n`,
    "utf8",
  )
  console.log(`escrito ${outPath}`)
}
