// apps/mobile/app/(tabs)/community.tsx
//
// Container "Minha comunidade" (id `community`, rota canônica /community
// no web). Nesta fatia da S3 (golden slice nativa no mobile) entregamos
// apenas o read-only: feed da vila com estados loading/empty/error.
//
// Fora do escopo desta fatia (proxima S4 do mobile):
//   - Composer (criar publicacao)
//   - Reacao / comentario inline
//   - Pull-to-refresh (RefreshControl)
//   - Realtime (supabase.channel) para novos posts sem reload
//
// ADR-20260901-mobile-session (S2): a sessao e' persistida no
// Keychain/Keystore via expo-secure-store e hidratada no cold start
// via `hydrateSessionFromStorage()`. Sem essa hidratacao o cliente
// comeca sem sessao e o RLS em public.posts bloqueia o SELECT.
//
// DS-007 (nao ecoar dado sensivel): o feed mostra display_name
// (publico por design), conteudo (publico), contagem de likes.
// Nao expoe CPF, OM, endereco ou qualquer dado da tabela `private`.
//
// DS-015 (failure feedback supports recovery): o estado de erro
// mostra mensagem humana + botao "Tentar de novo" que reexecuta
// a query. Nao distingui "sem internet" de "expulso" etc. para nao
// vazar estado da conta (anti-enumeracao §4.3).
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { hydrateSessionFromStorage, supabase } from "../../src/auth/client"
import { theme } from "../../src/theme"

const VILA_AJURICABA_ID = "71000000-0000-4000-8000-000000000001"

interface PostRow {
  id: string
  content: string
  created_at: string
  user_id: string
  community_id: string | null
  locality_id: string | null
  group_id: string | null
  profiles: { display_name: string } | null
  reactions_count: { count: number }[] | null
}

interface FeedState {
  status: "loading" | "ready" | "empty" | "error"
  posts: PostRow[]
  errorMessage: string | null
}

async function loadVilaFeed(): Promise<FeedState> {
  // SELECT + embedded profiles (join) + reactions_count (sub-select
  // com PostgREST). Mantem o RLS happy: a sessao hidratada precisa
  // ter membership approved em VILA_AJURICABA; sem isso o SELECT
  // retorna [] mesmo se houver posts (RLS de SELECT bloqueia).
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, content, created_at, user_id, community_id, locality_id, group_id, profiles!posts_user_id_fkey(display_name), reactions_count:post_reactions(count)",
    )
    .eq("community_id", VILA_AJURICABA_ID)
    .is("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    return { status: "error", posts: [], errorMessage: error.message }
  }
  const rows = (data ?? []) as unknown as PostRow[]
  return rows.length === 0
    ? { status: "empty", posts: [], errorMessage: null }
    : { status: "ready", posts: rows, errorMessage: null }
}

export default function CommunityScreen() {
  const [state, setState] = useState<FeedState>({
    status: "loading",
    posts: [],
    errorMessage: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", errorMessage: null }))
    const next = await loadVilaFeed()
    setState(next)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const next = await loadVilaFeed()
    setState(next)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    // Hidrata a sessao do S2 antes do primeiro fetch — sem isso o
    // cliente supabase comeca sem token e o RLS bloqueia o SELECT.
    void (async () => {
      await hydrateSessionFromStorage()
      await load()
    })()
  }, [load])

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={state.posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={<FeedHeader status={state.status} />}
        ListEmptyComponent={<EmptyOrError state={state} onRetry={load} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.color.foreground}
          />
        }
        renderItem={({ item }) => <PostCard post={item} />}
      />
    </SafeAreaView>
  )
}

function FeedHeader({ status }: { status: FeedState["status"] }) {
  return (
    <View style={styles.header}>
      <Text style={styles.h1}>Minha comunidade</Text>
      <Text style={styles.lead}>Vila Ajuricaba — só para quem mora (ou morou)</Text>
      {status === "loading" && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.color.foreground} />
          <Text style={styles.loadingText}>Carregando feed…</Text>
        </View>
      )}
    </View>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

function PostCard({ post }: { post: PostRow }) {
  const reactions = post.reactions_count?.[0]?.count ?? 0
  const author = post.profiles?.display_name ?? "Membro"
  const time = formatRelativeTime(post.created_at)
  return (
    <Pressable
      accessibilityRole="text"
      accessibilityLabel={`${author} publicou ${time}: ${post.content}`}
      style={({ pressed }) => [styles.postCard, pressed && styles.postCardPressed]}
    >
      <View style={styles.postHeader}>
        <Text style={styles.postAuthor}>{author}</Text>
        <Text style={styles.postTime}>{time}</Text>
      </View>
      <Text style={styles.postBody} numberOfLines={6}>
        {post.content}
      </Text>
      <View style={styles.postFooter}>
        <Text style={styles.postMeta}>
          {reactions} {reactions === 1 ? "apoio" : "apoios"}
        </Text>
      </View>
    </Pressable>
  )
}

function EmptyOrError({ state, onRetry }: { state: FeedState; onRetry: () => void }) {
  if (state.status === "loading") {
    return null
  }
  if (state.status === "error") {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>Não foi possível carregar o feed.</Text>
        {state.errorMessage ? <Text style={styles.errorBody}>{state.errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tentar carregar o feed de novo"
          onPress={onRetry}
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        >
          <Text style={styles.retryButtonText}>Tentar de novo</Text>
        </Pressable>
      </View>
    )
  }
  if (state.status === "empty") {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Ninguém postou ainda.</Text>
        <Text style={styles.emptyBody}>Quando os vizinhos começarem a publicar, você vê aqui.</Text>
      </View>
    )
  }
  return null
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const diffMs = Date.now() - t
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "agora"
  const min = Math.floor(sec / 60)
  if (min < 60) return `há ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `há ${hr} h`
  const day = Math.floor(hr / 24)
  if (day < 30) return `há ${day} d`
  return new Date(t).toLocaleDateString("pt-BR")
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  scroll: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[6],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
    flexGrow: 1,
  },
  header: {
    gap: theme.space[2],
  },
  h1: {
    fontSize: theme.text.xl,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  lead: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[2],
  },
  loadingText: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
  },
  separator: {
    height: theme.space[3],
  },
  postCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.base,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space[4],
    gap: theme.space[2],
  },
  postCardPressed: {
    opacity: 0.85,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: theme.space[2],
  },
  postAuthor: {
    fontSize: theme.text.base,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  postTime: {
    fontSize: theme.text.xs,
    color: theme.color.muted,
  },
  postBody: {
    fontSize: theme.text.base,
    color: theme.color.foreground,
    lineHeight: 1.5,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: theme.space[2],
  },
  postMeta: {
    fontSize: theme.text.xs,
    color: theme.color.muted,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space[6],
    paddingVertical: theme.space[8],
    gap: theme.space[2],
  },
  emptyTitle: {
    fontSize: theme.text.base,
    fontWeight: "600",
    color: theme.color.foreground,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
    textAlign: "center",
    lineHeight: 1.5,
  },
  errorBox: {
    padding: theme.space[4],
    borderRadius: theme.radius.base,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.danger,
    gap: theme.space[2],
  },
  errorTitle: {
    fontSize: theme.text.base,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  errorBody: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
    lineHeight: 1.5,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.color.foreground,
    borderRadius: theme.radius.base,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonText: {
    color: theme.color.background,
    fontSize: theme.text.sm,
    fontWeight: "600",
  },
})
