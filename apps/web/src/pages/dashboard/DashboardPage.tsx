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
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">¡Bienvenido de nuevo, {user?.email.split('@')[0]}!</h2>
                    <p className="text-slate-500 mt-2">Esto es lo que está pasando en tu sistema hoy.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Usuarios Totales"
                        value="1,284"
                        icon={Users}
                        trend={{ value: '12%', positive: true }}
                        description="En todas las rutas de registro"
                    />
                    <StatsCard
                        title="Sesiones Activas"
                        value="42"
                        icon={Activity}
                        trend={{ value: '5%', positive: false }}
                        description="Usuarios autenticados actualmente"
                    />
                    <StatsCard
                        title="Último Respaldo"
                        value="Hace 2h"
                        icon={Clock}
                        description="Salud del sistema: Excelente"
                    />
                    <StatsCard
                        title="Nivel de Seguridad"
                        value="Alto"
                        icon={ShieldCheck}
                        description="Última auditoría aprobada"
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* User Info card (Modernized) */}
                    <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Users className="h-32 w-32 text-primary" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Detalles del Perfil</h3>
                            <div className="space-y-5">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Autenticado como</p>
                                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Permisos del Sistema</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                        <p className="text-sm font-semibold text-primary capitalize">{user?.role}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estado de la cuenta</p>
                                    <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                                        Activo
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions / Activity (Mocked) */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-slate-900">Actividad Reciente</h3>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5">
                                Ver todos los registros <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-6">
                            {[
                                { user: 'juliana@scaffold.dev', action: 'creó una nueva cuenta de minorista', time: 'hace 5 min', icon: Users },
                                { user: 'admin@scaffold.local', action: 'actualizó las políticas de seguridad', time: 'hace 1 hora', icon: ShieldCheck },
                                { user: 'sistema', action: 'respaldo diario de base de datos completado', time: 'hace 2 horas', icon: Clock },
                                { user: 'mike@transfer.net', action: 'inició sesión desde un nuevo dispositivo', time: 'hace 4 horas', icon: Activity },
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
