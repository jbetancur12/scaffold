import { useAuth } from '@/context/AuthContext';
import {
    Users,
    Activity,
    ShieldCheck,
    Clock,
    ArrowRight
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Welcome Section */}
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {user?.email.split('@')[0]}!</h2>
                    <p className="text-slate-500 mt-2">Here's what's happening with your system today.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total Users"
                        value="1,284"
                        icon={Users}
                        trend={{ value: '12%', positive: true }}
                        description="Across all registration paths"
                    />
                    <StatsCard
                        title="Active Sessions"
                        value="42"
                        icon={Activity}
                        trend={{ value: '5%', positive: false }}
                        description="Currently authenticated users"
                    />
                    <StatsCard
                        title="Last Backup"
                        value="2h ago"
                        icon={Clock}
                        description="System health: Excellent"
                    />
                    <StatsCard
                        title="Security Level"
                        value="High"
                        icon={ShieldCheck}
                        description="Latest audit passed"
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* User Info card (Modernized) */}
                    <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Users className="h-32 w-32 text-primary" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Profile Details</h3>
                            <div className="space-y-5">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Authenticated As</p>
                                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">System Permissions</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                        <p className="text-sm font-semibold text-primary capitalize">{user?.role}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Account Status</p>
                                    <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                                        Active
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions / Activity (Mocked) */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5">
                                View Full Logs <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-6">
                            {[
                                { user: 'juliana@scaffold.dev', action: 'Created a new minorista account', time: '5 mins ago', icon: Users },
                                { user: 'admin@scaffold.local', action: 'Updated security policies', time: '1 hour ago', icon: ShieldCheck },
                                { user: 'system', action: 'Daily database backup completed', time: '2 hours ago', icon: Clock },
                                { user: 'mike@transfer.net', action: 'Logged in from a new device', time: '4 hours ago', icon: Activity },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                                        <item.icon className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-600 leading-snug">
                                            <span className="font-semibold text-slate-900">{item.user}</span> {item.action}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
