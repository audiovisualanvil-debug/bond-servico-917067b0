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
    PostgrestVersion: "14.1"
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
          technician_signature: string
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
          {
            foreignKeyName: "completion_reports_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: true
            referencedRelation: "service_orders_client"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          code: string | null
          created_at: string
          id: string
          imobiliaria_id: string
          neighborhood: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          state: string
          tenant_name: string | null
          tenant_phone: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address: string
          city: string
          code?: string | null
          created_at?: string
          id?: string
          imobiliaria_id: string
          neighborhood: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          state?: string
          tenant_name?: string | null
          tenant_phone?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string
          code?: string | null
          created_at?: string
          id?: string
          imobiliaria_id?: string
          neighborhood?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          state?: string
          tenant_name?: string | null
          tenant_phone?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_prop_imobiliaria_profile"
            columns: ["imobiliaria_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          service_order_id: string
          user_id: string
          visible_to_imobiliaria: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          service_order_id: string
          user_id: string
          visible_to_imobiliaria?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          service_order_id?: string
          user_id?: string
          visible_to_imobiliaria?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "service_order_comments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_comments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders_client"
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
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders_client"
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
          labor_cost: number | null
          material_cost: number | null
          os_number: string
          payment_method: string | null
          photos: string[] | null
          problem: string
          property_id: string
          quote_sent_at: string | null
          requester_name: string
          status: Database["public"]["Enums"]["os_status"]
          tax_cost: number | null
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
          labor_cost?: number | null
          material_cost?: number | null
          os_number: string
          payment_method?: string | null
          photos?: string[] | null
          problem: string
          property_id: string
          quote_sent_at?: string | null
          requester_name: string
          status?: Database["public"]["Enums"]["os_status"]
          tax_cost?: number | null
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
          labor_cost?: number | null
          material_cost?: number | null
          os_number?: string
          payment_method?: string | null
          photos?: string[] | null
          problem?: string
          property_id?: string
          quote_sent_at?: string | null
          requester_name?: string
          status?: Database["public"]["Enums"]["os_status"]
          tax_cost?: number | null
          technician_cost?: number | null
          technician_description?: string | null
          tecnico_id?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_so_imobiliaria_profile"
            columns: ["imobiliaria_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_so_tecnico_profile"
            columns: ["tecnico_id"]
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
      service_order_items_client: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          service_order_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          service_order_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          service_order_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders_client"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders_client: {
        Row: {
          admin_approved_at: string | null
          client_approved_at: string | null
          completed_at: string | null
          created_at: string | null
          estimated_deadline: number | null
          execution_started_at: string | null
          final_price: number | null
          id: string | null
          imobiliaria_id: string | null
          os_number: string | null
          photos: string[] | null
          problem: string | null
          property_id: string | null
          quote_sent_at: string | null
          requester_name: string | null
          status: Database["public"]["Enums"]["os_status"] | null
          technician_description: string | null
          tecnico_id: string | null
          updated_at: string | null
          urgency: Database["public"]["Enums"]["urgency_level"] | null
        }
        Insert: {
          admin_approved_at?: string | null
          client_approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_deadline?: number | null
          execution_started_at?: string | null
          final_price?: number | null
          id?: string | null
          imobiliaria_id?: string | null
          os_number?: string | null
          photos?: string[] | null
          problem?: string | null
          property_id?: string | null
          quote_sent_at?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["os_status"] | null
          technician_description?: string | null
          tecnico_id?: string | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Update: {
          admin_approved_at?: string | null
          client_approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_deadline?: number | null
          execution_started_at?: string | null
          final_price?: number | null
          id?: string | null
          imobiliaria_id?: string | null
          os_number?: string | null
          photos?: string[] | null
          problem?: string | null
          property_id?: string | null
          quote_sent_at?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["os_status"] | null
          technician_description?: string | null
          tecnico_id?: string | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_so_imobiliaria_profile"
            columns: ["imobiliaria_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_so_tecnico_profile"
            columns: ["tecnico_id"]
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
        ]
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
