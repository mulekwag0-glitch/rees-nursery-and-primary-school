import { z } from 'zod';

// Sanitize text input - strip potential CSV injection characters
export function sanitizeText(input: string): string {
  return input.replace(/^[=+\-@\t\r]/, "'$&").trim();
}

// ==================== Auth ====================
export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ==================== User Management ====================
export const createUserSchema = z.object({
  email: z.string().trim().email('Invalid email').max(255),
  password: z.string().min(6, 'Min 6 characters').max(128),
  fullName: z.string().trim().min(1, 'Name is required').max(200),
  role: z.enum(['student', 'tutor', 'finance', 'admin']),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Min 6 characters').max(128),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ==================== Employees ====================
export const employeeSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().max(20).optional().or(z.literal('')),
  department: z.string().min(1),
  jobTitle: z.string().trim().min(1, 'Job title is required').max(200),
  hireDate: z.string().min(1, 'Hire date is required'),
  salary: z.number().min(0, 'Salary must be positive').max(999999999),
  bankName: z.string().max(200).optional().or(z.literal('')),
  bankAccount: z.string().max(50).optional().or(z.literal('')),
  nssfNumber: z.string().max(50).optional().or(z.literal('')),
  tinNumber: z.string().max(50).optional().or(z.literal('')),
});

// ==================== Payroll ====================
export const payrollSchema = z.object({
  employeeId: z.string().uuid('Select an employee'),
  payPeriod: z.string().trim().min(1, 'Pay period is required').max(50),
  basicSalary: z.number().min(0).max(999999999),
  allowances: z.number().min(0).max(999999999),
  nssfDeduction: z.number().min(0).max(999999999),
  payeTax: z.number().min(0).max(999999999),
  otherDeductions: z.number().min(0).max(999999999),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

// ==================== Leave ====================
export const leaveRequestSchema = z.object({
  employeeId: z.string().uuid('Select an employee'),
  leaveType: z.string().min(1),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().max(1000).optional().or(z.literal('')),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// ==================== Expenses ====================
export const expenseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  amount: z.number().positive('Amount must be positive').max(999999999),
  category: z.string().min(1),
  expenseDate: z.string().min(1),
  receiptRef: z.string().max(100).optional().or(z.literal('')),
});

// ==================== Payments ====================
export const paymentSchema = z.object({
  studentId: z.string().uuid('Select a student'),
  semesterId: z.string().uuid('Select a semester'),
  amount: z.number().positive('Amount must be positive').max(999999999),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'mobile_money', 'cheque']),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

// ==================== Admissions ====================
export const admissionSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().max(20).optional().or(z.literal('')),
  programId: z.string().uuid('Select a program'),
  currentYear: z.number().int().min(1).max(6),
});

// ==================== Utility ====================
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message || 'Validation failed' };
}

// CSV sanitization for exports
export function sanitizeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Prevent CSV injection
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  // Escape quotes and wrap if contains special chars
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
