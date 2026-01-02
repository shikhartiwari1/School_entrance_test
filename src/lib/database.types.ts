export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      tests: {
        Row: {
          id: string;
          title: string;
          description: string;
          duration_minutes: number;
          is_published: boolean;
          total_marks: number;
          passing_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          duration_minutes?: number;
          is_published?: boolean;
          total_marks?: number;
          passing_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          duration_minutes?: number;
          is_published?: boolean;
          total_marks?: number;
          passing_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          test_id: string;
          question_number: number;
          question_type: 'mcq_single' | 'mcq_multiple' | 'fill_blank' | 'true_false' | 'numerical' | 'short_answer' | 'paragraph';
          question_text: string;
          options: Json;
          correct_answers: Json;
          marks: number;
          is_case_sensitive: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          question_number: number;
          question_type: 'mcq_single' | 'mcq_multiple' | 'fill_blank' | 'true_false' | 'numerical' | 'short_answer' | 'paragraph';
          question_text: string;
          options?: Json;
          correct_answers: Json;
          marks?: number;
          is_case_sensitive?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          question_number?: number;
          question_type?: 'mcq_single' | 'mcq_multiple' | 'fill_blank' | 'true_false' | 'numerical' | 'short_answer' | 'paragraph';
          question_text?: string;
          options?: Json;
          correct_answers?: Json;
          marks?: number;
          is_case_sensitive?: boolean;
          created_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          test_id: string;
          student_name: string;
          father_name: string | null;
          class_applying_for: string;
          student_code: string | null;
          slot_number: number | null;
          tab_switch_count: number;
          malpractice_detected: boolean | null;
          time_taken_seconds: number;
          score: number;
          total_marks: number;
          percentage: number;
          correct_count: number;
          wrong_count: number;
          needs_manual_review: boolean;
          status: 'in_progress' | 'completed' | 'auto_submitted' | 'invalidated_by_retest';
          retest_key_used: string | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          student_name: string;
          father_name?: string | null;
          class_applying_for: string;
          student_code?: string | null;
          slot_number?: number | null;
          tab_switch_count?: number;
          malpractice_detected?: boolean | null;
          time_taken_seconds?: number;
          score?: number;
          total_marks?: number;
          percentage?: number;
          correct_count?: number;
          wrong_count?: number;
          needs_manual_review?: boolean;
          status?: 'in_progress' | 'completed' | 'auto_submitted' | 'invalidated_by_retest';
          retest_key_used?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          student_name?: string;
          father_name?: string | null;
          class_applying_for?: string;
          student_code?: string | null;
          slot_number?: number | null;
          tab_switch_count?: number;
          malpractice_detected?: boolean | null;
          time_taken_seconds?: number;
          score?: number;
          total_marks?: number;
          percentage?: number;
          correct_count?: number;
          wrong_count?: number;
          needs_manual_review?: boolean;
          status?: 'in_progress' | 'completed' | 'auto_submitted' | 'invalidated_by_retest';
          retest_key_used?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
      };
      answers: {
        Row: {
          id: string;
          submission_id: string;
          question_id: string;
          student_answer: Json;
          is_correct: boolean | null;
          marks_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_id: string;
          student_answer?: Json;
          is_correct?: boolean | null;
          marks_awarded?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          question_id?: string;
          student_answer?: Json;
          is_correct?: boolean | null;
          marks_awarded?: number;
          created_at?: string;
        };
      };
      slots: {
        Row: {
          id: string;
          test_id: string;
          slot_number: number;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          slot_number: number;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          slot_number?: number;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          created_at?: string;
        };
      };
      access_codes: {
        Row: {
          id: string;
          slot_id: string;
          code: string;
          valid_until: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slot_id: string;
          code: string;
          valid_until: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slot_id?: string;
          code?: string;
          valid_until?: string;
          created_at?: string;
        };
      };
      retest_keys: {
        Row: {
          id: string;
          test_id: string;
          submission_id: string;
          slot_number: number;
          student_name: string;
          key: string;
          is_used: boolean;
          expires_at: string;
          used_by_submission_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          submission_id: string;
          slot_number: number;
          student_name: string;
          key: string;
          is_used?: boolean;
          expires_at: string;
          used_by_submission_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          submission_id?: string;
          slot_number?: number;
          student_name?: string;
          key?: string;
          is_used?: boolean;
          expires_at?: string;
          used_by_submission_id?: string | null;
          created_at?: string;
        };
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
}
