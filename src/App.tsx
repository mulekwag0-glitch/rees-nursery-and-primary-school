import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import Results from "./pages/Results";
import Accounts from "./pages/Accounts";
import Payments from "./pages/Payments";
import Programs from "./pages/Programs";
import Semesters from "./pages/Semesters";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import Admissions from "./pages/Admissions";
import Enrollments from "./pages/Enrollments";
import Certificates from "./pages/Certificates";
import FeeStructures from "./pages/FeeStructures";
import TutorAssignment from "./pages/TutorAssignment";
import Expenses from "./pages/Expenses";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import LeaveManagement from "./pages/LeaveManagement";
import AuditLogs from "./pages/AuditLogs";
import ReportCards from "./pages/ReportCards";
import Verify from "./pages/Verify";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <AiAssistant />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute allowedRoles={['admin', 'tutor', 'finance']}><Students /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute allowedRoles={['admin', 'tutor']}><Courses /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute allowedRoles={['admin', 'tutor']}><Results /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Accounts /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Payments /></ProtectedRoute>} />
            <Route path="/programs" element={<ProtectedRoute allowedRoles={['admin']}><Programs /></ProtectedRoute>} />
            <Route path="/semesters" element={<ProtectedRoute allowedRoles={['admin']}><Semesters /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Reports /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
            <Route path="/admissions" element={<ProtectedRoute allowedRoles={['admin']}><Admissions /></ProtectedRoute>} />
            <Route path="/enrollments" element={<ProtectedRoute allowedRoles={['admin']}><Enrollments /></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute allowedRoles={['admin']}><Certificates /></ProtectedRoute>} />
            <Route path="/report-cards" element={<ProtectedRoute allowedRoles={['admin']}><ReportCards /></ProtectedRoute>} />
            <Route path="/fee-structures" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><FeeStructures /></ProtectedRoute>} />
            <Route path="/tutor-assignments" element={<ProtectedRoute allowedRoles={['admin']}><TutorAssignment /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Expenses /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Employees /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Payroll /></ProtectedRoute>} />
            <Route path="/leave-management" element={<ProtectedRoute allowedRoles={['admin']}><LeaveManagement /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
