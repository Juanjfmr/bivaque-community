import { describe, expect, it } from "vitest"
import {
  MANAUS_PHASES,
  phaseForDay,
  relativeDayLabel,
} from "../../../apps/web/app/(shell)/guide/manaus-guide-content"

describe("Manaus arrival guide timeline", () => {
  it("covers every day from D-60 through D+60 without gaps", () => {
    for (let day = -60; day <= 60; day += 1) {
      expect(phaseForDay(day), `day ${day} should belong to a phase`).not.toBeNull()
    }
  })

  it("keeps task ids unique so checklist persistence cannot collide", () => {
    const ids = MANAUS_PHASES.flatMap((phase) => phase.tasks.map((task) => task.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("formats the D-day labels used by the planner", () => {
    expect(relativeDayLabel(-60)).toBe("D-60")
    expect(relativeDayLabel(-1)).toBe("D-1")
    expect(relativeDayLabel(0)).toBe("D")
    expect(relativeDayLabel(1)).toBe("D+1")
    expect(relativeDayLabel(60)).toBe("D+60")
  })
})
