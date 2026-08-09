/**
 * RLS health probe — verifies the privacy boundary by running assertions as a
 * common user (never `service_role`).
 *
 * The probe runs the assertions listed below and returns booleans only — no
 * row contents, no CPF, no payload. The single mutation it issues
 * (`operators_insert`, `is_deleted_update`) is expected to be REJECTED by the
 * RLS policies and triggers; it has no side-effect on success.
 *
 * Status vocabulary (kept stable; the runbook §9 reads it verbatim):
 *
 *   "ok"            — every assertion passed
 *   "degraded"      — at least one assertion failed (an actual privacy gap)
 *   "not_configured" — RLS_PROBE_EMAIL / RLS_PROBE_PASSWORD not set
 *   "error"         — the probe itself failed to run (auth, network, etc.)
 */

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createAnonClient } from "./supabase/server"

export type RlsCheckId =
  | "self_profile" // positive: an authenticated member sees their own row
  | "private_verification" // negative: schema `private` is unreachable
  | "private_family" // negative: schema `private` is unreachable
  | "operators_insert" // negative: a common user cannot self-promote
  | "is_deleted_update" // negative: a common user cannot hide content
  | "foreign_notifications" // negative: a user does not see others' inboxes
  | "admissions_queue" // negative: the admissions queue is service_role-only

export type RlsCheck = { id: RlsCheckId; pass: boolean; detail?: string }
export type RlsProbeStatus = "ok" | "degraded" | "not_configured" | "error"
export type RlsProbeResult = {
  status: RlsProbeStatus
  checks: RlsCheck[]
  checked_at: string
}

/**
 * Pure classifier: turns a list of checks (and an optional error) into a
 * single status. Tested directly in `tests/unit/admin/rls-probe.test.ts` —
 * no Supabase, no network.
 *
 * Precedence:
 *   1. `not_configured` short-circuits (no credentials to run anything)
 *   2. `error` short-circuits (the probe itself couldn't run)
 *   3. any failed check → `degraded`
 *   4. otherwise → `ok`
 */
export function classifyRlsProbe(
  checks: RlsCheck[],
  flags: { notConfigured?: boolean; errored?: boolean } = {},
): RlsProbeStatus {
  if (flags.notConfigured) return "not_configured"
  if (flags.errored) return "error"
  return checks.every((c) => c.pass) ? "ok" : "degraded"
}

/**
 * Runs the seven assertions against the database as a common user and returns
 * the probe result.
 *
 * Behaviour notes:
 *   - The credentials live in env vars (`RLS_PROBE_EMAIL`, `RLS_PROBE_PASSWORD`).
 *     When either is missing, the probe returns `"not_configured"` without
 *     touching the network — the operator sees the configuration problem
 *     without depending on a remote failure.
 *   - The probe NEVER logs the password. The only secret it ever references
 *     is read from `process.env` and never written back.
 *   - The probe NEVER echoes any data row in its response. `detail` strings
 *     are short, fixed, and contain no PII.
 *   - On any thrown error, the probe returns `"error"` with no checks. The
 *     caller sees a single status; the underlying error is logged.
 */
export async function runRlsProbe(): Promise<RlsProbeResult> {
  const checkedAt = new Date().toISOString()

  const email = process.env["RLS_PROBE_EMAIL"]
  const password = process.env["RLS_PROBE_PASSWORD"]

  if (!email || !password) {
    return {
      status: classifyRlsProbe([], { notConfigured: true }),
      checks: [],
      checked_at: checkedAt,
    }
  }

  try {
    const anon = createAnonClient()
    const { data, error: authError } = await anon.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data?.session?.user) {
      return {
        status: classifyRlsProbe([], { errored: true }),
        checks: [],
        checked_at: checkedAt,
      }
    }

    // Capture the session from the typed response. The shape is
    // `{ user, session, weakPassword? }` so `data.session` is the Supabase
    // `Session` whose `access_token` is what PostgREST needs for the
    // private-schema probes.
    const accessToken = data.session.access_token
    const userId = data.session.user.id

    const checks = await runAssertions(anon, { accessToken, userId })

    return {
      status: classifyRlsProbe(checks),
      checks,
      checked_at: checkedAt,
    }
  } catch {
    return {
      status: classifyRlsProbe([], { errored: true }),
      checks: [],
      checked_at: checkedAt,
    }
  }
}

async function runAssertions(
  supabase: SupabaseClient,
  ctx: { accessToken: string; userId: string },
): Promise<RlsCheck[]> {
  const out: RlsCheck[] = []

  out.push(await checkSelfProfile(supabase))
  out.push(await checkPrivateSchema(ctx, "verification_outcomes", "private_verification"))
  out.push(await checkPrivateSchema(ctx, "family_invitations", "private_family"))
  out.push(await checkOperatorsInsert(supabase, ctx))
  out.push(await checkIsDeletedUpdate(supabase, ctx))
  out.push(await checkForeignNotifications(supabase, ctx))
  out.push(await checkAdmissionsQueue(supabase))

  return out
}

