"use client"

// Editor de opções de enquete — pergunta vem no campo Conteúdo, as opções
// vivem aqui. Máximo de 10, duplicadas fora, Enter adiciona.

import { Button, Input } from "@heroui/react"
import { useCallback, useState } from "react"

interface PollEditorProps {
  options: string[]
  onOptionsChange: (options: string[]) => void
}

export function PollEditor({ options, onOptionsChange }: PollEditorProps) {
  const [draftOption, setDraftOption] = useState("")

  const addOption = useCallback(() => {
    const trimmed = draftOption.trim()
    if (trimmed && !options.includes(trimmed) && options.length < 10) {
      onOptionsChange([...options, trimmed])
      setDraftOption("")
    }
  }, [draftOption, options, onOptionsChange])

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <Input
          aria-label="Opção da enquete"
          placeholder="Adicionar opção"
          value={draftOption}
          onChange={(e) => setDraftOption((e.target as HTMLInputElement).value)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addOption()
            }
          }}
          className="flex-1"
        />
        <Button size="sm" variant="tertiary" onPress={addOption}>
          Adicionar
        </Button>
      </div>
      {options.length > 0 ? (
        <ul className="space-y-1">
          {options.map((opt) => (
            <li key={opt} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{opt}</span>
              <Button
                size="sm"
                variant="tertiary"
                aria-label={`Remover opção ${opt}`}
                onPress={() => onOptionsChange(options.filter((item) => item !== opt))}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
