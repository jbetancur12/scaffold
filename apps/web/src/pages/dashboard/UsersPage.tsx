import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi, CreateUserData } from '@/services/userApi';
import { User, UserRole } from '@scaffold/types';
import { CreateUserSchema } from '@scaffold/schemas';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Trash2, UserPlus, Shield, User as UserIcon, Mail, Calendar, Users, ShieldAlert, ShieldCheck } from 'lucide-react';
import { getErrorMessage } from '@/lib/api-error';

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState<CreateUserData>({
        email: '',
        password: '',
        role: UserRole.USER,
    });
    const [saving, setSaving] = useState(false);

    const roleLabels: Record<string, string> = {
        [UserRole.SUPERADMIN]: 'Super Administrador',
        [UserRole.ADMIN]: 'Administrador',
        [UserRole.USER]: 'Usuario Estándar',
    };

    const roleIcons: Record<string, React.ReactNode> = {
        [UserRole.SUPERADMIN]: <ShieldAlert className="h-4 w-4 mr-1.5" />,
        [UserRole.ADMIN]: <ShieldCheck className="h-4 w-4 mr-1.5" />,
        [UserRole.USER]: <UserIcon className="h-4 w-4 mr-1.5" />,
    };

    const roleBadgeStyles: Record<string, string> = {
        [UserRole.SUPERADMIN]: 'bg-violet-50 text-violet-700 border-violet-200',
        [UserRole.ADMIN]: 'bg-amber-50 text-amber-700 border-amber-200',
        [UserRole.USER]: 'bg-slate-50 text-slate-700 border-slate-200',
    };

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await userApi.getUsers();
            setUsers(response.items);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudieron cargar los usuarios'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Client-side validation using shared schema
            CreateUserSchema.parse(formData);

            await userApi.createUser(formData);
            toast({
                title: 'Éxito',
                description: 'Usuario creado exitosamente',
            });
            setIsCreateModalOpen(false);
            setFormData({ email: '', password: '', role: UserRole.USER });
            loadUsers();
        } catch (error: unknown) {
            toast({
                title: 'Error de validación',
                description: getErrorMessage(error, 'Error al crear el usuario'),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

        try {
            await userApi.deleteUser(id);
            toast({
                title: 'Éxito',
                description: 'Usuario eliminado exitosamente',
            });
            loadUsers();
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo eliminar al usuario'),
                variant: 'destructive',
            });
        }
    };

    if (currentUser?.role !== UserRole.SUPERADMIN) {
        return (
            <div className="flex flex-col items-center justify-center py-24 min-h-[60vh]">
                <div className="p-4 bg-red-50 rounded-full mb-4 ring-8 ring-red-50/50">
                    <Shield className="h-12 w-12 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h1>
                <p className="text-slate-500 max-w-sm text-center">No tienes los permisos necesarios para acceder a la configuración y gestión de usuarios del sistema.</p>
                <Button variant="outline" onClick={() => window.history.back()} className="mt-6 rounded-xl">
                    Volver a la página anterior
                </Button>
            </div>
        );
    }

    const superAdminsCount = users.filter((u) => u.role === UserRole.SUPERADMIN).length;
    const adminsCount = users.filter((u) => u.role === UserRole.ADMIN).length;
    const standardUsersCount = users.filter((u) => u.role === UserRole.USER).length;

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Hero & KPIs */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                                <Users className="h-7 w-7 text-violet-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Usuarios</h1>
                                <p className="text-slate-500 mt-1 max-w-xl text-sm">Administra las cuentas del sistema, niveles de acceso y permisos operativos de toda la plataforma.</p>
                            </div>
                        </div>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm shrink-0">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Nuevo usuario
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total de usuarios', value: users.length, color: 'text-slate-800' },
                        { label: 'Super Administradores', value: superAdminsCount, color: 'text-violet-700', bg: 'bg-violet-50/30' },
                        { label: 'Administradores', value: adminsCount, color: 'text-amber-700', bg: 'bg-amber-50/30' },
                        { label: 'Usuarios estándar', value: standardUsersCount, color: 'text-blue-700', bg: 'bg-blue-50/30' },
                    ].map((stat, i) => (
                        <div key={i} className={`p-4 flex flex-col items-center justify-center ${stat.bg || 'bg-slate-50/30'}`}>
                            <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-violet-600 mb-3" />
                        <span className="text-sm font-medium animate-pulse">Cargando directorio...</span>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-semibold text-slate-600 px-6 h-12">
                                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> Usuario</div>
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 h-12">
                                    <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-slate-400" /> Nivel de acceso</div>
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 h-12">
                                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /> Registro</div>
                                </TableHead>
                                <TableHead className="text-right font-semibold text-slate-600 px-6 h-12">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-slate-500">
                                        No hay usuarios registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="group hover:bg-slate-50/40 transition-colors">
                                        <TableCell className="font-medium px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                                                    <UserIcon className="h-4.5 w-4.5 text-slate-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-semibold">{user.email}</span>
                                                    <span className="text-slate-400 text-xs font-mono mt-0.5" title={user.id}>
                                                        ID: {user.id.slice(0, 8)}...
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-semibold ring-1 ring-inset px-2.5 py-1 flex w-fit items-center ${roleBadgeStyles[user.role]}`}>
                                                {roleIcons[user.role]}
                                                {roleLabels[user.role]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-medium text-sm">
                                            {new Date(user.createdAt).toLocaleDateString('es-CO', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right px-6 py-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={user.id === currentUser?.id}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl"
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden border-0 shadow-xl">
                    <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-violet-600" />
                            Añadir Nuevo Usuario
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 mt-1.5 text-sm">
                            Ingresa los datos para crear una nueva cuenta y asígnale un nivel de acceso.
                        </DialogDescription>
                    </div>
                    <form onSubmit={handleCreateUser} className="px-6 py-6 space-y-5 bg-white">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="usuario@ejemplo.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Contraseña Inicial</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="role" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nivel de Acceso</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, role: value as UserRole })
                                    }
                                >
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-md">
                                        <SelectItem value={UserRole.USER} className="rounded-lg">
                                            <div className="flex items-center"><UserIcon className="h-3.5 w-3.5 mr-2 text-slate-500" /> Usuario Estándar</div>
                                        </SelectItem>
                                        <SelectItem value={UserRole.ADMIN} className="rounded-lg">
                                            <div className="flex items-center"><ShieldCheck className="h-3.5 w-3.5 mr-2 text-amber-500" /> Administrador</div>
                                        </SelectItem>
                                        <SelectItem value={UserRole.SUPERADMIN} className="rounded-lg">
                                            <div className="flex items-center"><ShieldAlert className="h-3.5 w-3.5 mr-2 text-violet-500" /> Super Admin</div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-xl border-slate-200 font-medium"
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm px-6">
                                {saving ? (
                                    <>
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                        Creando...
                                    </>
                                ) : (
                                    'Crear Cuenta'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
