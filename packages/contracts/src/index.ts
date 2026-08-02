import {
  ALLOWED_STORAGE_IMAGE_MIME_TYPES,
  AVATAR_MAX_SIZE_BYTES,
  EVENT_PHOTO_MAX_SIZE_BYTES,
  LOCALITY_CODES,
  PRIVACY_VISIBILITIES,
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
