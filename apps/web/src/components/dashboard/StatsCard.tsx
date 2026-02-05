import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        positive: boolean;
    };
    className?: string;
}

export default function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className
}: StatsCardProps) {
    return (
        <div className={cn("bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                {trend && (
                    <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-lg",
                        trend.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                        {trend.positive ? '+' : ''}{trend.value}
                    </span>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                {description && (
                    <p className="text-xs text-slate-400 mt-2">{description}</p>
                )}
            </div>
        </div>
    );
}
