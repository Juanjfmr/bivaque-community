import {
  ALLOWED_STORAGE_IMAGE_MIME_TYPES,
  AVATAR_MAX_SIZE_BYTES,
  COMMENT_CONTENT_MAX_LENGTH,
  EVENT_PHOTO_MAX_SIZE_BYTES,
  EVENT_RSVP_STATUSES,
  EVENT_STATUSES,
  FEED_ORDERS,
  LOCALITY_CODES,
  POST_CONTENT_MAX_LENGTH,
  POST_TYPES,
  PRIVACY_VISIBILITIES,
  RECOMMENDATION_CATEGORIES,
} from "@bivaque/domain"
import { z } from "zod"

export const LocalityCodeSchema = z.enum(LOCALITY_CODES)
export type LocalityCode = z.infer<typeof LocalityCodeSchema>

export const PrivacyVisibilitySchema = z.enum(PRIVACY_VISIBILITIES)
export type PrivacyVisibility = z.infer<typeof PrivacyVisibilitySchema>

export const PublicIdentitySchema = z
  .strictObject({
    displayName: z.string().trim().min(1).max(80),
    localityCode: LocalityCodeSchema,
  })
  .readonly()

export type PublicIdentity = z.infer<typeof PublicIdentitySchema>

export const StorageImageMimeSchema = z.enum(ALLOWED_STORAGE_IMAGE_MIME_TYPES)
export type StorageImageMime = z.infer<typeof StorageImageMimeSchema>

export const AvatarUploadSchema = z
  .strictObject({
    mimeType: StorageImageMimeSchema,
    sizeBytes: z.number().int().positive().max(AVATAR_MAX_SIZE_BYTES),
  })
  .readonly()

export type AvatarUpload = z.infer<typeof AvatarUploadSchema>

export const EventPhotoUploadSchema = z
  .strictObject({
    mimeType: StorageImageMimeSchema,
    sizeBytes: z.number().int().positive().max(EVENT_PHOTO_MAX_SIZE_BYTES),
  })
  .readonly()

export type EventPhotoUpload = z.infer<typeof EventPhotoUploadSchema>

export const EventStatusSchema = z.enum(EVENT_STATUSES)
export type EventStatus = z.infer<typeof EventStatusSchema>

export const EventRsvpStatusSchema = z.enum(EVENT_RSVP_STATUSES)
export type EventRsvpStatus = z.infer<typeof EventRsvpStatusSchema>

export const EventCreateSchema = z
  .strictObject({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    localityId: z.string().uuid(),
    groupId: z.string().uuid().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    // O local é escolha de quem organiza — endereço e instalação militar
    // inclusive (decisão do dono, 25/09/2026; migration 20260925174442).
    venue: z.string().trim().max(200).optional(),
  })
  .readonly()

export type EventCreate = z.infer<typeof EventCreateSchema>

export const PostTypeSchema = z.enum(POST_TYPES)
export type PostType = z.infer<typeof PostTypeSchema>

export const FeedOrderSchema = z.enum(FEED_ORDERS)
export type FeedOrder = z.infer<typeof FeedOrderSchema>

export const PostContentSchema = z.string().trim().min(1).max(POST_CONTENT_MAX_LENGTH)

export const CommentContentSchema = z.string().trim().min(1).max(COMMENT_CONTENT_MAX_LENGTH)

export const CreatePostSchema = z
  .strictObject({
    localityId: z.string().uuid(),
    postType: PostTypeSchema,
    content: PostContentSchema,
    photoPath: z.string().max(500).optional(),
    linkUrl: z.string().url().max(2000).optional(),
    pollOptions: z.array(z.string().trim().min(1).max(200)).min(2).max(10).optional(),
  })
  .readonly()
  .refine(
    (v) => {
      if (v.postType === "photo" && !v.photoPath) return false
      if (v.postType === "link" && !v.linkUrl) return false
      if (v.postType === "poll" && (!v.pollOptions || v.pollOptions.length < 2)) return false
      return true
    },
    { message: "post type requires matching payload" },
  )
  .refine(
    (v) => {
      if (v.postType !== "photo" && v.photoPath) return false
      if (v.postType !== "link" && v.linkUrl) return false
      if (v.postType !== "poll" && v.pollOptions) return false
      return true
    },
    { message: "post type must not carry payload for a different type" },
  )

export type CreatePost = z.infer<typeof CreatePostSchema>

export const CreateCommentSchema = z
  .strictObject({
    postId: z.string().uuid(),
    content: CommentContentSchema,
  })
  .readonly()

export type CreateComment = z.infer<typeof CreateCommentSchema>

export const RecommendationCategorySchema = z.enum(RECOMMENDATION_CATEGORIES)
export type RecommendationCategory = z.infer<typeof RecommendationCategorySchema>

export const RecommendationTitleSchema = z.string().trim().min(3).max(200)

export const RecommendationBodySchema = z.string().trim().min(10).max(2000)

export const RecommendationRejectProviderSchema = z
  .strictObject({
    title: z.string(),
    body: z.string(),
    category: z.string(),
    isProvider: z.undefined().optional(),
    providerBio: z.undefined().optional(),
    providerRating: z.undefined().optional(),
  })
  .readonly()

export const RecommendationRejectPaidSchema = z
  .strictObject({
    title: z.string(),
    body: z.string(),
    category: z.string(),
    price: z.undefined().optional(),
    paymentMethod: z.undefined().optional(),
    isPaid: z.undefined().optional(),
  })
  .readonly()

export const RecommendationRejectSponsoredSchema = z
  .strictObject({
    title: z.string(),
    body: z.string(),
    category: z.string(),
    isSponsored: z.undefined().optional(),
    isPromoted: z.undefined().optional(),
    adRank: z.undefined().optional(),
  })
  .readonly()

export const RecommendationRequestInsertSchema = z
  .strictObject({
    localityId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    title: RecommendationTitleSchema,
    body: RecommendationBodySchema,
    category: RecommendationCategorySchema,
  })
  .refine((v) => (v.localityId !== undefined) !== (v.groupId !== undefined), {
    message: "exactly one of localityId or groupId must be provided",
  })
  .readonly()

export type RecommendationRequestInsert = z.infer<typeof RecommendationRequestInsertSchema>
