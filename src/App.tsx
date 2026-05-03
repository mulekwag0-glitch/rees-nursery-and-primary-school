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
import Payments from "./pages/Payments";
import Programs from "./pages/Programs";
import Semesters from "./pages/Semesters";
import Reports from "./pages/Reports";
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
import ReportCards from "./pages/ReportCards";
import Verify from "./pages/Verify";
import Schemes from "./pages/Schemes";
import Timetables from "./pages/Timetables";
import LessonPlans from "./pages/LessonPlans";
import Administration from "./pages/Administration";
import StoreAssets from "./pages/StoreAssets";
import WorkPlan from "./pages/WorkPlan";
import Attendance from "./pages/Attendance";
import NotFound from "./pages/NotFound";
import PupilProfileView from "./pages/PupilProfileView";
import StockPOS from "./pages/StockPOS";

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
            <Route path="/students" element={<ProtectedRoute module="pupils" allowedRoles={['admin', 'tutor', 'finance']}><Students /></ProtectedRoute>} />
            <Route path="/students/:id" element={<ProtectedRoute module="pupils" allowedRoles={['admin', 'tutor', 'finance']}><PupilProfileView /></ProtectedRoute>} />
            <Route path="/admissions" element={<ProtectedRoute module="admissions" allowedRoles={['admin']}><Admissions /></ProtectedRoute>} />
            <Route path="/enrollments" element={<ProtectedRoute module="enrollments" allowedRoles={['admin']}><Enrollments /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute module="structures" allowedRoles={['admin', 'tutor']}><Courses /></ProtectedRoute>} />
            <Route path="/schemes" element={<ProtectedRoute module="structures" allowedRoles={['admin', 'tutor']}><Schemes /></ProtectedRoute>} />
            <Route path="/timetables" element={<ProtectedRoute module="structures" allowedRoles={['admin', 'tutor']}><Timetables /></ProtectedRoute>} />
            <Route path="/lesson-plans" element={<ProtectedRoute module="structures" allowedRoles={['admin', 'tutor']}><LessonPlans /></ProtectedRoute>} />
            <Route path="/tutor-assignments" element={<ProtectedRoute module="tutor_assignments" allowedRoles={['admin']}><TutorAssignment /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute module="results" allowedRoles={['admin', 'tutor']}><Results /></ProtectedRoute>} />
            <Route path="/report-cards" element={<ProtectedRoute module="report_cards" allowedRoles={['admin']}><ReportCards /></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute module="certificates" allowedRoles={['admin']}><Certificates /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute module="payments" allowedRoles={['admin', 'finance']}><Payments /></ProtectedRoute>} />
            <Route path="/fee-structures" element={<ProtectedRoute module="payments" allowedRoles={['admin', 'finance']}><FeeStructures /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute module="expenses" allowedRoles={['admin', 'finance']}><Expenses /></ProtectedRoute>} />
            <Route path="/stock-pos" element={<ProtectedRoute module="administration" allowedRoles={['admin', 'finance']}><StockPOS /></ProtectedRoute>} />
            <Route path="/work-plan" element={<ProtectedRoute module="expenses" allowedRoles={['admin']}><WorkPlan /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute module="hr" allowedRoles={['admin', 'finance']}><Employees /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute module="hr" allowedRoles={['admin', 'finance']}><Payroll /></ProtectedRoute>} />
            <Route path="/leave-management" element={<ProtectedRoute module="hr" allowedRoles={['admin']}><LeaveManagement /></ProtectedRoute>} />
            <Route path="/administration" element={<ProtectedRoute module="administration" allowedRoles={['admin']}><Administration /></ProtectedRoute>} />
            <Route path="/store-assets" element={<ProtectedRoute module="administration" allowedRoles={['admin']}><StoreAssets /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute module="attendance" allowedRoles={['admin', 'tutor']}><Attendance /></ProtectedRoute>} />
            <Route path="/programs" element={<ProtectedRoute module="classes" allowedRoles={['admin']}><Programs /></ProtectedRoute>} />
            <Route path="/semesters" element={<ProtectedRoute module="terms" allowedRoles={['admin']}><Semesters /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute module="reports" allowedRoles={['admin', 'finance']}><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute module="settings" allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
