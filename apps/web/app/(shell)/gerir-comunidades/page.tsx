"use client"

import { useMemberContext } from "../../../lib/member-context"

export default function GerirComunidades() {
  const { communities, communitiesError } = useMemberContext()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Gerenciar comunidades</h1>
      {communitiesError ? (
        <p role="alert">
          Não foi possível carregar suas comunidades. Recarregue a página para tentar novamente.
        </p>
      ) : communities.length === 0 ? (
        <p>
          Você ainda não participa de comunidades.{" "}
          <a className="underline" href="/app/comunidade">
            Voltar à Comunidade
          </a>
        </p>
      ) : (
        <ul className="space-y-6">
          {communities.map((community) => (
            <li key={community.id} className="space-y-2">
              <h2 className="text-lg font-semibold">{community.name}</h2>
              <ul className="space-y-2">
                <li>
                  <a className="underline" href={`/communities/${community.id}/invite`}>
                    Convidar membros
                  </a>
                </li>
                <li>
                  <a className="underline" href={`/communities/${community.id}/indicar-prestador`}>
                    Indicar prestador
                  </a>
                </li>
                {community.canAdmin ? (
                  <li>
                    <a className="underline" href={`/communities/${community.id}/admin`}>
                      Administrar comunidade
                    </a>
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
