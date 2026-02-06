export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      matches: {
        Row: {
          challenged_id: string;
          challenger_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          player1_score: number | null;
          player2_score: number | null;
          scheduled_date: string | null;
          score: string | null;
          status: string;
          updated_at: string;
          winner_id: string | null;
        };
        Insert: {
          challenged_id: string;
          challenger_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          player1_score?: number | null;
          player2_score?: number | null;
          scheduled_date?: string | null;
          score?: string | null;
          status?: string;
          updated_at?: string;
          winner_id?: string | null;
        };
        Update: {
          challenged_id?: string;
          challenger_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          player1_score?: number | null;
          player2_score?: number | null;
          scheduled_date?: string | null;
          score?: string | null;
          status?: string;
          updated_at?: string;
          winner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_challenged_id_fkey";
            columns: ["challenged_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_challenger_id_fkey";
            columns: ["challenger_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };

      players: {
        Row: {
          id: string;
          name: string;
          last_name: string | null;
          email: string;
          is_admin: boolean | null;
          clubs: string[] | null;
          created_at: string | null;
          phone: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          last_name?: string | null;
          email: string;
          is_admin?: boolean | null;
          clubs?: string[] | null;
          created_at?: string | null;
          phone?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "players_clubs_fkey";
            columns: ["clubs"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          }
        ];
      };

      clubs: {
        Row: {
          address: string | null;
          city: string;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          sport: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          city: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          sport: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          sport?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          avatar_url: string | null;
          club_id: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          sport: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          club_id?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          sport?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          club_id?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          sport?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          }
        ];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      [_ in never]: never;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals["public"];

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T]["Row"];

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Insert"];

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Update"];

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
