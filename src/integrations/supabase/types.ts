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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credit_units: number
          description: string | null
          id: string
          name: string
          program_id: string
          semester_number: number
          updated_at: string
          year_of_study: number
        }
        Insert: {
          code: string
          created_at?: string
          credit_units?: number
          description?: string | null
          id?: string
          name: string
          program_id: string
          semester_number?: number
          updated_at?: string
          year_of_study?: number
        }
        Update: {
          code?: string
          created_at?: string
          credit_units?: number
          description?: string | null
          id?: string
          name?: string
          program_id?: string
          semester_number?: number
          updated_at?: string
          year_of_study?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_logs: {
        Row: {
          created_at: string
          document_type: string
          generated_by: string
          id: string
          program_name: string | null
          student_id: string
          student_name: string
          student_number: string
        }
        Insert: {
          created_at?: string
          document_type: string
          generated_by: string
          id?: string
          program_name?: string | null
          student_id: string
          student_name: string
          student_number: string
        }
        Update: {
          created_at?: string
          document_type?: string
          generated_by?: string
          id?: string
          program_name?: string | null
          student_id?: string
          student_name?: string
          student_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          created_at: string
          department: string
          email: string
          full_name: string
          hire_date: string
          id: string
          job_title: string
          nssf_number: string | null
          phone: string | null
          salary: number
          status: string
          tin_number: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          department?: string
          email: string
          full_name: string
          hire_date?: string
          id?: string
          job_title: string
          nssf_number?: string | null
          phone?: string | null
          salary?: number
          status?: string
          tin_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          hire_date?: string
          id?: string
          job_title?: string
          nssf_number?: string | null
          phone?: string | null
          salary?: number
          status?: string
          tin_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          receipt_reference: string | null
          recorded_by: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          receipt_reference?: string | null
          recorded_by: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          receipt_reference?: string | null
          recorded_by?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_structures: {
        Row: {
          created_at: string
          id: string
          other_fees: number
          program_id: string
          semester_id: string
          total_fee: number | null
          tuition_fee: number
        }
        Insert: {
          created_at?: string
          id?: string
          other_fees?: number
          program_id: string
          semester_id: string
          total_fee?: number | null
          tuition_fee?: number
        }
        Update: {
          created_at?: string
          id?: string
          other_fees?: number
          program_id?: string
          semester_id?: string
          total_fee?: number | null
          tuition_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          receipt_number: string
          recorded_by: string
          semester_id: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_number: string
          recorded_by: string
          semester_id: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_number?: string
          recorded_by?: string
          semester_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number
          basic_salary: number
          created_at: string
          employee_id: string
          id: string
          net_pay: number | null
          notes: string | null
          nssf_deduction: number
          other_deductions: number
          pay_period: string
          paye_tax: number
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allowances?: number
          basic_salary?: number
          created_at?: string
          employee_id: string
          id?: string
          net_pay?: number | null
          notes?: string | null
          nssf_deduction?: number
          other_deductions?: number
          pay_period: string
          paye_tax?: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allowances?: number
          basic_salary?: number
          created_at?: string
          employee_id?: string
          id?: string
          net_pay?: number | null
          notes?: string | null
          nssf_deduction?: number
          other_deductions?: number
          pay_period?: string
          paye_tax?: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string
          created_at: string
          description: string | null
          duration_years: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          duration_years?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          duration_years?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          coursework_marks: number | null
          created_at: string
          exam_marks: number | null
          grade: string | null
          grade_point: number | null
          id: string
          status: Database["public"]["Enums"]["result_status"]
          student_course_id: string
          total_marks: number | null
          tutor_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          coursework_marks?: number | null
          created_at?: string
          exam_marks?: number | null
          grade?: string | null
          grade_point?: number | null
          id?: string
          status?: Database["public"]["Enums"]["result_status"]
          student_course_id: string
          total_marks?: number | null
          tutor_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          coursework_marks?: number | null
          created_at?: string
          exam_marks?: number | null
          grade?: string | null
          grade_point?: number | null
          id?: string
          status?: Database["public"]["Enums"]["result_status"]
          student_course_id?: string
          total_marks?: number | null
          tutor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_student_course_id_fkey"
            columns: ["student_course_id"]
            isOneToOne: true
            referencedRelation: "student_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          results_open: boolean | null
          semester_number: number
          start_date: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          results_open?: boolean | null
          semester_number: number
          start_date: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          results_open?: boolean | null
          semester_number?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      student_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          semester_id: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          semester_id: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          semester_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          current_year: number
          enrollment_date: string
          id: string
          program_id: string
          status: Database["public"]["Enums"]["student_status"]
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_year?: number
          enrollment_date?: string
          id?: string
          program_id: string
          status?: Database["public"]["Enums"]["student_status"]
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_year?: number
          enrollment_date?: string
          id?: string
          program_id?: string
          status?: Database["public"]["Enums"]["student_status"]
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          semester_id: string
          tutor_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          semester_id: string
          tutor_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          semester_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
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
      calculate_grade: {
        Args: { marks: number }
        Returns: {
          grade: string
          grade_point: number
        }[]
      }
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
      app_role: "student" | "tutor" | "finance" | "admin"
      result_status: "draft" | "submitted" | "approved" | "rejected"
      student_status: "active" | "inactive" | "graduated" | "suspended"
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
      app_role: ["student", "tutor", "finance", "admin"],
      result_status: ["draft", "submitted", "approved", "rejected"],
      student_status: ["active", "inactive", "graduated", "suspended"],
    },
  },
} as const
