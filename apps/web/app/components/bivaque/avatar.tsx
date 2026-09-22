"use client"

// useState mora aqui desde d9f1a9e (fallback quando a URL do avatar 404),
// mas a diretiva faltava. Nada quebrava enquanto so Client Components
// importavam este arquivo; a RECON-005 passou a importa-lo de
// (shell)/profile/[userId]/page.tsx, que e Server Component, e o build parou.
// O gate nao roda build — foi o E2E que encontrou.
import { Avatar } from "@heroui/react"
import { useState } from "react"
import { type AvatarImageStatus, avatarFallbackVisible } from "../../api/avatar/avatar-fallback"

interface MemberAvatarProps {
  name: string | null | undefined
  size?: "sm" | "md" | "lg"
  src?: string | null
  className?: string
}

// Privacidade: nunca persistir nem transmitir foto real — o recuo sempre
// renderiza a inicial, entao a ausencia de foto vira "D.", nao um buraco.
//
// A origem vem de /api/avatar/[userId], que responde 404 quando a pessoa nao
// tem foto. O <Avatar.Image> do HeroUI v3 e o Radix por baixo: o Radix NAO
// renderiza o <img> enquanto o proprio pre-carregamento nao reporta "loaded".
// Num 404 o status vai direto para "error" e nenhum <img> chega ao DOM — por
// isso um onError nativo no <Avatar.Image> NUNCA dispara. O wrapper anterior
// limpava a origem nesse onError (RUN-022) e era codigo morto: a peca grande do
// perfil nao mostrava nem foto nem inicial (RECON-048, medido no DOM).
//
// O recuo, entao, nao depende de evento de erro nenhum: e montado sempre que a
// biblioteca nao confirmou o carregamento da foto. <Avatar.Image> e
// <Avatar.Fallback> como irmaos deixam o Radix revelar a inicial em "error" e
// esconde-la em "loaded". A forma redonda e a mesma das pecas pequenas — a base
// do HeroUI usa rounded-3xl, que so *parece* circulo quando o avatar e pequeno.
export function MemberAvatar({ name, size = "md", src, className }: MemberAvatarProps) {
  const initial = (name ?? "?").charAt(0).toUpperCase()
  const [status, setStatus] = useState<AvatarImageStatus>("idle")
  const classes = `rounded-full bg-[var(--semantic-selected)] text-[var(--semantic-text-primary)] ${className ?? ""}`
  return (
    <Avatar className={classes} size={size}>
      {src ? (
        <Avatar.Image
          src={src}
          alt={`Foto de ${name ?? "membro"}`}
          onLoadingStatusChange={setStatus}
        />
      ) : null}
      {avatarFallbackVisible(status) ? <Avatar.Fallback>{initial}</Avatar.Fallback> : null}
    </Avatar>
  )
}

export default MemberAvatar
