import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Calendar,
  ClipboardList,
  Building2,
  Shield,
  Briefcase,
  DollarSign,
  CalendarOff,
  ScrollText,
} from 'lucide-react';
import salemLogo from '@/assets/salem-logo.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['student', 'tutor', 'finance', 'admin'] },
  { label: 'My Profile', href: '/profile', icon: Users, roles: ['student'] },
  { label: 'Students', href: '/students', icon: Users, roles: ['admin', 'tutor', 'finance'] },
  { label: 'Admissions', href: '/admissions', icon: GraduationCap, roles: ['admin'] },
  { label: 'Enrollments', href: '/enrollments', icon: BookOpen, roles: ['admin'] },
  { label: 'Courses', href: '/courses', icon: BookOpen, roles: ['admin', 'tutor'] },
  { label: 'Tutor Assignments', href: '/tutor-assignments', icon: Users, roles: ['admin'] },
  { label: 'Results', href: '/results', icon: ClipboardList, roles: ['student', 'tutor', 'admin'] },
  { label: 'Payments', href: '/payments', icon: CreditCard, roles: ['student', 'finance', 'admin'] },
  { label: 'Fee Structures', href: '/fee-structures', icon: CreditCard, roles: ['admin', 'finance'] },
  { label: 'Expenses', href: '/expenses', icon: CreditCard, roles: ['admin', 'finance'] },
  { label: 'Employees', href: '/employees', icon: Briefcase, roles: ['admin', 'finance'] },
  { label: 'Payroll', href: '/payroll', icon: DollarSign, roles: ['admin', 'finance'] },
  { label: 'Leave Management', href: '/leave-management', icon: CalendarOff, roles: ['admin'] },
  { label: 'Transcripts', href: '/transcripts', icon: FileText, roles: ['admin'] },
  { label: 'Programs', href: '/programs', icon: Building2, roles: ['admin'] },
  { label: 'Semesters', href: '/semesters', icon: Calendar, roles: ['admin'] },
  { label: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'finance'] },
  { label: 'User Management', href: '/users', icon: Shield, roles: ['admin'] },
  { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText, roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNavItems = navItems.filter(item => 
    role && item.roles.includes(role)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string | null) => {
    const labels: Record<string, string> = {
      student: 'Student',
      tutor: 'Tutor / Lecturer',
      finance: 'Finance Officer',
      admin: 'System Administrator',
    };
    return role ? labels[role] || role : 'User';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <img src={salemLogo} alt="Salem Uganda Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Salem SIMS</h1>
              <p className="text-xs text-sidebar-foreground/60">Institution Management</p>
            </div>
            <button 
              className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "sidebar-link",
                    isActive && "active"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User card */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <Avatar className="w-10 h-10 border-2 border-sidebar-primary">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {getRoleLabel(role)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <button
              className="p-2 rounded-lg hover:bg-muted lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 ml-auto">
              {/* Notifications */}
              <NotificationBell />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user?.email ? getInitials(user.email) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.email}</span>
                      <span className="text-xs text-muted-foreground">{getRoleLabel(role)}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
