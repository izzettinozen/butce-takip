/**
 * Bütçe Takip — Veritabanı tipleri (Faz 2)
 *
 * supabase/schema.sql ile birebir uyumlu, elle yazılmış tip tanımları.
 * Supabase tipli istemcisiyle kullanılır: createBrowserClient<Database>(...).
 * Şema değiştiğinde bu dosya da güncellenmelidir.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          dashboard_investment_mode: "savings" | "expense";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          dashboard_investment_mode?: "savings" | "expense";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          dashboard_investment_mode?: "savings" | "expense";
          created_at?: string;
        };
        Relationships: [];
      };

      gider_turleri: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_investment: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          is_investment?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_investment?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gider_turleri_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      gider_kalemleri: {
        Row: {
          id: string;
          user_id: string;
          gider_turu_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gider_turu_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gider_turu_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gider_kalemleri_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gider_kalemleri_gider_turu_id_fkey";
            columns: ["gider_turu_id"];
            isOneToOne: false;
            referencedRelation: "gider_turleri";
            referencedColumns: ["id"];
          },
        ];
      };

      gelir_turleri: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gelir_turleri_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      odeme_turleri: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "odeme_turleri_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      donemler: {
        Row: {
          id: string;
          user_id: string;
          yil: number;
          ay: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          yil: number;
          ay: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          yil?: number;
          ay?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donemler_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      giderler: {
        Row: {
          id: string;
          user_id: string;
          tutar: number;
          gider_turu_id: string;
          gider_kalemi_id: string;
          odeme_turu_id: string;
          aciklama: string | null;
          donem_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tutar: number;
          gider_turu_id: string;
          gider_kalemi_id: string;
          odeme_turu_id: string;
          aciklama?: string | null;
          donem_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tutar?: number;
          gider_turu_id?: string;
          gider_kalemi_id?: string;
          odeme_turu_id?: string;
          aciklama?: string | null;
          donem_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "giderler_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giderler_gider_turu_id_fkey";
            columns: ["gider_turu_id"];
            isOneToOne: false;
            referencedRelation: "gider_turleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giderler_gider_kalemi_id_fkey";
            columns: ["gider_kalemi_id"];
            isOneToOne: false;
            referencedRelation: "gider_kalemleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giderler_odeme_turu_id_fkey";
            columns: ["odeme_turu_id"];
            isOneToOne: false;
            referencedRelation: "odeme_turleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giderler_donem_id_fkey";
            columns: ["donem_id"];
            isOneToOne: false;
            referencedRelation: "donemler";
            referencedColumns: ["id"];
          },
        ];
      };

      gelirler: {
        Row: {
          id: string;
          user_id: string;
          tutar: number;
          gelir_turu_id: string;
          donem_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tutar: number;
          gelir_turu_id: string;
          donem_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tutar?: number;
          gelir_turu_id?: string;
          donem_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gelirler_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gelirler_gelir_turu_id_fkey";
            columns: ["gelir_turu_id"];
            isOneToOne: false;
            referencedRelation: "gelir_turleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gelirler_donem_id_fkey";
            columns: ["donem_id"];
            isOneToOne: false;
            referencedRelation: "donemler";
            referencedColumns: ["id"];
          },
        ];
      };

      butce_hedefleri: {
        Row: {
          id: string;
          user_id: string;
          gider_turu_id: string;
          donem_id: string;
          hedef_tutar: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gider_turu_id: string;
          donem_id: string;
          hedef_tutar: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gider_turu_id?: string;
          donem_id?: string;
          hedef_tutar?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "butce_hedefleri_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "butce_hedefleri_gider_turu_id_fkey";
            columns: ["gider_turu_id"];
            isOneToOne: false;
            referencedRelation: "gider_turleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "butce_hedefleri_donem_id_fkey";
            columns: ["donem_id"];
            isOneToOne: false;
            referencedRelation: "donemler";
            referencedColumns: ["id"];
          },
        ];
      };

      tekrarlayan_giderler: {
        Row: {
          id: string;
          user_id: string;
          tutar: number;
          gider_turu_id: string;
          gider_kalemi_id: string;
          odeme_turu_id: string;
          aciklama: string | null;
          ayin_gunu: number;
          aktif: boolean;
          son_olusturulan_donem_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tutar: number;
          gider_turu_id: string;
          gider_kalemi_id: string;
          odeme_turu_id: string;
          aciklama?: string | null;
          ayin_gunu: number;
          aktif?: boolean;
          son_olusturulan_donem_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tutar?: number;
          gider_turu_id?: string;
          gider_kalemi_id?: string;
          odeme_turu_id?: string;
          aciklama?: string | null;
          ayin_gunu?: number;
          aktif?: boolean;
          son_olusturulan_donem_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tekrarlayan_giderler_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tekrarlayan_giderler_gider_turu_id_fkey";
            columns: ["gider_turu_id"];
            isOneToOne: false;
            referencedRelation: "gider_turleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tekrarlayan_giderler_gider_kalemi_id_fkey";
            columns: ["gider_kalemi_id"];
            isOneToOne: false;
            referencedRelation: "gider_kalemleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tekrarlayan_giderler_odeme_turu_id_fkey";
            columns: ["odeme_turu_id"];
            isOneToOne: false;
            referencedRelation: "odeme_turleri";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tekrarlayan_giderler_son_olusturulan_donem_id_fkey";
            columns: ["son_olusturulan_donem_id"];
            isOneToOne: false;
            referencedRelation: "donemler";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_own_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/* ----------------------------------------------------------------
 * Yardımcı tip aliasları
 * ---------------------------------------------------------------- */

type PublicSchema = Database["public"];

/** Bir tablonun satır (Row) tipi. Örn: Tables<"giderler"> */
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

/** Bir tabloya ekleme (Insert) tipi. Örn: TablesInsert<"giderler"> */
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

/** Bir tabloda güncelleme (Update) tipi. Örn: TablesUpdate<"giderler"> */
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

/* Tablo bazlı kısayol tipler */
export type Profile = Tables<"profiles">;
export type GiderTuru = Tables<"gider_turleri">;
export type GiderKalemi = Tables<"gider_kalemleri">;
export type GelirTuru = Tables<"gelir_turleri">;
export type OdemeTuru = Tables<"odeme_turleri">;
export type Donem = Tables<"donemler">;
export type Gider = Tables<"giderler">;
export type Gelir = Tables<"gelirler">;
export type ButceHedefi = Tables<"butce_hedefleri">;
export type TekrarlayanGider = Tables<"tekrarlayan_giderler">;
