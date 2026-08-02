import { LOCALITY_CODES, PRIVACY_VISIBILITIES } from "@bivaque/domain"
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
