"use server"

import { revalidatePath } from "next/cache"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

async function approveCommunityMemberAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const userId = formData.get("userId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId required")
  }

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_current_user_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
  })
  if (!isVerified) {
    throw new Error("apenas moderadores podem aprovar")
  }

  const { error } = await supabase.rpc("approve_community_member", {
    p_community_id: communityId,
    p_user_id: userId,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath("/communities")
}

async function removeCommunityMemberAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const userId = formData.get("userId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId required")
  }

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_current_user_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
  })
  if (!isVerified) {
    throw new Error("apenas moderadores podem remover")
  }

  const { error } = await supabase.rpc("remove_community_member", {
    p_community_id: communityId,
    p_user_id: userId,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath("/communities")
}

export { approveCommunityMemberAction, removeCommunityMemberAction }
