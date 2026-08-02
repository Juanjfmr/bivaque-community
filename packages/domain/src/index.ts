export const LOCALITY_CODES = ["manaus-am"] as const
export type LocalityCode = (typeof LOCALITY_CODES)[number]

export const PILOT_LOCALITY_CODE = "manaus-am" satisfies LocalityCode

export const PRIVACY_VISIBILITIES = ["community", "private"] as const
export type PrivacyVisibility = (typeof PRIVACY_VISIBILITIES)[number]
