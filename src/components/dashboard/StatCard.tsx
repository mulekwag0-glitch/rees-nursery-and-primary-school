import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-info text-info-foreground',
};

const iconBgStyles = {
  primary: 'bg-primary-foreground/20',
  secondary: 'bg-secondary-foreground/20',
  success: 'bg-success-foreground/20',
  warning: 'bg-warning-foreground/20',
  info: 'bg-info-foreground/20',
};

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'primary',
  className 
}: StatCardProps) {
  return (
    <div className={cn(
      "stat-card rounded-xl",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-sm opacity-70">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs opacity-80">
              <span className={trend.value >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              {' '}{trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconBgStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
