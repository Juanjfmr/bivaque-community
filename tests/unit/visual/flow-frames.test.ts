import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// Trava o frames.json comitado. O detect-frames.mjs --check regenera e compara; este teste
// garante a integridade do artefato mesmo sem rodar o detector: um quadro editado à mão fora
// dos limites, sobreposto ou com a contagem errada falha aqui, no gate normal.

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const guideDir = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")

type Frame = { x: number; y: number; w: number; h: number }
type Board = { expected: number; frames: Frame[] }
type Manifest = { artifacts: Array<{ id: string; screens: string[] }> }

const manifest = JSON.parse(readFileSync(join(guideDir, "manifest.json"), "utf8")) as Manifest
const frames = JSON.parse(
  readFileSync(join(repoRoot, "scripts", "visual", "flows", "frames.json"), "utf8"),
) as { boards: Record<string, Board> }

const ids = manifest.artifacts.map((a) => a.id)

describe("frames das pranchas", () => {
  it("cobre exatamente as pranchas do manifesto", () => {
    expect(Object.keys(frames.boards).sort()).toEqual([...ids].sort())
  })

  it("dá a cada prancha um quadro por tela, dentro dos limites e sem sobreposição", () => {
    const problems: string[] = []
    for (const artifact of manifest.artifacts) {
      const board = frames.boards[artifact.id]
      if (!board) {
        problems.push(`${artifact.id}: sem frames`)
        continue
      }
      if (board.frames.length !== artifact.screens.length) {
        problems.push(
          `${artifact.id}: ${board.frames.length} quadros para ${artifact.screens.length} telas`,
        )
      }
      board.frames.forEach((frame, i) => {
        if (frame.x < 0 || frame.w <= 0 || frame.x + frame.w > 1.0001) {
          problems.push(`${artifact.id} quadro ${i + 1}: fora dos limites`)
        }
        if (frame.w < 0.05) problems.push(`${artifact.id} quadro ${i + 1}: estreito demais`)
        if (i > 0) {
          const previous = board.frames[i - 1]
          if (frame.x < previous.x + previous.w - 0.0005) {
            problems.push(`${artifact.id} quadro ${i + 1}: sobrepõe o anterior`)
          }
        }
      })
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("usa a largura inteira quando a prancha tem uma única tela", () => {
    const wrong = manifest.artifacts
      .filter((a) => a.screens.length === 1)
      .filter((a) => {
        const [frame] = frames.boards[a.id].frames
        return frame.x !== 0 || frame.w < 0.98
      })
      .map((a) => a.id)
    expect(wrong, `prancha de tela única não usa a largura inteira: ${wrong.join(", ")}`).toEqual(
      [],
    )
  })

  it("divide a prancha de duas telas no centro", () => {
    const off = manifest.artifacts
      .filter((a) => a.screens.length === 2)
      .filter((a) => {
        const [left, right] = frames.boards[a.id].frames
        return Math.abs(left.x + left.w - 0.5) > 0.02 || Math.abs(right.x - 0.5) > 0.02
      })
      .map((a) => a.id)
    expect(off, `prancha de duas telas fora do centro: ${off.join(", ")}`).toEqual([])
  })
})
