"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Form, Input, TextArea } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../lib/supabase/client"
import { ReportButton } from "../components/bivaque/report-button"

type GroupRow = {
  id: string
  name: string
  description: string | null
  visibility: "public" | "private"
  locality_id: string
  created_by: string
  owner_user_id: string
  created_at: string
}

type MembershipRow = {
  group_id: string
  user_id: string
  role: "member" | "moderator" | "owner"
  status: "pending" | "approved"
  joined_at: string
}

export default function GroupsPage() {
  const supabase = createBrowserClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [profileLocalityId, setProfileLocalityId] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [memberships, setMemberships] = useState<MembershipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createVisibility, setCreateVisibility] = useState<"public" | "private">("public")
  const [creating, setCreating] = useState(false)

  // Selected group for moderation
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<MembershipRow[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        setError("Você precisa entrar para acessar os grupos.")
        setLoading(false)
        return
      }
      setUserId(authData.user.id)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("locality_id")
        .eq("user_id", authData.user.id)
        .single()

      if (!profileData) {
        setError("Você precisa ter um perfil para acessar os grupos.")
        setLoading(false)
        return
      }
      const localityId = (profileData as { locality_id: string }).locality_id
      if (!localityId) {
        setError("Perfil sem localidade associada.")
        setLoading(false)
        return
      }
      setProfileLocalityId(localityId)

      const { data: groupsData } = await supabase
        .from("groups")
        .select("*")
        .eq("locality_id", localityId)
        .order("created_at", { ascending: false })

      const { data: membershipsData } = await supabase
        .from("group_memberships")
        .select("*")
        .eq("user_id", authData.user.id)

      setGroups((groupsData as GroupRow[] | null) ?? [])
      setMemberships((membershipsData as MembershipRow[] | null) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getMembership = (groupId: string) => memberships.find((m) => m.group_id === groupId)

  const canModerate = (membership: MembershipRow | undefined) =>
    membership?.role === "owner" || membership?.role === "moderator"

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileLocalityId) return
    setCreating(true)
    setError(null)

    try {
      const args = {
        p_name: createName,
        p_visibility: createVisibility,
        p_locality_id: profileLocalityId,
        ...(createDescription ? { p_description: createDescription } : {}),
      }
      const { error: rpcError } = await supabase.rpc("create_group", args)
      if (rpcError) throw new Error(rpcError.message)

      setCreateName("")
      setCreateDescription("")
      setCreateVisibility("public")
      setShowCreate(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar grupo.")
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (groupId: string) => {
    setActionLoading(groupId)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc("join_group", {
        p_group_id: groupId,
      })
      if (rpcError) throw new Error(rpcError.message)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar no grupo.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleLeave = async (groupId: string) => {
    setActionLoading(groupId)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from("group_memberships")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId ?? "")

      if (deleteError) throw new Error(deleteError.message)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sair do grupo.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = async (groupId: string, targetUserId: string) => {
    setActionLoading(groupId)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc("approve_group_member", {
        p_group_id: groupId,
        p_user_id: targetUserId,
      })
      if (rpcError) throw new Error(rpcError.message)
      await loadGroupMembers(groupId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar membro.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddModerator = async (groupId: string, targetUserId: string) => {
    setActionLoading(groupId)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc("add_group_moderator", {
        p_group_id: groupId,
        p_user_id: targetUserId,
      })
      if (rpcError) throw new Error(rpcError.message)
      await loadGroupMembers(groupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar moderador.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveModerator = async (groupId: string, targetUserId: string) => {
    setActionLoading(groupId)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc("remove_group_moderator", {
        p_group_id: groupId,
        p_user_id: targetUserId,
      })
      if (rpcError) throw new Error(rpcError.message)
      await loadGroupMembers(groupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover moderador.")
    } finally {
      setActionLoading(null)
    }
  }

  const loadGroupMembers = async (groupId: string) => {
    const { data } = await supabase.from("group_memberships").select("*").eq("group_id", groupId)
    setSelectedGroupMembers((data as MembershipRow[] | null) ?? [])
  }

  const handleSelectGroup = (groupId: string) => {
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null)
      setSelectedGroupMembers([])
      return
    }
    setSelectedGroupId(groupId)
    loadGroupMembers(groupId)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-12">
      <section className="flex flex-col gap-2" aria-labelledby="groups-heading">
        <h1 id="groups-heading" className="text-2xl font-semibold tracking-tight">
          {brandTokens.productName}
        </h1>
        <p className="text-sm text-muted">Grupos da sua comunidade.</p>
      </section>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {profileLocalityId && !showCreate && (
        <Button variant="primary" className="self-start" onPress={() => setShowCreate(true)}>
          Criar grupo
        </Button>
      )}

      {showCreate && profileLocalityId && (
        <Form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 rounded-lg border border-border p-4"
        >
          <h2 className="text-base font-semibold">Novo grupo</h2>

          <Input
            type="text"
            aria-label="Nome do grupo"
            placeholder="Nome do grupo"
            value={createName}
            onChange={(e) => setCreateName((e.target as HTMLInputElement).value)}
            required
          />

          <TextArea
            aria-label="Descrição"
            placeholder="Descrição (opcional)"
            value={createDescription}
            onChange={(e) => setCreateDescription((e.target as HTMLTextAreaElement).value)}
          />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Visibilidade</p>
            <div className="flex gap-2">
              <Button
                variant={createVisibility === "public" ? "primary" : "tertiary"}
                size="sm"
                onPress={() => setCreateVisibility("public")}
                isDisabled={creating}
              >
                Público
              </Button>
              <Button
                variant={createVisibility === "private" ? "primary" : "tertiary"}
                size="sm"
                onPress={() => setCreateVisibility("private")}
                isDisabled={creating}
              >
                Privado
              </Button>
            </div>
            <p className="text-xs text-muted">
              {createVisibility === "public"
                ? "Qualquer membro da comunidade pode entrar."
                : "Novos membros precisam de aprovação."}
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" isDisabled={creating || !createName}>
              {creating ? "Criando..." : "Criar"}
            </Button>
            <Button variant="tertiary" onPress={() => setShowCreate(false)} isDisabled={creating}>
              Cancelar
            </Button>
          </div>
        </Form>
      )}

      {groups.length === 0 && !showCreate && (
        <p className="text-sm text-muted">Nenhum grupo na sua comunidade ainda.</p>
      )}

      <div className="flex flex-col gap-4">
        {groups.map((group) => {
          const membership = getMembership(group.id)
          const isModerator = canModerate(membership)
          const isSelected = selectedGroupId === group.id

          return (
            <div key={group.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{group.name}</h3>
                    <span className="rounded-full bg-[color-mix(in_oklch,var(--foreground)_8%,transparent)] px-2 py-0.5 text-xs text-muted">
                      {group.visibility === "public" ? "Público" : "Privado"}
                    </span>
                    <ReportButton targetType="group" targetId={group.id} label="Denunciar" />
                  </div>
                  {group.description && <p className="text-sm text-muted">{group.description}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!membership && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => handleJoin(group.id)}
                      isDisabled={actionLoading === group.id}
                    >
                      {group.visibility === "public" ? "Entrar" : "Solicitar"}
                    </Button>
                  )}

                  {membership?.status === "pending" && (
                    <span className="rounded-full bg-[color-mix(in_oklch,var(--foreground)_8%,transparent)] px-2 py-0.5 text-xs text-muted">
                      Aguardando aprovação
                    </span>
                  )}

                  {membership?.status === "approved" && membership.role !== "owner" && (
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => handleLeave(group.id)}
                      isDisabled={actionLoading === group.id}
                    >
                      Sair
                    </Button>
                  )}

                  {membership?.role === "owner" && (
                    <span className="rounded-full bg-[color-mix(in_oklch,var(--foreground)_8%,transparent)] px-2 py-0.5 text-xs text-muted">
                      Proprietário
                    </span>
                  )}

                  {isModerator && (
                    <Button
                      variant={isSelected ? "primary" : "tertiary"}
                      size="sm"
                      onPress={() => handleSelectGroup(group.id)}
                      isDisabled={actionLoading === group.id}
                    >
                      {isSelected ? "Fechar" : "Gerenciar"}
                    </Button>
                  )}
                </div>
              </div>

              {isSelected && isModerator && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <h4 className="text-sm font-semibold">Membros</h4>
                  {selectedGroupMembers.length === 0 && (
                    <p className="text-xs text-muted">Nenhum membro encontrado.</p>
                  )}
                  {selectedGroupMembers.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{m.user_id === userId ? "Você" : m.user_id.slice(0, 8)}</span>
                        <span className="text-xs text-muted">
                          {m.role}
                          {m.status === "pending" ? " · pendente" : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {m.status === "pending" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onPress={() => handleApprove(group.id, m.user_id)}
                            isDisabled={actionLoading === group.id}
                          >
                            Aprovar
                          </Button>
                        )}

                        {m.status === "approved" && m.role === "member" && (
                          <Button
                            variant="tertiary"
                            size="sm"
                            onPress={() => handleAddModerator(group.id, m.user_id)}
                            isDisabled={actionLoading === group.id}
                          >
                            Promover
                          </Button>
                        )}

                        {m.role === "moderator" && (
                          <Button
                            variant="tertiary"
                            size="sm"
                            onPress={() => handleRemoveModerator(group.id, m.user_id)}
                            isDisabled={actionLoading === group.id}
                          >
                            Rebaixar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
