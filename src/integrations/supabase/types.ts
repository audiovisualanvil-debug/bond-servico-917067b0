export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      completion_reports: {
        Row: {
          checklist: Json
          completed_at: string
          created_at: string
          description: string
          id: string
          observations: string | null
          photos_after: string[] | null
          photos_before: string[] | null
          service_order_id: string
          technician_signature: string
        }
        Insert: {
          checklist?: Json
          completed_at?: string
          created_at?: string
          description: string
          id?: string
          observations?: string | null
          photos_after?: string[] | null
          photos_before?: string[] | null
          service_order_id: string
          technician_signature?: string
        }
        Update: {
          checklist?: Json
          completed_at?: string
          created_at?: string
          description?: string
          id?: string
          observations?: string | null
          photos_after?: string[] | null
          photos_before?: string[] | null
          service_order_id?: string
          technician_signature?: string
        }
        Relationships: [
          {
            foreignKeyName: "completion_reports_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cnpj: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cnpj?: string | null
          company?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cnpj?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          imobiliaria_id: string
          neighborhood: string
          state: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address: string
          city?: string
          created_at?: string
          id?: string
          imobiliaria_id: string
          neighborhood?: string
          state?: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          imobiliaria_id?: string
          neighborhood?: string
          state?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_imobiliaria_id_fkey"
            columns: ["imobiliaria_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          service_order_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          service_order_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_comments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          real_cost: number
          service_order_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          real_cost?: number
          service_order_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          real_cost?: number
          service_order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          admin_approved_at: string | null
          client_approved_at: string | null
          completed_at: string | null
          created_at: string
          estimated_deadline: number | null
          execution_started_at: string | null
          final_price: number | null
          id: string
          imobiliaria_id: string
          os_number: string | null
          photos: string[] | null
          problem: string
          property_id: string
          quote_sent_at: string | null
          requester_name: string
          status: Database["public"]["Enums"]["os_status"]
          technician_cost: number | null
          technician_description: string | null
          tecnico_id: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          admin_approved_at?: string | null
          client_approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_deadline?: number | null
          execution_started_at?: string | null
          final_price?: number | null
          id?: string
          imobiliaria_id: string
          os_number?: string | null
          photos?: string[] | null
          problem: string
          property_id: string
          quote_sent_at?: string | null
          requester_name?: string
          status?: Database["public"]["Enums"]["os_status"]
          technician_cost?: number | null
          technician_description?: string | null
          tecnico_id?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          admin_approved_at?: string | null
          client_approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_deadline?: number | null
          execution_started_at?: string | null
          final_price?: number | null
          id?: string
          imobiliaria_id?: string
          os_number?: string | null
          photos?: string[] | null
          problem?: string
          property_id?: string
          quote_sent_at?: string | null
          requester_name?: string
          status?: Database["public"]["Enums"]["os_status"]
          technician_cost?: number | null
          technician_description?: string | null
          tecnico_id?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_imobiliaria_id_fkey"
            columns: ["imobiliaria_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "imobiliaria" | "tecnico"
      os_status:
        | "aguardando_orcamento_prestador"
        | "aguardando_aprovacao_admin"
        | "enviado_imobiliaria"
        | "aprovado_aguardando"
        | "em_execucao"
        | "concluido"
      urgency_level: "baixa" | "media" | "alta" | "critica"
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
      app_role: ["admin", "imobiliaria", "tecnico"],
      os_status: [
        "aguardando_orcamento_prestador",
        "aguardando_aprovacao_admin",
        "enviado_imobiliaria",
        "aprovado_aguardando",
        "em_execucao",
        "concluido",
      ],
      urgency_level: ["baixa", "media", "alta", "critica"],
    },
  },
} as const
