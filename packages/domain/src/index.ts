export const LOCALITY_CODES = ["manaus-am"] as const
export type LocalityCode = (typeof LOCALITY_CODES)[number]

export const PILOT_LOCALITY_CODE = "manaus-am" satisfies LocalityCode

export const PRIVACY_VISIBILITIES = ["community", "private"] as const
export type PrivacyVisibility = (typeof PRIVACY_VISIBILITIES)[number]

export const ALLOWED_STORAGE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export type AllowedStorageImageMime = (typeof ALLOWED_STORAGE_IMAGE_MIME_TYPES)[number]

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const EVENT_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024
