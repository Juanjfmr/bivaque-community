import type { Database } from "supabase/database.generated"

// FIGMA-002 — tipos de linha do domínio de anúncios, sempre derivados dos
// types gerados do schema public (nunca duplicados à mão).

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"]
export type PropertyDetailRow = Database["public"]["Tables"]["property_details"]["Row"]
export type ListingMediaRow = Database["public"]["Tables"]["listing_media"]["Row"]
export type ListingInterestRow = Database["public"]["Tables"]["listing_interests"]["Row"]

export interface ListingWithDetails extends ListingRow {
  property_details: PropertyDetailRow | null
}

export interface ListingDetail extends ListingRow {
  details: PropertyDetailRow | null
  media: ListingMediaRow[]
  interestConversationId: string | null
  advertiserName: string | null
  cityName: string | null
}

export interface ListingSearchFilters {
  query?: string
  propertyType?: string
  neighborhood?: string
  maxRentCents?: number | undefined
  minBedrooms?: number | undefined
}
