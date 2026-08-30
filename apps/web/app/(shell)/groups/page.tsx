"use client"

import { Button, Chip, Form, Input, Radio, RadioGroup, SearchField, TextArea } from "@heroui/react"
import type { SVGProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { GroupsIllustration } from "../../components/bivaque/illustrations"
import { ReportButton } from "../../components/bivaque/report-button"
import { GroupCardSkeleton, Skeleton } from "../../components/bivaque/skeleton"

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

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function safeErrorMessage(action: string): string {
  return `Não foi possível ${action}. Tente novamente.`
}

function OnboardingBlock({ groupName, onDismiss }: { groupName: string; onDismiss: () => void }) {
  return (
    <div
      className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-5"
      role="alert"
      aria-label="Mensagem de boas-vindas ao grupo"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-amber-900">Bem-vindo ao grupo!</h3>
          <p className="mt-0.5 text-sm text-amber-700">
            Comece sua jornada no <strong>&ldquo;{groupName}&rdquo;</strong>.
          </p>
        </div>
        <Button
          variant="tertiary"
          size="sm"
          onPress={onDismiss}
          aria-label="Fechar mensagem de boas-vindas"
          className="shrink-0 text-amber-700 hover:text-amber-900"
        >
          <CloseIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-white p-4 transition-shadow hover:shadow-sm">
          <span aria-hidden="true" className="text-2xl">
            &#128075;
          </span>
          <h4 className="mt-2 text-sm font-semibold text-foreground">Cumprimente-se</h4>
          <p className="mt-0.5 text-xs text-muted">Apresente-se aos membros do grupo.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white p-4 transition-shadow hover:shadow-sm">
          <span aria-hidden="true" className="text-2xl">
            &#128226;
          </span>
          <h4 className="mt-2 text-sm font-semibold text-foreground">Compartilhe</h4>
          <p className="mt-0.5 text-xs text-muted">Publique sua primeira mensagem.</p>
        </div>
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const supabase = createBrowserClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [profileLocalityId, setProfileLocalityId] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [memberships, setMemberships] = useState<MembershipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [recentlyJoinedGroupId, setRecentlyJoinedGroupId] = useState<string | null>(null)

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

      const { data: membershipData } = await supabase
        .from("locality_memberships")
        .select("locality_id")
        .eq("user_id", authData.user.id)
        .limit(1)
        .maybeSingle()

      if (!membershipData) {
        setError("Você ainda não pertence a uma localidade.")
        setLoading(false)
        return
      }
      const localityId = membershipData.locality_id
      setProfileLocalityId(localityId)

      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .eq("locality_id", localityId)
        .order("created_at", { ascending: false })

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("group_memberships")
        .select("*")
        .eq("user_id", authData.user.id)

      if (groupsError || membershipsError) {
        if (groupsError) console.error("[groups] groups query failed:", groupsError)
        if (membershipsError)
          console.error("[groups] group_memberships query failed:", membershipsError)
        setError(safeErrorMessage("carregar os grupos"))
        setGroups([])
        setMemberships([])
        return
      }

      setGroups((groupsData as GroupRow[] | null) ?? [])
      setMemberships((membershipsData as MembershipRow[] | null) ?? [])
    } catch (err) {
      console.error("[groups] loadData unexpected error:", err)
      setError(safeErrorMessage("carregar os grupos"))
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

    const args = {
      p_name: createName,
      p_visibility: createVisibility,
      p_locality_id: profileLocalityId,
      ...(createDescription ? { p_description: createDescription } : {}),
    }
    const { error: rpcError } = await supabase.rpc("create_group", args)
    if (rpcError) {
      console.error("[groups] create_group failed:", rpcError)
      setError(safeErrorMessage("criar o grupo"))
      setCreating(false)
      return
    }

    setCreateName("")
    setCreateDescription("")
    setCreateVisibility("public")
    setShowCreate(false)
    await loadData()
    setCreating(false)
  }

  const handleJoin = async (groupId: string) => {
    setActionLoading(groupId)
    setError(null)

    const { error: rpcError } = await supabase.rpc("join_group", {
      p_group_id: groupId,
    })
    if (rpcError) {
      console.error("[groups] join_group failed:", rpcError)
      setError(safeErrorMessage("entrar no grupo"))
      setActionLoading(null)
      return
    }
    setRecentlyJoinedGroupId(groupId)
    await loadData()
    setActionLoading(null)
  }

  const handleLeave = async (groupId: string) => {
    setActionLoading(groupId)
    setError(null)

    const { error: deleteError } = await supabase
      .from("group_memberships")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId ?? "")

    if (deleteError) {
      console.error("[groups] group_memberships delete failed:", deleteError)
      setError(safeErrorMessage("sair do grupo"))
      setActionLoading(null)
      return
    }
    await loadData()
    setActionLoading(null)
  }

  const handleApprove = async (groupId: string, targetUserId: string) => {
    setActionLoading(groupId)
    setError(null)

    const { error: rpcError } = await supabase.rpc("approve_group_member", {
      p_group_id: groupId,
      p_user_id: targetUserId,
    })
    if (rpcError) {
      console.error("[groups] approve_group_member failed:", rpcError)
      setError(safeErrorMessage("aprovar o membro"))
      setActionLoading(null)
      return
    }
    await loadGroupMembers(groupId)
    await loadData()
    setActionLoading(null)
  }

  const handleAddModerator = async (groupId: string, targetUserId: string) => {
    setActionLoading(groupId)
    setError(null)

    const { error: rpcError } = await supabase.rpc("add_group_moderator", {
      p_group_id: groupId,
      p_user_id: targetUserId,
    })
    if (rpcError) {
      console.error("[groups] add_group_moderator failed:", rpcError)
      setError(safeErrorMessage("adicionar o moderador"))
      setActionLoading(null)
      return
    }
    await loadGroupMembers(groupId)
    setActionLoading(null)
  }

  const handleRemoveModerator = async (groupId: string, targetUserId: string) => {
    setActionLoading(groupId)
    setError(null)

    const { error: rpcError } = await supabase.rpc("remove_group_moderator", {
      p_group_id: groupId,
      p_user_id: targetUserId,
    })
    if (rpcError) {
      console.error("[groups] remove_group_moderator failed:", rpcError)
      setError(safeErrorMessage("remover o moderador"))
      setActionLoading(null)
      return
    }
    await loadGroupMembers(groupId)
    setActionLoading(null)
  }

  const loadGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from("group_memberships")
      .select("*")
      .eq("group_id", groupId)
    if (error) {
      console.error("[groups] loadGroupMembers failed:", error)
      setError(safeErrorMessage("carregar os membros"))
      setSelectedGroupMembers([])
      return
    }
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

  // Derived data: search filtering, section splitting, recently joined detection
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups
    const q = searchQuery.toLowerCase().trim()
    return groups.filter((g) => g.name.toLowerCase().includes(q))
  }, [groups, searchQuery])

  const { myGroups, nearbyGroups, hasApprovedMemberships } = useMemo(() => {
    const approvedMemberIds = new Set(
      memberships.filter((m) => m.status === "approved").map((m) => m.group_id),
    )
    const my = filteredGroups.filter((g) => approvedMemberIds.has(g.id))
    const nearby = filteredGroups.filter((g) => !approvedMemberIds.has(g.id))
    return {
      myGroups: my,
      nearbyGroups: nearby,
      hasApprovedMemberships: memberships.some((m) => m.status === "approved"),
    }
  }, [filteredGroups, memberships])

  const recentlyJoinedGroup = useMemo(() => {
    if (!recentlyJoinedGroupId) return null
    const membership = memberships.find((m) => m.group_id === recentlyJoinedGroupId)
    if (membership?.status !== "approved") return null
    return groups.find((g) => g.id === recentlyJoinedGroupId) ?? null
  }, [recentlyJoinedGroupId, groups, memberships])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-8 px-6 py-12">
        <section className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </section>
        <div className="paper ruled overflow-hidden" aria-busy="true">
          <GroupCardSkeleton />
          <GroupCardSkeleton />
          <GroupCardSkeleton />
        </div>
      </div>
    )
  }

  const renderGroupCard = (group: GroupRow) => {
    const membership = getMembership(group.id)
    const isModerator = canModerate(membership)
    const isSelected = selectedGroupId === group.id

    return (
      <div key={group.id} className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{group.name}</h3>
              <Chip size="sm" variant="soft">
                {group.visibility === "public" ? "Público" : "Privado"}
              </Chip>
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
              <Chip size="sm" variant="soft">
                Aguardando aprovação
              </Chip>
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
              <Chip size="sm" variant="soft">
                Proprietário
              </Chip>
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
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-12">
      <section className="flex flex-col gap-2" aria-labelledby="groups-heading">
        <h1 id="groups-heading" className="text-2xl font-semibold tracking-tight">
          Grupos
        </h1>
        <p className="text-sm text-muted">Grupos da sua comunidade.</p>
      </section>

      <SearchField
        aria-label="Buscar grupos"
        value={searchQuery}
        onChange={(value) => setSearchQuery(value)}
        onClear={() => setSearchQuery("")}
        className="max-w-md"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Buscar grupos..." className="transition-colors" />
          {searchQuery ? <SearchField.ClearButton /> : null}
        </SearchField.Group>
      </SearchField>

      {error && <ErrorState message={error} onRetry={() => loadData()} />}

      {recentlyJoinedGroup && (
        <OnboardingBlock
          groupName={recentlyJoinedGroup.name}
          onDismiss={() => setRecentlyJoinedGroupId(null)}
        />
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

          <RadioGroup
            aria-label="Visibilidade do grupo"
            value={createVisibility}
            onChange={(value) => setCreateVisibility(value as "public" | "private")}
            isDisabled={creating}
            orientation="vertical"
          >
            <Radio value="public">
              <div className="flex flex-col gap-0.5">
                <span>Público</span>
                <span className="text-xs text-muted">
                  Qualquer membro da comunidade pode entrar.
                </span>
              </div>
            </Radio>
            <Radio value="private">
              <div className="flex flex-col gap-0.5">
                <span>Privado</span>
                <span className="text-xs text-muted">Novos membros precisam de aprovação.</span>
              </div>
            </Radio>
          </RadioGroup>

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

      {!error && groups.length === 0 && !showCreate ? (
        <EmptyState
          headingLevel={3}
          title="Nenhum grupo ainda"
          description="Crie ou entre em um grupo para se conectar com outros membros da sua comunidade."
          illustration={<GroupsIllustration />}
          action={
            <Button variant="primary" size="sm" onPress={() => setShowCreate(true)}>
              Criar grupo
            </Button>
          }
        />
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted">
            Nenhum grupo encontrado para <strong>&ldquo;{searchQuery}&rdquo;</strong>.
          </p>
          <Button variant="tertiary" size="sm" onPress={() => setSearchQuery("")}>
            Limpar busca
          </Button>
        </div>
      ) : (
        <>
          {hasApprovedMemberships && (
            <section className="flex flex-col gap-3" aria-labelledby="my-groups-heading">
              <h2 id="my-groups-heading" className="text-lg font-semibold tracking-tight">
                Seus grupos
              </h2>
              {myGroups.length === 0 ? (
                <p className="text-sm text-muted">Nenhum grupo seu corresponde à busca.</p>
              ) : (
                <div className="paper ruled overflow-hidden">{myGroups.map(renderGroupCard)}</div>
              )}
            </section>
          )}

          <section className="flex flex-col gap-3" aria-labelledby="nearby-groups-heading">
            <h2 id="nearby-groups-heading" className="text-lg font-semibold tracking-tight">
              Grupos próximos de você
            </h2>
            {nearbyGroups.length === 0 ? (
              <p className="text-sm text-muted">Nenhum grupo próximo corresponde à busca.</p>
            ) : (
              <div className="paper ruled overflow-hidden">{nearbyGroups.map(renderGroupCard)}</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