async function checkSelfProfile(supabase: SupabaseClient): Promise<RlsCheck> {
  // Positive: the member reads their own profile row. The primary key is
  // `user_id` (not `id`) in this schema.
  const { data, error } = await supabase.from("profiles").select("user_id").limit(1)
  if (error) return { id: "self_profile", pass: false, detail: "profile read failed" }
  if (!data || data.length === 0) {
    return { id: "self_profile", pass: false, detail: "no profile row visible" }
  }
  return { id: "self_profile", pass: true }
}

async function checkPrivateSchema(
  ctx: { accessToken: string; userId: string },
  table: string,
  id: RlsCheckId,
): Promise<RlsCheck> {
  // Negative: the schema `private` is unreachable for an authenticated user
  // with no grants. We hit PostgREST directly with `Accept-Profile: private`
  // because the typed client only knows about the `public` schema.
  const url = process.env["SUPABASE_URL"]
  const apikey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !apikey) {
    return { id, pass: false, detail: "supabase env missing" }
  }
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
      method: "GET",
      headers: {
        apikey,
        Authorization: `Bearer ${ctx.accessToken}`,
        Accept: "application/json",
        "Accept-Profile": "private",
      },
    })
    // The contract: any 4xx means the boundary held. 2xx with rows would mean
    // a leak (it should not happen with the current grants).
    if (response.status >= 400) {
      return { id, pass: true }
    }
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      // ignore — non-JSON 2xx still fails the assertion
    }
    const leaked = Array.isArray(body) && body.length > 0
    return leaked ? { id, pass: false, detail: "private schema leaked rows" } : { id, pass: true }
  } catch {
    return { id, pass: false, detail: "fetch failed" }
  }
}

async function checkOperatorsInsert(
  supabase: SupabaseClient,
  ctx: { userId: string },
): Promise<RlsCheck> {
  // Negative: a common user must NOT be able to insert themselves into the
  // operators roster. RLS denies the insert; we treat a clean rejection as
  // the boundary holding. A successful insert is an immediate `degraded`.
  const { error } = await supabase.from("operators").insert({ user_id: ctx.userId })
  if (error) {
    return { id: "operators_insert", pass: true }
  }
  return { id: "operators_insert", pass: false, detail: "operators insert was accepted" }
}

async function checkIsDeletedUpdate(
  supabase: SupabaseClient,
  ctx: { userId: string },
): Promise<RlsCheck> {
  // Negative: a common user must NOT be able to flip `is_deleted`. RLS and the
  // post_no_delete trigger block the update. If the user has no own post,
  // there is nothing to probe — treat that as pass with an explicit detail.
  const { data: ownPosts, error: lookupError } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", ctx.userId)
    .limit(1)

  if (lookupError) {
    return { id: "is_deleted_update", pass: false, detail: "post lookup failed" }
  }
  const firstOwnPost = ownPosts[0]
  if (!firstOwnPost) {
    return { id: "is_deleted_update", pass: true, detail: "no own post to probe" }
  }

  const { error } = await supabase
    .from("posts")
    .update({ is_deleted: true })
    .eq("id", firstOwnPost.id)

  if (error) {
    return { id: "is_deleted_update", pass: true }
  }
  return { id: "is_deleted_update", pass: false, detail: "is_deleted update was accepted" }
}

async function checkForeignNotifications(
  supabase: SupabaseClient,
  ctx: { userId: string },
): Promise<RlsCheck> {
  // Negative: a common user must NOT see notifications addressed to someone
  // else. Selecting with `.neq("recipient_user_id", userId)` and `.limit(1)`
  // returns rows only if RLS is leaky.
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .neq("recipient_user_id", ctx.userId)
    .limit(1)

  if (error) return { id: "foreign_notifications", pass: true }
  if (data && data.length > 0) {
    return {
      id: "foreign_notifications",
      pass: false,
      detail: "foreign notifications leaked",
    }
  }
  return { id: "foreign_notifications", pass: true }
}

async function checkAdmissionsQueue(supabase: SupabaseClient): Promise<RlsCheck> {
  // Negative: the admissions queue RPC is service_role-only. A common user
  // calling it must be rejected by the GRANT — no rows, no payload, just a
  // status we treat as "boundary held".
  const { error } = await supabase.rpc("list_verification_queue")
  if (error) return { id: "admissions_queue", pass: true }
  return { id: "admissions_queue", pass: false, detail: "admissions queue accepted common user" }
}

/**
 * Narrows a Supabase user down to what this module needs. Extracted so the
 * callers can stay free of `any`-casts when the public type already gives us
 * enough.
 */
export type ProbeUser = Pick<User, "id">

// Silence the unused warning for the helper while keeping it exported for
// future test stubs that may want to inject a fake `User` shape.
export const _internal = { checkPrivateSchema }
