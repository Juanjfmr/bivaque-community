"use client"

import { Button, Modal, useOverlayState } from "@heroui/react"
import { Building2, LockKeyhole, MapPin, Search, UsersRound } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ModalCloseTrigger } from "../../components/bivaque/close-button"
import { ErrorState } from "../../components/bivaque/error-state"
import styles from "./groups-v42.module.css"

type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type MembershipRow = Database["public"]["Tables"]["group_memberships"]["Row"]
type CommunityRow = Pick<Database["public"]["Tables"]["communities"]["Row"], "id" | "name">
type GroupDirectoryRow = GroupRow & {
  communities: { name: string } | null
}
type GroupCardRow = GroupDirectoryRow & {
  memberCount: number | null
  postCount: number | null
}

type ScopeFilter = "all" | "city" | "communities" | "mine"

const PAGE_SIZE = 8

function safeSearchTerm(value: string) {
  return value.replace(/[%,()._*]/g, " ").replace(/\s+/g, " ").trim()
}

function membershipLabel(membership: MembershipRow | undefined) {
  if (!membership) return null
  if (membership.status === "pending") return "Pedido enviado"
  if (membership.role === "owner") return "Responsável"
  if (membership.role === "moderator") return "Moderação"
  return "Participando"
}

export default function GroupsPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const createModal = useOverlayState()

  const [userId, setUserId] = useState<string | null>(null)
  const [localityId, setLocalityId] = useState<string | null>(null)
  const [cityLabel, setCityLabel] = useState("sua cidade")
  const [memberships, setMemberships] = useState<MembershipRow[]>([])
  const [communities, setCommunities] = useState<CommunityRow[]>([])

  const [groups, setGroups] = useState<GroupCardRow[]>([])
  const [total, setTotal] = useState(0)
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [sort, setSort] = useState<"recent" | "name" | "oldest">("recent")
  const [page, setPage] = useState(1)
  const [queryDraft, setQueryDraft] = useState("")
  const [query, setQuery] = useState("")

  const [bootLoading, setBootLoading] = useState(true)
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createScope, setCreateScope] = useState("city")
  const [createVisibility, setCreateVisibility] = useState<"public" | "private">("public")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const membershipByGroup = useMemo(
    () => new Map(memberships.map((membership) => [membership.group_id, membership])),
    [memberships],
  )

  const loadIdentity = useCallback(async () => {
    setBootLoading(true)
    setError(null)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        setError("Você precisa entrar para acessar os grupos.")
        return
      }
      setUserId(user.id)

      const { data: localityMembership, error: localityMembershipError } = await supabase
        .from("locality_memberships")
        .select("locality_id")
        .eq("user_id", user.id)
        .eq("kind", "current")
        .maybeSingle()

      if (localityMembershipError) throw localityMembershipError
      if (!localityMembership) {
        setError("Defina sua cidade atual para acessar os grupos.")
        return
      }

      const currentLocalityId = localityMembership.locality_id
      setLocalityId(currentLocalityId)

      const [
        { data: locality, error: localityError },
        { data: groupMemberships, error: membershipsError },
        { data: communityMemberships, error: communityMembershipsError },
      ] = await Promise.all([
        supabase
          .from("localities")
          .select("city_name, state_code")
          .eq("id", currentLocalityId)
          .maybeSingle(),
        supabase.from("group_memberships").select("*").eq("user_id", user.id),
        supabase
          .from("community_memberships")
          .select("community_id")
          .eq("user_id", user.id)
          .eq("status", "approved"),
      ])

      if (localityError) throw localityError
      if (membershipsError) throw membershipsError
      if (communityMembershipsError) throw communityMembershipsError

      if (locality) {
        setCityLabel(`${locality.city_name} · ${locality.state_code}`)
      }
      setMemberships((groupMemberships as MembershipRow[] | null) ?? [])

      const communityIds = (communityMemberships ?? []).map((item) => item.community_id)
      if (communityIds.length === 0) {
        setCommunities([])
      } else {
        const { data: communityRows, error: communitiesError } = await supabase
          .from("communities")
          .select("id, name")
          .in("id", communityIds)
          .eq("locality_id", currentLocalityId)
          .eq("is_deleted", false)
          .order("name")
        if (communitiesError) throw communitiesError
        setCommunities((communityRows as CommunityRow[] | null) ?? [])
      }
    } catch (cause) {
      console.error("[groups] identity load failed", cause)
      setError("Não foi possível carregar seus grupos. Tente novamente.")
    } finally {
      setBootLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadIdentity()
  }, [loadIdentity])

  const loadDirectory = useCallback(async () => {
    if (!localityId || !userId) return
    setDirectoryLoading(true)
    setError(null)

    try {
      const approvedIds = memberships
        .filter((membership) => membership.status === "approved")
        .map((membership) => membership.group_id)

      if (scope === "mine" && approvedIds.length === 0) {
        setGroups([])
        setTotal(0)
        return
      }

      let request = supabase
        .from("groups")
        .select(
          "id, name, description, visibility, locality_id, community_id, created_by, owner_user_id, created_at, is_deleted, communities(name)",
          { count: "exact" },
        )
        .eq("locality_id", localityId)
        .eq("is_deleted", false)

      if (scope === "city") request = request.is("community_id", null)
      if (scope === "communities") request = request.not("community_id", "is", null)
      if (scope === "mine") request = request.in("id", approvedIds)

      const normalizedQuery = safeSearchTerm(query)
      if (normalizedQuery) {
        request = request.or(
          `name.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%`,
        )
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const orderedRequest =
        sort === "name"
          ? request.order("name", { ascending: true })
          : request.order("created_at", { ascending: sort === "oldest" })
      const { data, count, error: directoryError } = await orderedRequest.range(from, to)

      if (directoryError) throw directoryError
      const rows = (data ?? []) as unknown as GroupDirectoryRow[]

      const withCounts = await Promise.all(
        rows.map(async (group): Promise<GroupCardRow> => {
          const [membersResult, postsResult] = await Promise.all([
            supabase
              .from("group_memberships")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id)
              .eq("status", "approved"),
            supabase
              .from("posts")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id)
              .eq("is_deleted", false),
          ])

          return {
            ...group,
            memberCount: membersResult.error ? null : membersResult.count,
            postCount: postsResult.error ? null : postsResult.count,
          }
        }),
      )

      setGroups(withCounts)
      setTotal(count ?? 0)
    } catch (cause) {
      console.error("[groups] directory load failed", cause)
      setGroups([])
      setTotal(0)
      setError("Não foi possível carregar o diretório de grupos. Tente novamente.")
    } finally {
      setDirectoryLoading(false)
    }
  }, [localityId, memberships, page, query, scope, sort, supabase, userId])

  useEffect(() => {
    if (!bootLoading) void loadDirectory()
  }, [bootLoading, loadDirectory])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery(queryDraft.trim())
  }

  function selectScope(nextScope: ScopeFilter) {
    setScope(nextScope)
    setPage(1)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!localityId) return

    setCreating(true)
    setCreateError("")
    try {
      const trimmedName = createName.trim()
      const trimmedDescription = createDescription.trim()
      if (!trimmedName) {
        setCreateError("Informe o nome do grupo.")
        return
      }

      const result =
        createScope === "city"
          ? await supabase.rpc("create_group", {
              p_name: trimmedName,
              p_description: trimmedDescription,
              p_visibility: createVisibility,
              p_locality_id: localityId,
            })
          : await supabase.rpc("create_group_in_community", {
              p_name: trimmedName,
              p_description: trimmedDescription,
              p_visibility: createVisibility,
              p_community_id: createScope,
            })

      if (result.error) throw result.error

      setCreateName("")
      setCreateDescription("")
      setCreateScope("city")
      setCreateVisibility("public")
      createModal.close()
      setPage(1)
      await loadIdentity()
    } catch (cause) {
      console.error("[groups] create failed", cause)
      setCreateError("Não foi possível criar o grupo. Confira os dados e tente novamente.")
    } finally {
      setCreating(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endItem = Math.min(page * PAGE_SIZE, total)

  return (
    <main className={styles.directory}>
      <header className={styles.hero}>
        <div>
          <h1>Grupos</h1>
          <p>Encontre pessoas da cidade e das comunidades das quais você participa.</p>
        </div>
        <div className={styles.heroActions}>
          <Button variant="primary" onPress={createModal.open}>
            Criar grupo
          </Button>
          <Link href={"/communities" as Route} className={styles.filterButton}>
            Ver comunidades
          </Link>
        </div>
      </header>

      <search aria-label="Buscar grupos">\n        <form className={styles.searchForm} onSubmit={handleSearch}>
        <Search aria-hidden="true" />
        <input
          type="search"
          value={queryDraft}
          onChange={(event) => setQueryDraft(event.target.value)}
          placeholder="Buscar grupos por nome ou assunto"
          aria-label="Buscar grupos por nome ou assunto"
        />
        <Button type="submit" size="sm" variant="primary">
          Buscar
        </Button>
      </form>

      <nav className={styles.filterRow} aria-label="Filtrar grupos">
        {([
          ["all", "Todos"],
          ["city", "Da cidade"],
          ["communities", "Das comunidades"],
          ["mine", "Meus grupos"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`${styles.filterButton} ${scope === key ? styles.filterActive : ""}`}
            aria-pressed={scope === key}
            onClick={() => selectScope(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {error ? <ErrorState message={error} onRetry={() => void loadIdentity()} /> : null}

      <div className={styles.summary} aria-live="polite">
        <span>
          {directoryLoading || bootLoading
            ? "Carregando grupos…"
            : total === 0
              ? "Nenhum grupo"
              : `${startItem}–${endItem} de ${total} grupos`}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span>{cityLabel}</span>
          <label className="sr-only" htmlFor="groups-sort">
            Ordenar grupos
          </label>
          <select
            id="groups-sort"
            className={styles.sort}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as "recent" | "name" | "oldest")
              setPage(1)
            }}
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome A–Z</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </div>
      </div>

      {bootLoading || directoryLoading ? (
        <div className={styles.stack} role="status" aria-busy="true" aria-label="Carregando grupos">
          {[0, 1, 2].map((item) => (
            <div key={item} className={styles.groupRow}>
              <div className={styles.groupVisual} />
              <div className={styles.groupBody}>
                <div className="h-3 w-24 animate-pulse rounded bg-default-200" />
                <div className="mt-3 h-5 w-52 animate-pulse rounded bg-default-200" />
                <div className="mt-3 h-3 w-full max-w-xl animate-pulse rounded bg-default-100" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <section className={styles.empty}>
          <h2>{query ? "Nenhum grupo encontrado" : "Ainda não há grupos neste recorte"}</h2>
          <p>
            {query
              ? "Tente outro termo ou amplie os filtros."
              : scope === "mine"
                ? "Entre em um grupo para encontrá-lo rapidamente aqui."
                : "Você pode criar um grupo para reunir pessoas em torno de um assunto comum."}
          </p>
        </section>
      ) : (
        <div className={styles.stack}>
          {groups.map((group) => {
            const membership = membershipByGroup.get(group.id)
            const scopeName = group.community_id
              ? group.communities?.name ?? "Comunidade"
              : cityLabel
            const stateLabel = membershipLabel(membership)

            return (
              <article key={group.id} className={styles.groupRow}>
                <div className={styles.groupVisual} aria-hidden="true">
                  {group.community_id ? <Building2 /> : <UsersRound />}
                </div>

                <div className={styles.groupBody}>
                  <div className={styles.badges}>
                    <span
                      className={`${styles.badge} ${
                        group.visibility === "private" ? styles.badgePrivate : ""
                      }`}
                    >
                      {group.visibility === "private" ? (
                        <>
                          <LockKeyhole size={13} aria-hidden="true" /> Privado
                        </>
                      ) : group.community_id ? (
                        "Público na comunidade"
                      ) : (
                        "Público na cidade"
                      )}
                    </span>
                    {stateLabel ? (
                      <span
                        className={`${styles.badge} ${
                          membership?.status === "pending"
                            ? styles.badgePending
                            : styles.badgeMember
                        }`}
                      >
                        {stateLabel}
                      </span>
                    ) : null}
                  </div>

                  <h2>{group.name}</h2>
                  {group.description ? <p>{group.description}</p> : null}

                  <div className={styles.groupMeta}>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} aria-hidden="true" />
                      {scopeName}
                    </span>
                    {group.memberCount !== null ? <span>{group.memberCount} participantes</span> : null}
                    {group.postCount !== null ? <span>{group.postCount} conversas</span> : null}
                  </div>
                </div>

                <Link
                  href={`/groups/${group.id}` as Route}
                  className={`${styles.filterButton} ${styles.groupAction}`}
                >
                  {membership?.status === "approved" ? "Abrir" : "Conhecer"}
                </Link>
              </article>
            )
          })}
        </div>
      )}

      {!bootLoading && !directoryLoading && totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Paginação de grupos">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className={styles.pageActions}>
            <Button
              variant="secondary"
              isDisabled={page <= 1}
              onPress={() => setPage((value) => Math.max(1, value - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              isDisabled={page >= totalPages}
              onPress={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Próxima
            </Button>
          </div>
        </nav>
      ) : null}

      <Modal state={createModal}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <div>
                  <Modal.Heading>Criar grupo</Modal.Heading>
                  <p className="mt-1 text-sm text-muted">Escolha a audiência e as regras de entrada.</p>
                </div>
                <ModalCloseTrigger />
              </Modal.Header>
              <form onSubmit={handleCreate}>
                <Modal.Body>
                  <div className={styles.modalFields}>
                    <div className={styles.field}>
                      <label htmlFor="group-name">Nome do grupo</label>
                      <input
                        id="group-name"
                        value={createName}
                        onChange={(event) => setCreateName(event.target.value)}
                        maxLength={80}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="group-description">Descrição</label>
                      <textarea
                        id="group-description"
                        value={createDescription}
                        onChange={(event) => setCreateDescription(event.target.value)}
                        placeholder="Explique o assunto e para quem este grupo é útil."
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="group-scope">Onde este grupo vive</label>
                      <select
                        id="group-scope"
                        value={createScope}
                        onChange={(event) => setCreateScope(event.target.value)}
                      >
                        <option value="city">Cidade · {cityLabel}</option>
                        {communities.map((community) => (
                          <option key={community.id} value={community.id}>
                            Comunidade · {community.name}
                          </option>
                        ))}
                      </select>
                      <span className={styles.fieldHint}>
                        Um grupo pode pertencer à cidade ou a uma comunidade específica.
                      </span>
                    </div>

                    <fieldset className={styles.field}>
                      <legend>Participação</legend>
                      <label className="flex min-h-11 items-start gap-3 font-normal">
                        <input
                          type="radio"
                          name="group-visibility"
                          value="public"
                          checked={createVisibility === "public"}
                          onChange={() => setCreateVisibility("public")}
                          className="mt-1 h-5 w-5 accent-[var(--ui-brand)]"
                        />
                        <span>
                          <strong className="block text-sm">Público neste contexto</strong>
                          <span className={styles.fieldHint}>
                            Pessoas elegíveis no destino entram diretamente.
                          </span>
                        </span>
                      </label>
                      <label className="flex min-h-11 items-start gap-3 font-normal">
                        <input
                          type="radio"
                          name="group-visibility"
                          value="private"
                          checked={createVisibility === "private"}
                          onChange={() => setCreateVisibility("private")}
                          className="mt-1 h-5 w-5 accent-[var(--ui-brand)]"
                        />
                        <span>
                          <strong className="block text-sm">Privado</strong>
                          <span className={styles.fieldHint}>
                            A entrada depende de aprovação.
                          </span>
                        </span>
                      </label>
                    </fieldset>

                    {createError ? (
                      <p role="alert" className="text-sm font-semibold text-danger">
                        {createError}
                      </p>
                    ) : null}
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="tertiary" onPress={createModal.close}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={creating}>
                    {creating ? "Criando…" : "Criar grupo"}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </main>
  )
}
