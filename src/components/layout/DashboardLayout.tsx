import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess, ModuleKey } from '@/hooks/useModuleAccess';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CreditCard, FileText, Settings, LogOut, Menu, X,
  ChevronDown, ChevronRight, Calendar, ClipboardList, Building2, Briefcase, DollarSign, CalendarOff, Award, Wallet,
  Clock, FileEdit, Star, Package, Heart, Target,
} from 'lucide-react';
import reesLogo from '@/assets/rees-logo.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  module?: ModuleKey;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  roles: string[];
  module?: ModuleKey;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

const navigation: NavEntry[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['tutor', 'finance', 'admin'] },

  { label: 'Pupils', href: '/students', icon: Users, roles: ['admin', 'tutor', 'finance'], module: 'pupils' },
  { label: 'Admissions', href: '/admissions', icon: GraduationCap, roles: ['admin'], module: 'admissions' },
  { label: 'Enrollments', href: '/enrollments', icon: BookOpen, roles: ['admin'], module: 'enrollments' },
  { label: 'Attendance', href: '/attendance', icon: Calendar, roles: ['admin', 'tutor'], module: 'attendance' },

  {
    label: 'Structures',
    icon: BookOpen,
    roles: ['admin', 'tutor'],
    module: 'structures',
    items: [
      { label: 'Subjects', href: '/courses', icon: BookOpen, roles: ['admin', 'tutor'], module: 'structures' },
      { label: 'Schemes of Work', href: '/schemes', icon: FileEdit, roles: ['admin', 'tutor'], module: 'structures' },
      { label: 'Lesson Timetables', href: '/timetables', icon: Clock, roles: ['admin', 'tutor'], module: 'structures' },
      { label: 'Lesson Plans', href: '/lesson-plans', icon: FileText, roles: ['admin', 'tutor'], module: 'structures' },
    ],
  },

  { label: 'Teacher Assignments', href: '/tutor-assignments', icon: Users, roles: ['admin'], module: 'tutor_assignments' },

  { label: 'Results', href: '/results', icon: ClipboardList, roles: ['tutor', 'admin'], module: 'results' },
  { label: 'Report Cards', href: '/report-cards', icon: FileText, roles: ['admin'], module: 'report_cards' },
  { label: 'Certificates', href: '/certificates', icon: Award, roles: ['admin'], module: 'certificates' },

  {
    label: 'Payments',
    icon: CreditCard,
    roles: ['admin', 'finance'],
    module: 'payments',
    items: [
      { label: 'All Payments', href: '/payments', icon: CreditCard, roles: ['admin', 'finance'], module: 'payments' },
      { label: 'Fee Structures', href: '/fee-structures', icon: DollarSign, roles: ['admin', 'finance'], module: 'payments' },
    ],
  },
  {
    label: 'Expenses',
    icon: Wallet,
    roles: ['admin', 'finance'],
    module: 'expenses',
    items: [
      { label: 'Expenses', href: '/expenses', icon: Wallet, roles: ['admin', 'finance'], module: 'expenses' },
      { label: 'School Budget', href: '/work-plan', icon: Target, roles: ['admin'], module: 'expenses' },
    ],
  },

  {
    label: 'Human Resource',
    icon: Briefcase,
    roles: ['admin', 'finance'],
    module: 'hr',
    items: [
      { label: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'finance'], module: 'hr' },
      { label: 'Payroll', href: '/payroll', icon: DollarSign, roles: ['admin', 'finance'], module: 'hr' },
      { label: 'Leave Management', href: '/leave-management', icon: CalendarOff, roles: ['admin'], module: 'hr' },
    ],
  },

  {
    label: 'Administration',
    icon: Building2,
    roles: ['admin'],
    module: 'administration',
    items: [
      { label: 'PTA & Appraisal', href: '/administration', icon: Star, roles: ['admin'], module: 'administration' },
      { label: 'Store & Assets', href: '/store-assets', icon: Package, roles: ['admin'], module: 'administration' },
    ],
  },

  { label: 'Classes', href: '/programs', icon: Building2, roles: ['admin'], module: 'classes' },
  { label: 'Terms', href: '/semesters', icon: Calendar, roles: ['admin'], module: 'terms' },
  { label: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'finance'], module: 'reports' },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin'], module: 'settings' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  const handleSignOut = async () => { await signOut(); navigate('/auth'); };
  const getInitials = (email: string) => email.substring(0, 2).toUpperCase();
  const getRoleLabel = (r: string | null) => {
    const labels: Record<string, string> = { tutor: 'Teacher', finance: 'Finance Officer', admin: 'System Administrator' };
    return r ? labels[r] || r : 'User';
  };

  const filteredNav = navigation.filter(entry => {
    if (!role) return false;
    if (!entry.roles.includes(role)) return false;
    if (isGroup(entry)) {
      return entry.items.some(item => item.roles.includes(role));
    }
    return true;
  });

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn("sidebar-link", isActive && "active")}
        onClick={() => setSidebarOpen(false)}
      >
        <Icon className="w-5 h-5" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const GroupIcon = group.icon;
    const groupActive = group.items.some(item => location.pathname === item.href);
    const isOpen = openGroups[group.label] ?? groupActive;
    const filteredItems = group.items.filter(item => role && item.roles.includes(role));
    if (filteredItems.length === 0) return null;

    return (
      <Collapsible key={group.label} open={isOpen} onOpenChange={() => toggleGroup(group.label)}>
        <CollapsibleTrigger className={cn("sidebar-link w-full justify-between", groupActive && "text-sidebar-primary")}>
          <div className="flex items-center gap-3">
            <GroupIcon className="w-5 h-5" />
            <span>{group.label}</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-1 mt-1">
          {filteredItems.map(subItem => {
            const SubIcon = subItem.icon;
            const subActive = location.pathname === subItem.href;
            return (
              <Link
                key={subItem.href}
                to={subItem.href}
                className={cn("sidebar-link text-sm", subActive && "active")}
                onClick={() => setSidebarOpen(false)}
              >
                <SubIcon className="w-4 h-4" />
                <span>{subItem.label}</span>
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <img src={reesLogo} alt="Rees Daycare Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Rees Daycare</h1>
              <p className="text-xs text-sidebar-foreground/60">Nursery & Primary</p>
            </div>
            <button className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNav.map(entry => isGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <Avatar className="w-10 h-10 border-2 border-sidebar-primary">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
                <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(role)}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <button className="p-2 rounded-lg hover:bg-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 ml-auto">
              <NotificationBell />
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
                    <Settings className="w-4 h-4 mr-2" />Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
