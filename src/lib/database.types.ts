export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      user_profile: {
        Row: {
          id: string
          user_id: string
          height_cm: number
          birth_date: string
          sex: 'male' | 'female' | 'other'
          goal_phase: 'cut' | 'bulk' | 'lean_bulk' | 'maintenance' | null
          tdee_kcal: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          wake_time: string | null
          workout_start: string | null
          workout_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          height_cm: number
          birth_date: string
          sex: 'male' | 'female' | 'other'
          goal_phase?: 'cut' | 'bulk' | 'lean_bulk' | 'maintenance' | null
          tdee_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          wake_time?: string | null
          workout_start?: string | null
          workout_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          height_cm?: number
          birth_date?: string
          sex?: 'male' | 'female' | 'other'
          goal_phase?: 'cut' | 'bulk' | 'lean_bulk' | 'maintenance' | null
          tdee_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          wake_time?: string | null
          workout_start?: string | null
          workout_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      weight_log: {
        Row: {
          id: string
          user_id: string
          logged_date: string
          weight_kg: number
          body_fat_pct: number | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          logged_date: string
          weight_kg: number
          body_fat_pct?: number | null
          note?: string | null
          created_at?: string
        }
        Update: {
          weight_kg?: number
          body_fat_pct?: number | null
          note?: string | null
        }
        Relationships: []
      }
      phase_history: {
        Row: {
          id: string
          user_id: string
          phase: 'cut' | 'bulk' | 'lean_bulk' | 'maintenance'
          detected_at: string
          confidence: number | null
          detection_v: number
          caloric_delta: number | null
          weight_trend: number | null
          source: 'auto' | 'manual'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phase: 'cut' | 'bulk' | 'lean_bulk' | 'maintenance'
          detected_at: string
          confidence?: number | null
          detection_v?: number
          caloric_delta?: number | null
          weight_trend?: number | null
          source?: 'auto' | 'manual'
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      meals: {
        Row: {
          id: string
          user_id: string
          logged_date: string
          meal_name: string
          meal_order: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          logged_date: string
          meal_name?: string
          meal_order?: number
          notes?: string | null
          created_at?: string
        }
        Update: { meal_name?: string; meal_order?: number; notes?: string | null }
        Relationships: []
      }
      meal_items: {
        Row: {
          id: string
          meal_id: string
          food_name: string
          off_product_id: string | null
          quantity_g: number
          kcal: number
          protein_g: number
          carbs_g: number
          fat_g: number
          fiber_g: number | null
          created_at: string
        }
        Insert: {
          id?: string
          meal_id: string
          food_name: string
          off_product_id?: string | null
          quantity_g: number
          kcal: number
          protein_g: number
          carbs_g: number
          fat_g: number
          fiber_g?: number | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          logged_date: string
          workout_type: string
          title: string | null
          duration_min: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          logged_date: string
          workout_type: string
          title?: string | null
          duration_min?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: { title?: string | null; duration_min?: number | null; notes?: string | null }
        Relationships: []
      }
      workout_sets: {
        Row: {
          id: string
          workout_id: string
          exercise_name: string
          set_number: number
          reps: number | null
          weight_kg: number | null
          duration_sec: number | null
          rpe: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_name: string
          set_number: number
          reps?: number | null
          weight_kg?: number | null
          duration_sec?: number | null
          rpe?: number | null
          created_at?: string
        }
        Update: {
          exercise_name?: string
          set_number?: number
          reps?: number | null
          weight_kg?: number | null
          duration_sec?: number | null
          rpe?: number | null
        }
        Relationships: []
      }
      whoop_daily: {
        Row: {
          id: string
          user_id: string
          cycle_date: string
          cycle_id: number
          recovery_score: number | null
          hrv_rmssd_ms: number | null
          resting_hr_bpm: number | null
          sleep_performance: number | null
          sleep_duration_min: number | null
          sleep_disturbances: number | null
          day_strain: number | null
          energy_burnt_kcal: number | null
          raw_json: Json | null
          synced_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cycle_date: string
          cycle_id: number
          recovery_score?: number | null
          hrv_rmssd_ms?: number | null
          resting_hr_bpm?: number | null
          sleep_performance?: number | null
          sleep_duration_min?: number | null
          sleep_disturbances?: number | null
          day_strain?: number | null
          energy_burnt_kcal?: number | null
          raw_json?: Json | null
          synced_at?: string
        }
        Update: {
          recovery_score?: number | null
          hrv_rmssd_ms?: number | null
          resting_hr_bpm?: number | null
          sleep_performance?: number | null
          sleep_duration_min?: number | null
          sleep_disturbances?: number | null
          day_strain?: number | null
          energy_burnt_kcal?: number | null
          raw_json?: Json | null
          synced_at?: string
        }
        Relationships: []
      }
      ai_summaries: {
        Row: {
          id: string
          user_id: string
          summary_date: string
          summary_type: 'daily' | 'weekly'
          model_used: string
          prompt_tokens: number | null
          output_tokens: number | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          summary_date: string
          summary_type: 'daily' | 'weekly'
          model_used: string
          prompt_tokens?: number | null
          output_tokens?: number | null
          content: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type UserProfile = Database['public']['Tables']['user_profile']['Row']
export type WeightLog = Database['public']['Tables']['weight_log']['Row']
export type PhaseHistory = Database['public']['Tables']['phase_history']['Row']
export type Meal = Database['public']['Tables']['meals']['Row']
export type MealItem = Database['public']['Tables']['meal_items']['Row']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row']
export type WhoopDaily = Database['public']['Tables']['whoop_daily']['Row']
export type AiSummary = Database['public']['Tables']['ai_summaries']['Row']
export type Phase = 'cut' | 'bulk' | 'lean_bulk' | 'maintenance'
