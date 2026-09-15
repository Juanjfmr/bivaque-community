export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          due_at: string
          finalized_at: string | null
          purge_attempted_at: string | null
          purge_attempts: number
          purge_last_error: string | null
          requested_at: string
          user_id: string
        }
        Insert: {
          due_at: string
          finalized_at?: string | null
          purge_attempted_at?: string | null
          purge_attempts?: number
          purge_last_error?: string | null
          requested_at?: string
          user_id: string
        }
        Update: {
          due_at?: string
          finalized_at?: string | null
          purge_attempted_at?: string | null
          purge_attempts?: number
          purge_last_error?: string | null
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      arrival_guide_entries: {
        Row: {
          category: Database["public"]["Enums"]["arrival_guide_category"]
          confidence: number | null
          created_at: string
          description: string
          id: string
          locality_id: string
          name: string
          phone: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          source_reply_id: string | null
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["arrival_guide_category"]
          confidence?: number | null
          created_at?: string
          description?: string
          id?: string
          locality_id: string
          name: string
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          source_reply_id?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["arrival_guide_category"]
          confidence?: number | null
          created_at?: string
          description?: string
          id?: string
          locality_id?: string
          name?: string
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          source_reply_id?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arrival_guide_entries_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_guide_entries_source_reply_id_fkey"
            columns: ["source_reply_id"]
            isOneToOne: false
            referencedRelation: "recommendation_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          banner_path: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_deleted: boolean
          locality_id: string
          name: string
          owner_user_id: string
          thumbnail_path: string | null
        }
        Insert: {
          banner_path?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          locality_id: string
          name: string
          owner_user_id: string
          thumbnail_path?: string | null
        }
        Update: {
          banner_path?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          locality_id?: string
          name?: string
          owner_user_id?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          community_id: string
          created_at: string
          expires_at: string
          id: string
          inviter_user_id: string
          status: Database["public"]["Enums"]["community_invitation_status"]
          token_digest: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          community_id: string
          created_at?: string
          expires_at: string
          id?: string
          inviter_user_id: string
          status?: Database["public"]["Enums"]["community_invitation_status"]
          token_digest: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          community_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          inviter_user_id?: string
          status?: Database["public"]["Enums"]["community_invitation_status"]
          token_digest?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_invitations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_reasons: {
        Row: {
          community_id: string
          created_at: string
          reason: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          reason: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_reasons_community_id_user_id_fkey"
            columns: ["community_id", "user_id"]
            isOneToOne: true
            referencedRelation: "community_memberships"
            referencedColumns: ["community_id", "user_id"]
          },
        ]
      }
      community_memberships: {
        Row: {
          community_id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_membership_role"]
          status: Database["public"]["Enums"]["community_membership_status"]
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_membership_role"]
          status?: Database["public"]["Enums"]["community_membership_status"]
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_membership_role"]
          status?: Database["public"]["Enums"]["community_membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_acceptances: {
        Row: {
          accepted_at: string
          code_of_conduct_version: number
          consent_version: number
          user_id: string
        }
        Insert: {
          accepted_at?: string
          code_of_conduct_version: number
          consent_version: number
          user_id: string
        }
        Update: {
          accepted_at?: string
          code_of_conduct_version?: number
          consent_version?: number
          user_id?: string
        }
        Relationships: []
      }
      dm_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      dm_conversations: {
        Row: {
          context_id: string
          context_type: Database["public"]["Enums"]["dm_context_type"]
          created_at: string
          id: string
          participant_a: string
          participant_b: string
        }
        Insert: {
          context_id: string
          context_type: Database["public"]["Enums"]["dm_context_type"]
          created_at?: string
          id?: string
          participant_a: string
          participant_b: string
        }
        Update: {
          context_id?: string
          context_type?: Database["public"]["Enums"]["dm_context_type"]
          created_at?: string
          id?: string
          participant_a?: string
          participant_b?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          client_key: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          sender_id: string
        }
        Insert: {
          client_key?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id: string
        }
        Update: {
          client_key?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_read_states: {
        Row: {
          conversation_id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_read_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invites: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invited_by: string
          invitee_user_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["event_invite_status"]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invited_by: string
          invitee_user_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["event_invite_status"]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invited_by?: string
          invitee_user_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["event_invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          occurrence_date: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          occurrence_date: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          occurrence_date?: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          community_id: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          group_id: string | null
          id: string
          last_reminder_sent_for: string | null
          locality_id: string
          organizer_id: string
          recurrence_day_of_month: number | null
          recurrence_ordinal: number | null
          recurrence_type: string | null
          recurrence_weekday: number | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          community_id?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          last_reminder_sent_for?: string | null
          locality_id: string
          organizer_id: string
          recurrence_day_of_month?: number | null
          recurrence_ordinal?: number | null
          recurrence_type?: string | null
          recurrence_weekday?: number | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          community_id?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          last_reminder_sent_for?: string | null
          locality_id?: string
          organizer_id?: string
          recurrence_day_of_month?: number | null
          recurrence_ordinal?: number | null
          recurrence_type?: string | null
          recurrence_weekday?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_community_same_locality"
            columns: ["community_id", "locality_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id", "locality_id"]
          },
          {
            foreignKeyName: "events_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_membership_role"]
          status: Database["public"]["Enums"]["group_membership_status"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_membership_role"]
          status?: Database["public"]["Enums"]["group_membership_status"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_membership_role"]
          status?: Database["public"]["Enums"]["group_membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          community_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_deleted: boolean
          locality_id: string
          name: string
          owner_user_id: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          locality_id: string
          name: string
          owner_user_id: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Update: {
          community_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          locality_id?: string
          name?: string
          owner_user_id?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_community_same_locality"
            columns: ["community_id", "locality_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id", "locality_id"]
          },
          {
            foreignKeyName: "groups_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_article_revisions: {
        Row: {
          article_id: string
          id: string
          revised_at: string
          revised_by: string | null
          snapshot: Json
        }
        Insert: {
          article_id: string
          id?: string
          revised_at?: string
          revised_by?: string | null
          snapshot: Json
        }
        Update: {
          article_id?: string
          id?: string
          revised_at?: string
          revised_by?: string | null
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "guide_article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "guide_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_article_sections: {
        Row: {
          anchor: string
          article_id: string
          body: string
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          anchor: string
          article_id: string
          body: string
          created_at?: string
          id?: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          anchor?: string
          article_id?: string
          body?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_article_sections_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "guide_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_articles: {
        Row: {
          cover_image_url: string | null
          created_at: string
          curated_by: string | null
          entry_id: string
          id: string
          reviewed_at: string | null
          status: string
          subtitle: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          curated_by?: string | null
          entry_id: string
          id?: string
          reviewed_at?: string | null
          status?: string
          subtitle?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          curated_by?: string | null
          entry_id?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          subtitle?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_articles_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "arrival_guide_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_correction_requests: {
        Row: {
          article_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          description: string
          id: string
          reference_text: string | null
          requester_id: string
          section_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          article_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description: string
          id?: string
          reference_text?: string | null
          requester_id: string
          section_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description?: string
          id?: string
          reference_text?: string | null
          requester_id?: string
          section_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_correction_requests_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "guide_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_correction_requests_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "guide_article_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_alert_deliveries: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          listing_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          listing_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "listing_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_alert_deliveries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_alerts: {
        Row: {
          created_at: string
          deal: Database["public"]["Enums"]["listing_deal"] | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["listing_kind"]
          locality_id: string | null
          max_value_cents: number | null
          min_bedrooms: number | null
          name: string
          neighborhood: string | null
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal?: Database["public"]["Enums"]["listing_deal"] | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["listing_kind"]
          locality_id?: string | null
          max_value_cents?: number | null
          min_bedrooms?: number | null
          name: string
          neighborhood?: string | null
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal?: Database["public"]["Enums"]["listing_deal"] | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["listing_kind"]
          locality_id?: string | null
          max_value_cents?: number | null
          min_bedrooms?: number | null
          name?: string
          neighborhood?: string | null
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_alerts_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          path: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          path: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          path?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_saves: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_status_events: {
        Row: {
          actor_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["listing_status"]
          id: number
          listing_id: string
          to_status: Database["public"]["Enums"]["listing_status"]
        }
        Insert: {
          actor_id: string
          created_at?: string
          from_status: Database["public"]["Enums"]["listing_status"]
          id?: never
          listing_id: string
          to_status: Database["public"]["Enums"]["listing_status"]
        }
        Update: {
          actor_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["listing_status"]
          id?: never
          listing_id?: string
          to_status?: Database["public"]["Enums"]["listing_status"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_status_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          available_until: string | null
          category: string | null
          closed_at: string | null
          community_id: string | null
          condition: Database["public"]["Enums"]["listing_condition"] | null
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["listing_kind"]
          locality_id: string | null
          neighborhood: string | null
          owner_user_id: string
          pickup_note: string | null
          price_cents: number | null
          published_at: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          available_until?: string | null
          category?: string | null
          closed_at?: string | null
          community_id?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"] | null
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["listing_kind"]
          locality_id?: string | null
          neighborhood?: string | null
          owner_user_id: string
          pickup_note?: string | null
          price_cents?: number | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
        }
        Update: {
          available_until?: string | null
          category?: string | null
          closed_at?: string | null
          community_id?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"] | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          locality_id?: string | null
          neighborhood?: string | null
          owner_user_id?: string
          pickup_note?: string | null
          price_cents?: number | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      localities: {
        Row: {
          admission_mode: Database["public"]["Enums"]["locality_admission_mode"]
          city_name: string
          country_code: string
          created_at: string
          ibge_code: string
          id: string
          slug: string
          state_code: string
        }
        Insert: {
          admission_mode?: Database["public"]["Enums"]["locality_admission_mode"]
          city_name: string
          country_code?: string
          created_at?: string
          ibge_code: string
          id?: string
          slug: string
          state_code: string
        }
        Update: {
          admission_mode?: Database["public"]["Enums"]["locality_admission_mode"]
          city_name?: string
          country_code?: string
          created_at?: string
          ibge_code?: string
          id?: string
          slug?: string
          state_code?: string
        }
        Relationships: []
      }
      locality_memberships: {
        Row: {
          access: Database["public"]["Enums"]["locality_membership_access"]
          joined_at: string
          kind: Database["public"]["Enums"]["locality_membership_kind"]
          leaving_at: string | null
          locality_id: string
          user_id: string
        }
        Insert: {
          access?: Database["public"]["Enums"]["locality_membership_access"]
          joined_at?: string
          kind?: Database["public"]["Enums"]["locality_membership_kind"]
          leaving_at?: string | null
          locality_id: string
          user_id: string
        }
        Update: {
          access?: Database["public"]["Enums"]["locality_membership_access"]
          joined_at?: string
          kind?: Database["public"]["Enums"]["locality_membership_kind"]
          leaving_at?: string | null
          locality_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locality_memberships_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      national_holidays: {
        Row: {
          date: string
          name: string
          type: string
        }
        Insert: {
          date: string
          name: string
          type: string
        }
        Update: {
          date?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      notification_channel_preferences: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          enabled: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          enabled?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          enabled?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_opt_outs: {
        Row: {
          channel: Database["public"]["Enums"]["outbox_channel"]
          created_at: string
          recipient: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["outbox_channel"]
          created_at?: string
          recipient: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["outbox_channel"]
          created_at?: string
          recipient?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          comments: boolean
          events: boolean
          mentions: boolean
          messages: boolean
          product_news: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: boolean
          events?: boolean
          mentions?: boolean
          messages?: boolean
          product_news?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: boolean
          events?: boolean
          mentions?: boolean
          messages?: boolean
          product_news?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_user_id: string
          target_id: string
          target_type: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_user_id: string
          target_id: string
          target_type: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_user_id?: string
          target_id?: string
          target_type?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      operators: {
        Row: {
          auth_user_id: string
          granted_at: string
          granted_by: string | null
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          auth_user_id: string
          granted_at?: string
          granted_by?: string | null
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          auth_user_id?: string
          granted_at?: string
          granted_by?: string | null
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: []
      }
      outbox: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["outbox_channel"]
          created_at: string
          fallback_channel: Database["public"]["Enums"]["outbox_channel"] | null
          fallback_reason: string | null
          id: string
          last_error: string | null
          payload: Json
          recipient: string
          status: Database["public"]["Enums"]["outbox_status"]
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["outbox_channel"]
          created_at?: string
          fallback_channel?:
            | Database["public"]["Enums"]["outbox_channel"]
            | null
          fallback_reason?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          recipient: string
          status?: Database["public"]["Enums"]["outbox_status"]
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["outbox_channel"]
          created_at?: string
          fallback_channel?:
            | Database["public"]["Enums"]["outbox_channel"]
            | null
          fallback_reason?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          recipient?: string
          status?: Database["public"]["Enums"]["outbox_status"]
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_follows: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_follows_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          post_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          post_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          post_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          community_id: string | null
          content: string
          created_at: string
          group_id: string | null
          id: string
          is_deleted: boolean
          link_url: string | null
          locality_id: string
          photo_path: string | null
          poll_options: Json | null
          post_type: Database["public"]["Enums"]["post_type"]
          user_id: string
        }
        Insert: {
          community_id?: string | null
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_deleted?: boolean
          link_url?: string | null
          locality_id: string
          photo_path?: string | null
          poll_options?: Json | null
          post_type: Database["public"]["Enums"]["post_type"]
          user_id?: string
        }
        Update: {
          community_id?: string | null
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_deleted?: boolean
          link_url?: string | null
          locality_id?: string
          photo_path?: string | null
          poll_options?: Json | null
          post_type?: Database["public"]["Enums"]["post_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_same_locality"
            columns: ["community_id", "locality_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id", "locality_id"]
          },
          {
            foreignKeyName: "posts_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_affiliations: {
        Row: {
          field: string
          is_visible: boolean
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          field: string
          is_visible?: boolean
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          field?: string
          is_visible?: boolean
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      profile_suspensions: {
        Row: {
          updated_at: string
          user_id: string
        }
        Insert: {
          updated_at?: string
          user_id: string
        }
        Update: {
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          consent_version: number
          consented_at: string | null
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["profile_visibility"]
        }
        Insert: {
          bio?: string | null
          consent_version?: number
          consented_at?: string | null
          created_at?: string
          display_name: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Update: {
          bio?: string | null
          consent_version?: number
          consented_at?: string | null
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Relationships: []
      }
      property_details: {
        Row: {
          amenities: string[]
          area_m2: number | null
          available_from: string | null
          bedrooms: number | null
          condo_fee_cents: number | null
          deal: Database["public"]["Enums"]["listing_deal"]
          iptu_cents: number | null
          listing_id: string
          parking_spots: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          rent_cents: number | null
          sale_price_cents: number | null
          suites: number | null
        }
        Insert: {
          amenities?: string[]
          area_m2?: number | null
          available_from?: string | null
          bedrooms?: number | null
          condo_fee_cents?: number | null
          deal: Database["public"]["Enums"]["listing_deal"]
          iptu_cents?: number | null
          listing_id: string
          parking_spots?: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          rent_cents?: number | null
          sale_price_cents?: number | null
          suites?: number | null
        }
        Update: {
          amenities?: string[]
          area_m2?: number | null
          available_from?: string | null
          bedrooms?: number | null
          condo_fee_cents?: number | null
          deal?: Database["public"]["Enums"]["listing_deal"]
          iptu_cents?: number | null
          listing_id?: string
          parking_spots?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          rent_cents?: number | null
          sale_price_cents?: number | null
          suites?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_details_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_accounts: {
        Row: {
          auth_user_id: string
          community_id: string
          created_at: string
          invited_by: string
          locality_id: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          auth_user_id: string
          community_id: string
          created_at?: string
          invited_by: string
          locality_id: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          auth_user_id?: string
          community_id?: string
          created_at?: string
          invited_by?: string
          locality_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_accounts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_accounts_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_catalog_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_path: string | null
          position: number
          price_cents: number | null
          provider_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_path?: string | null
          position?: number
          price_cents?: number | null
          provider_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_path?: string | null
          position?: number
          price_cents?: number | null
          provider_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_catalog_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_portfolio_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_path: string
          position: number
          provider_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_path: string
          position?: number
          provider_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_path?: string
          position?: number
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_portfolio_photos_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_profiles: {
        Row: {
          bio: string | null
          category: Database["public"]["Enums"]["provider_category"]
          contact_is_public: boolean
          contact_phone: string | null
          created_at: string
          display_name: string
          id: string
          is_deleted: boolean
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          category: Database["public"]["Enums"]["provider_category"]
          contact_is_public?: boolean
          contact_phone?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_deleted?: boolean
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          category?: Database["public"]["Enums"]["provider_category"]
          contact_is_public?: boolean
          contact_phone?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_deleted?: boolean
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "provider_accounts"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      provider_reach: {
        Row: {
          active: boolean
          created_at: string
          provider_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["provider_reach_scope"]
          source: Database["public"]["Enums"]["provider_reach_source"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          provider_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["provider_reach_scope"]
          source: Database["public"]["Enums"]["provider_reach_source"]
        }
        Update: {
          active?: boolean
          created_at?: string
          provider_id?: string
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["provider_reach_scope"]
          source?: Database["public"]["Enums"]["provider_reach_source"]
        }
        Relationships: [
          {
            foreignKeyName: "provider_reach_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_deleted: boolean
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_replies_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "recommendation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_reply_promotions: {
        Row: {
          guide_entry_id: string
          promoted_at: string
          promoted_by: string
          reply_id: string
        }
        Insert: {
          guide_entry_id: string
          promoted_at?: string
          promoted_by: string
          reply_id: string
        }
        Update: {
          guide_entry_id?: string
          promoted_at?: string
          promoted_by?: string
          reply_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_reply_promotions_guide_entry_id_fkey"
            columns: ["guide_entry_id"]
            isOneToOne: false
            referencedRelation: "arrival_guide_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_reply_promotions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: true
            referencedRelation: "recommendation_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_requests: {
        Row: {
          author_id: string
          body: string
          category: Database["public"]["Enums"]["recommendation_category"]
          created_at: string
          group_id: string | null
          id: string
          is_deleted: boolean
          is_resolved: boolean
          locality_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_reply_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category?: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string
          group_id?: string | null
          id?: string
          is_deleted?: boolean
          is_resolved?: boolean
          locality_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_reply_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string
          group_id?: string | null
          id?: string
          is_deleted?: boolean
          is_resolved?: boolean
          locality_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_reply_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_requests_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_requests_resolved_reply_id_fkey"
            columns: ["resolved_reply_id"]
            isOneToOne: false
            referencedRelation: "recommendation_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_saves: {
        Row: {
          request_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          request_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          request_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_saves_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "recommendation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          operator_note: string | null
          reason: string
          reporter_user_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          operator_note?: string | null
          reason: string
          reporter_user_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          created_at?: string
          id?: string
          operator_note?: string | null
          reason?: string
          reporter_user_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: []
      }
      service_request_photos: {
        Row: {
          created_at: string
          id: string
          photo_path: string
          position: number
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_path: string
          position?: number
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_path?: string
          position?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_photos_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          cancelled_at: string | null
          cancelled_by_user_id: string | null
          category: Database["public"]["Enums"]["provider_category"]
          closed_at: string | null
          closed_by_user_id: string | null
          conversation_id: string | null
          created_at: string
          description: string
          first_responded_at: string | null
          id: string
          idempotency_key: string | null
          provider_id: string
          provider_user_id: string
          region: string | null
          requester_user_id: string
          status: Database["public"]["Enums"]["service_request_status"]
          updated_at: string
          when_text: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          category: Database["public"]["Enums"]["provider_category"]
          closed_at?: string | null
          closed_by_user_id?: string | null
          conversation_id?: string | null
          created_at?: string
          description: string
          first_responded_at?: string | null
          id?: string
          idempotency_key?: string | null
          provider_id: string
          provider_user_id: string
          region?: string | null
          requester_user_id: string
          status?: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
          when_text?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          category?: Database["public"]["Enums"]["provider_category"]
          closed_at?: string | null
          closed_by_user_id?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string
          first_responded_at?: string | null
          id?: string
          idempotency_key?: string | null
          provider_id?: string
          provider_user_id?: string
          region?: string | null
          requester_user_id?: string
          status?: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
          when_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_interests: {
        Row: {
          created_at: string
          group_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_interests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          city_name: string | null
          created_at: string
          email: string
          id: string
          locality_id: string | null
          state_code: string | null
        }
        Insert: {
          city_name?: string | null
          created_at?: string
          email: string
          id?: string
          locality_id?: string | null
          state_code?: string | null
        }
        Update: {
          city_name?: string | null
          created_at?: string
          email?: string
          id?: string
          locality_id?: string | null
          state_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_community_invitation: {
        Args: { p_token_digest: string; p_user_id: string }
        Returns: string
      }
      accept_family_invitation: {
        Args: { p_accepted_by_user_id: string; p_token_digest: string }
        Returns: string
      }
      accept_provider_invitation: {
        Args: { p_email: string; p_token: string }
        Returns: string
      }
      add_community_moderator: {
        Args: {
          p_caller_user_id: string
          p_community_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_group_moderator: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      add_to_waitlist: {
        Args: { p_city_name: string; p_email: string; p_state_code: string }
        Returns: undefined
      }
      advance_recurring_events: { Args: never; Returns: number }
      apply_guide_correction: {
        Args: {
          p_note: string
          p_operator_user_id: string
          p_request_id: string
          p_section_body: string
          p_section_title: string
          p_summary: string
        }
        Returns: undefined
      }
      approve_community_member: {
        Args: {
          p_caller_user_id: string
          p_community_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      approve_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      can_receive_invite_to_event: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      cancel_community_request: {
        Args: { p_community_id: string }
        Returns: undefined
      }
      cancel_service_request: { Args: { p_request_id: string }; Returns: Json }
      check_recurrence_holiday: {
        Args: { p_date: string }
        Returns: {
          holiday_name: string
          is_holiday: boolean
        }[]
      }
      clear_recommendation_resolved_reply: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      close_service_request: { Args: { p_request_id: string }; Returns: Json }
      complete_event: {
        Args: { p_caller_user_id?: string; p_event_id: string }
        Returns: undefined
      }
      consume_verification_attempt: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      conversation_counterpart_name: {
        Args: { p_conversation_id: string }
        Returns: string
      }
      create_community: {
        Args: {
          p_description: string
          p_locality_id: string
          p_name: string
          p_owner_user_id: string
        }
        Returns: string
      }
      create_community_invitation: {
        Args: {
          p_community_id: string
          p_expires_at: string
          p_inviter_user_id: string
          p_token_digest: string
        }
        Returns: string
      }
      create_family_invitation:
        | {
            Args: {
              p_invitee_email_digest: string
              p_inviter_user_id: string
              p_token_digest: string
            }
            Returns: string
          }
        | {
            Args: {
              p_invitee_email_digest: string
              p_invitee_email_hint: string
              p_inviter_user_id: string
              p_token_digest: string
            }
            Returns: string
          }
      create_group: {
        Args: {
          p_description?: string
          p_locality_id: string
          p_name: string
          p_visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Returns: string
      }
      create_group_in_community: {
        Args: {
          p_community_id: string
          p_description: string
          p_name: string
          p_visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Returns: string
      }
      create_provider_invitation: {
        Args: {
          p_community_id: string
          p_display_name: string
          p_email: string
        }
        Returns: string
      }
      create_service_request: {
        Args: {
          p_description: string
          p_idempotency_key?: string
          p_provider_id: string
          p_when_text?: string
        }
        Returns: string
      }
      decide_verification_document: {
        Args: {
          p_decision: string
          p_document_id: string
          p_operator_user_id: string
          p_reason: string
        }
        Returns: undefined
      }
      declare_locality_transfer: {
        Args: { p_destination_locality_id: string; p_term_date: string }
        Returns: {
          current_locality_id: string
          leaving_at: string
          leaving_locality_id: string
        }[]
      }
      degrade_locality_origins: { Args: never; Returns: number }
      delete_group: { Args: { p_group_id: string }; Returns: undefined }
      family_accept_holder_locality: {
        Args: { p_link_id: string }
        Returns: string
      }
      feed_community: {
        Args: { p_community_id: string; p_order?: string }
        Returns: {
          comment_count: number
          community_id: string
          content: string
          created_at: string
          display_name: string
          group_id: string
          id: string
          link_url: string
          locality_id: string
          my_follow: boolean
          my_reaction: boolean
          photo_path: string
          poll_options: Json
          post_type: Database["public"]["Enums"]["post_type"]
          reaction_count: number
          user_id: string
        }[]
      }
      feed_following: {
        Args: never
        Returns: {
          comment_count: number
          community_id: string
          content: string
          created_at: string
          display_name: string
          group_id: string
          id: string
          link_url: string
          locality_id: string
          my_follow: boolean
          my_reaction: boolean
          photo_path: string
          poll_options: Json
          post_type: Database["public"]["Enums"]["post_type"]
          reaction_count: number
          user_id: string
        }[]
      }
      feed_group: {
        Args: { p_group_id: string; p_order?: string }
        Returns: {
          comment_count: number
          content: string
          created_at: string
          display_name: string
          group_id: string
          id: string
          link_url: string
          locality_id: string
          my_follow: boolean
          my_reaction: boolean
          photo_path: string
          poll_options: Json
          post_type: Database["public"]["Enums"]["post_type"]
          reaction_count: number
          user_id: string
        }[]
      }
      feed_posts: {
        Args: { p_locality_id: string; p_order?: string }
        Returns: {
          comment_count: number
          content: string
          created_at: string
          display_name: string
          group_id: string
          id: string
          link_url: string
          locality_id: string
          my_follow: boolean
          my_reaction: boolean
          photo_path: string
          poll_options: Json
          post_type: Database["public"]["Enums"]["post_type"]
          reaction_count: number
          user_id: string
        }[]
      }
      finalize_account_deletion: {
        Args: { p_error?: string; p_user_id: string }
        Returns: string
      }
      get_profile_bio: { Args: { p_user_id: string }; Returns: string }
      has_accepted_consent: {
        Args: {
          p_code_of_conduct_version: number
          p_consent_version: number
          p_user_id: string
        }
        Returns: boolean
      }
      is_account_deletion_pending: { Args: never; Returns: boolean }
      is_account_suspended: { Args: { p_user_id: string }; Returns: boolean }
      is_community_member: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_current_user_community_moderator: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_current_user_operator: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_provider_account: { Args: { p_user_id: string }; Returns: boolean }
      is_verified_holder: { Args: { p_user_id: string }; Returns: boolean }
      join_group: { Args: { p_group_id: string }; Returns: undefined }
      leave_community: { Args: { p_community_id: string }; Returns: undefined }
      list_available_groups_for_interests: {
        Args: { p_locality_id: string; p_user_id: string }
        Returns: {
          already_interest: boolean
          already_member: boolean
          description: string
          id: string
          name: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }[]
      }
      list_community_pending_arrivals: {
        Args: { p_community_id: string; p_limit?: number; p_user_id: string }
        Returns: {
          arriving_at: string
          arriving_from_locality_name: string
          display_name: string
          requested_at: string
          user_id: string
        }[]
      }
      list_community_providers: {
        Args: { p_community_id: string; p_limit?: number; p_user_id: string }
        Returns: {
          category: Database["public"]["Enums"]["provider_category"]
          display_name: string
          provider_user_id: string
          revoked_at: string
        }[]
      }
      list_invitable_members_for_event: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: {
          display_name: string
          is_already_invited: boolean
          user_id: string
        }[]
      }
      list_locality_arrivals_volume: {
        Args: { p_user_id: string }
        Returns: {
          arrivals_count: number
          city_name: string
          locality_id: string
        }[]
      }
      list_locality_state_codes: {
        Args: never
        Returns: {
          state_code: string
        }[]
      }
      list_open_reports: {
        Args: never
        Returns: {
          created_at: string
          id: string
          open_reports_on_target: number
          reason: string
          target_author_name: string
          target_excerpt: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }[]
      }
      list_pending_community_invitations: {
        Args: { p_community_id: string; p_inviter_user_id: string }
        Returns: {
          community_id: string
          created_at: string
          expires_at: string
          id: string
        }[]
      }
      list_pending_invites: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          invitee_email_digest: string
        }[]
      }
      list_pending_invites_with_hint: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          invitee_email_digest: string
          invitee_email_hint: string
        }[]
      }
      list_promotable_replies: {
        Args: { p_limit?: number; p_locality_id: string }
        Returns: {
          author_display_name: string
          body: string
          created_at: string
          reply_id: string
          request_category: Database["public"]["Enums"]["recommendation_category"]
          request_title: string
        }[]
      }
      list_user_group_interests: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          group_id: string
        }[]
      }
      list_verification_documents: {
        Args: never
        Returns: {
          document_id: string
          expires_at: string
          mime_type: string
          review_status: string
          uploaded_at: string
          user_id: string
        }[]
      }
      list_verification_queue: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          status: string
          user_id: string
        }[]
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string; p_seen_at?: string }
        Returns: undefined
      }
      mark_recommendation_reply_resolved: {
        Args: { p_reply_id: string; p_request_id: string }
        Returns: undefined
      }
      mark_recommendation_resolved: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      my_account_kind: { Args: never; Returns: string }
      my_verification_document: {
        Args: { p_user_id: string }
        Returns: {
          document_id: string
          needs_replacement: boolean
          review_status: string
          uploaded_at: string
        }[]
      }
      my_verification_document_paths: {
        Args: { p_user_id: string }
        Returns: {
          storage_object_path: string
        }[]
      }
      my_verification_status: {
        Args: never
        Returns: {
          checked_at: string
          eligibility_class: string
          status: string
          updated_at: string
        }[]
      }
      next_occurrence: {
        Args: {
          p_from: string
          p_recurrence_day_of_month?: number
          p_recurrence_ordinal?: number
          p_recurrence_type: string
          p_recurrence_weekday?: number
        }
        Returns: string
      }
      open_conversation: {
        Args: {
          p_context_id: string
          p_context_type: Database["public"]["Enums"]["dm_context_type"]
          p_other_user_id: string
        }
        Returns: string
      }
      open_event_question: { Args: { p_event_id: string }; Returns: string }
      profile_events_for: {
        Args: { p_target_user_id: string; p_viewer_user_id: string }
        Returns: {
          id: string
          locality_id: string
          starts_at: string
          title: string
        }[]
      }
      profile_is_visible_to_viewer: {
        Args: { p_target_user_id: string; p_viewer_user_id: string }
        Returns: boolean
      }
      profile_posts_for: {
        Args: { p_target_user_id: string; p_viewer_user_id: string }
        Returns: {
          community_id: string
          content: string
          created_at: string
          group_id: string
          id: string
          link_url: string
          locality_id: string
          photo_path: string
          poll_options: Json
          post_type: Database["public"]["Enums"]["post_type"]
        }[]
      }
      promote_reply_to_guide_entry: {
        Args: {
          p_category: Database["public"]["Enums"]["arrival_guide_category"]
          p_description: string
          p_locality_id: string
          p_name: string
          p_operator_user_id: string
          p_phone: string
          p_reply_id: string
          p_website_url: string
        }
        Returns: string
      }
      provision_member_locality: {
        Args: { p_locality_id: string; p_user_id: string }
        Returns: undefined
      }
      purge_account_contact_data: {
        Args: { p_contact_email: string; p_user_id: string }
        Returns: number
      }
      read_verification_document_path: {
        Args: { p_document_id: string }
        Returns: {
          document_id: string
          expires_at: string
          mime_type: string
          storage_object_path: string
        }[]
      }
      read_verification_status: {
        Args: { p_user_id: string }
        Returns: {
          checked_at: string
          eligibility_class: string
          status: string
          updated_at: string
        }[]
      }
      record_consent_acceptance: {
        Args: {
          p_code_of_conduct_version: number
          p_consent_version: number
          p_user_id: string
        }
        Returns: undefined
      }
      record_user_group_interests: {
        Args: {
          p_group_ids: string[]
          p_locality_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      reject_guide_correction: {
        Args: {
          p_note: string
          p_operator_user_id: string
          p_request_id: string
        }
        Returns: undefined
      }
      reject_pending_user: {
        Args: {
          p_operator_user_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      remove_community_member: {
        Args: {
          p_caller_user_id: string
          p_community_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      remove_community_moderator: {
        Args: {
          p_caller_user_id: string
          p_community_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      remove_group_moderator: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      reopen_recommendation: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: Json }
      request_community_membership: {
        Args: { p_community_id: string; p_reason?: string }
        Returns: undefined
      }
      resolve_report: {
        Args: {
          p_action: string
          p_note?: string
          p_operator_user_id: string
          p_report_id: string
        }
        Returns: undefined
      }
      reverse_locality_transfer: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      revoke_community_invitation: {
        Args: { p_invitation_id: string; p_inviter_user_id: string }
        Returns: undefined
      }
      revoke_family_invitation: {
        Args: { p_invitation_id: string; p_inviter_user_id: string }
        Returns: undefined
      }
      revoke_provider_account: {
        Args: {
          p_owner_user_id: string
          p_provider_user_id: string
          p_reason: string
        }
        Returns: undefined
      }
      search_providers: {
        Args: {
          p_category?: Database["public"]["Enums"]["provider_category"]
          p_community_id?: string
          p_query?: string
        }
        Returns: {
          bio: string
          category: Database["public"]["Enums"]["provider_category"]
          display_name: string
          id: string
          reach_source: Database["public"]["Enums"]["provider_reach_source"]
        }[]
      }
      send_conversation_message: {
        Args: {
          p_client_key?: string
          p_content: string
          p_conversation_id: string
        }
        Returns: Json
      }
      set_community_image: {
        Args: {
          p_caller_user_id: string
          p_community_id: string
          p_kind: string
          // À MÃO: a função aceita NULL para limpar o ponteiro da imagem
          // ("if p_path is not null and split_part(...)"). O gerador não
          // expressa nulabilidade de argumento, então esta linha é ajustada
          // depois do generate:types — preservar em toda regeneração.
          p_path: string | null
        }
        Returns: undefined
      }
      set_profile_bio: { Args: { p_bio: string }; Returns: undefined }
      submit_verification_document: {
        Args: {
          p_mime_type: string
          p_storage_object_path: string
          p_user_id: string
        }
        Returns: string
      }
      suggest_groups_for_user: {
        Args: { p_locality_id: string; p_user_id: string }
        Returns: {
          description: string
          id: string
          name: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }[]
      }
      transfer_community_ownership: {
        Args: { p_community_id: string; p_new_owner_user_id: string }
        Returns: undefined
      }
      transfer_group_ownership: {
        Args: { p_group_id: string; p_new_owner_user_id: string }
        Returns: undefined
      }
      transition_listing: {
        Args: { p_action: string; p_listing_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      update_service_request: {
        Args: {
          p_description: string
          p_request_id: string
          p_when_text?: string
        }
        Returns: Json
      }
      upsert_verification_outcome: {
        Args: {
          p_eligibility_class?: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      verification_reconcile_step: {
        Args: { p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      arrival_guide_category: "school" | "hospital" | "transporter" | "courier"
      community_invitation_status:
        | "pending"
        | "accepted"
        | "revoked"
        | "expired"
      community_membership_role: "member" | "moderator" | "owner"
      community_membership_status: "pending" | "approved"
      dm_context_type:
        | "shared_group"
        | "shared_event"
        | "recommendation_thread"
        | "accepted_family"
        | "provider"
        | "listing"
        | "event_question"
      event_invite_status: "pending" | "accepted" | "declined"
      event_rsvp_status: "interested" | "going" | "not_going"
      event_status: "upcoming" | "cancelled" | "completed"
      group_membership_role: "member" | "moderator" | "owner"
      group_membership_status: "pending" | "approved"
      group_visibility: "public" | "private"
      listing_condition: "new" | "used"
      listing_deal: "rent" | "sale"
      listing_kind: "item" | "property"
      listing_status:
        | "draft"
        | "active"
        | "paused"
        | "reserved"
        | "sold"
        | "closed"
      locality_admission_mode:
        | "invite_only"
        | "waitlist_only"
        | "verification_gated"
      locality_membership_access: "active" | "read_only"
      locality_membership_kind: "current" | "leaving"
      notification_channel: "in_app" | "email"
      notification_type:
        | "comment"
        | "group_admission"
        | "invitation_accepted"
        | "event_rsvp"
        | "event_change"
        | "direct_message"
        | "report_resolved"
        | "event_reminder"
        | "recommendation_reply"
        | "admission_rejected"
        | "listing_alert"
      outbox_channel: "email" | "whatsapp"
      outbox_status: "pending" | "sent" | "failed" | "skipped"
      post_type: "text" | "photo" | "link" | "poll"
      profile_visibility: "locality_members"
      property_type:
        | "apartment"
        | "house"
        | "studio"
        | "room"
        | "land"
        | "commercial"
      provider_category:
        | "alimentacao"
        | "casa_e_reformas"
        | "assistencia_tecnica"
        | "mudanca_e_transporte"
        | "imoveis"
        | "documentacao_e_financas"
        | "saude_e_bem_estar"
        | "beleza"
        | "educacao_e_aulas"
        | "automotivo"
        | "eventos_e_festas"
        | "pets"
      provider_reach_scope: "community" | "locality"
      provider_reach_source: "free" | "paid"
      recommendation_category:
        | "servicos_locais"
        | "saude_bem_estar"
        | "educacao"
        | "esporte_lazer"
        | "alimentacao"
        | "transporte"
        | "moradia"
        | "outros"
      report_status: "open" | "resolved"
      report_target_type:
        | "post"
        | "comment"
        | "group"
        | "message"
        | "recommendation_request"
        | "recommendation_reply"
        | "provider_profile"
      service_request_status:
        | "open"
        | "in_conversation"
        | "closed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      arrival_guide_category: ["school", "hospital", "transporter", "courier"],
      community_invitation_status: [
        "pending",
        "accepted",
        "revoked",
        "expired",
      ],
      community_membership_role: ["member", "moderator", "owner"],
      community_membership_status: ["pending", "approved"],
      dm_context_type: [
        "shared_group",
        "shared_event",
        "recommendation_thread",
        "accepted_family",
        "provider",
        "listing",
        "event_question",
      ],
      event_invite_status: ["pending", "accepted", "declined"],
      event_rsvp_status: ["interested", "going", "not_going"],
      event_status: ["upcoming", "cancelled", "completed"],
      group_membership_role: ["member", "moderator", "owner"],
      group_membership_status: ["pending", "approved"],
      group_visibility: ["public", "private"],
      listing_condition: ["new", "used"],
      listing_deal: ["rent", "sale"],
      listing_kind: ["item", "property"],
      listing_status: [
        "draft",
        "active",
        "paused",
        "reserved",
        "sold",
        "closed",
      ],
      locality_admission_mode: [
        "invite_only",
        "waitlist_only",
        "verification_gated",
      ],
      locality_membership_access: ["active", "read_only"],
      locality_membership_kind: ["current", "leaving"],
      notification_channel: ["in_app", "email"],
      notification_type: [
        "comment",
        "group_admission",
        "invitation_accepted",
        "event_rsvp",
        "event_change",
        "direct_message",
        "report_resolved",
        "event_reminder",
        "recommendation_reply",
        "admission_rejected",
        "listing_alert",
      ],
      outbox_channel: ["email", "whatsapp"],
      outbox_status: ["pending", "sent", "failed", "skipped"],
      post_type: ["text", "photo", "link", "poll"],
      profile_visibility: ["locality_members"],
      property_type: [
        "apartment",
        "house",
        "studio",
        "room",
        "land",
        "commercial",
      ],
      provider_category: [
        "alimentacao",
        "casa_e_reformas",
        "assistencia_tecnica",
        "mudanca_e_transporte",
        "imoveis",
        "documentacao_e_financas",
        "saude_e_bem_estar",
        "beleza",
        "educacao_e_aulas",
        "automotivo",
        "eventos_e_festas",
        "pets",
      ],
      provider_reach_scope: ["community", "locality"],
      provider_reach_source: ["free", "paid"],
      recommendation_category: [
        "servicos_locais",
        "saude_bem_estar",
        "educacao",
        "esporte_lazer",
        "alimentacao",
        "transporte",
        "moradia",
        "outros",
      ],
      report_status: ["open", "resolved"],
      report_target_type: [
        "post",
        "comment",
        "group",
        "message",
        "recommendation_request",
        "recommendation_reply",
        "provider_profile",
      ],
      service_request_status: [
        "open",
        "in_conversation",
        "closed",
        "cancelled",
      ],
    },
  },
} as const

