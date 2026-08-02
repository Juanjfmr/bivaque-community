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
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
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
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
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
          created_at: string
          description: string | null
          ends_at: string | null
          group_id: string | null
          id: string
          locality_id: string
          organizer_id: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          locality_id: string
          organizer_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          locality_id?: string
          organizer_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
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
          created_at: string
          created_by: string
          description: string | null
          id: string
          locality_id: string
          name: string
          owner_user_id: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          locality_id: string
          name: string
          owner_user_id: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          locality_id?: string
          name?: string
          owner_user_id?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_locality_id_fkey"
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
          id: string
          slug: string
          state_code: string
        }
        Insert: {
          admission_mode?: Database["public"]["Enums"]["locality_admission_mode"]
          city_name: string
          country_code?: string
          created_at?: string
          id?: string
          slug: string
          state_code: string
        }
        Update: {
          admission_mode?: Database["public"]["Enums"]["locality_admission_mode"]
          city_name?: string
          country_code?: string
          created_at?: string
          id?: string
          slug?: string
          state_code?: string
        }
        Relationships: []
      }
      locality_memberships: {
        Row: {
          joined_at: string
          locality_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          locality_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
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
      posts: {
        Row: {
          content: string
          created_at: string
          group_id: string | null
          id: string
          link_url: string | null
          locality_id: string
          photo_path: string | null
          poll_options: Json | null
          post_type: Database["public"]["Enums"]["post_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          link_url?: string | null
          locality_id: string
          photo_path?: string | null
          poll_options?: Json | null
          post_type: Database["public"]["Enums"]["post_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          link_url?: string | null
          locality_id?: string
          photo_path?: string | null
          poll_options?: Json | null
          post_type?: Database["public"]["Enums"]["post_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consent_version: number
          consented_at: string | null
          created_at: string
          display_name: string
          locality_id: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["profile_visibility"]
        }
        Insert: {
          consent_version?: number
          consented_at?: string | null
          created_at?: string
          display_name: string
          locality_id: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Update: {
          consent_version?: number
          consented_at?: string | null
          created_at?: string
          display_name?: string
          locality_id?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_locality_id_fkey"
            columns: ["user_id", "locality_id"]
            isOneToOne: false
            referencedRelation: "locality_memberships"
            referencedColumns: ["user_id", "locality_id"]
          },
        ]
      }
      recommendation_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
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
      recommendation_requests: {
        Row: {
          author_id: string
          body: string
          category: Database["public"]["Enums"]["recommendation_category"]
          created_at: string
          group_id: string | null
          id: string
          locality_id: string | null
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
          locality_id?: string | null
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
          locality_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_requests_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
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
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          locality_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locality_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locality_id?: string
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
      accept_family_invitation: {
        Args: { p_accepted_by_user_id: string; p_token_digest: string }
        Returns: string
      }
      add_group_moderator: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      add_to_waitlist: {
        Args: { p_email: string; p_locality_id: string }
        Returns: undefined
      }
      approve_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
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
          photo_path: string
          poll_options: Json
          post_type: Database["public"]["Enums"]["post_type"]
          user_id: string
        }[]
      }
      join_group: { Args: { p_group_id: string }; Returns: undefined }
      remove_group_moderator: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      transfer_group_ownership: {
        Args: { p_group_id: string; p_new_owner_user_id: string }
        Returns: undefined
      }
      upsert_verification_outcome: {
        Args: {
          p_eligibility_class?: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      event_rsvp_status: "interested" | "going"
      event_status: "upcoming" | "cancelled"
      group_membership_role: "member" | "moderator" | "owner"
      group_membership_status: "pending" | "approved"
      group_visibility: "public" | "private"
      locality_admission_mode: "invite_only" | "waitlist_only"
      post_type: "text" | "photo" | "link" | "poll"
      profile_visibility: "locality_members" | "hidden"
      recommendation_category:
        | "servicos_locais"
        | "saude_bem_estar"
        | "educacao"
        | "esporte_lazer"
        | "alimentacao"
        | "transporte"
        | "moradia"
        | "outros"
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
      event_rsvp_status: ["interested", "going"],
      event_status: ["upcoming", "cancelled"],
      group_membership_role: ["member", "moderator", "owner"],
      group_membership_status: ["pending", "approved"],
      group_visibility: ["public", "private"],
      locality_admission_mode: ["invite_only", "waitlist_only"],
      post_type: ["text", "photo", "link", "poll"],
      profile_visibility: ["locality_members", "hidden"],
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
    },
  },
} as const

