import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi, CreateUserData } from '@/services/userApi';
import { User, UserRole } from '@scaffold/types';
import { CreateUserSchema } from '@scaffold/schemas';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
    DialogFooter,
    DialogHeader,
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
import { Trash2, UserPlus, Shield, User as UserIcon, Mail, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

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

    const roleLabels: Record<string, string> = {
        [UserRole.SUPERADMIN]: 'Super Administrador',
        [UserRole.ADMIN]: 'Administrador',
        [UserRole.USER]: 'Usuario Estándar',
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await userApi.getUsers();
            setUsers(response.users);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los usuarios',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
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
        } catch (error: any) {
            let message = 'Error al crear el usuario';

            if (error.name === 'ZodError') {
                message = error.errors[0].message;
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            }

            toast({
                title: 'Error de validación',
                description: message,
                variant: 'destructive',
            });
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
                description: 'No se pudo eliminar al usuario',
                variant: 'destructive',
            });
        }
    };

    if (currentUser?.role !== UserRole.SUPERADMIN) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Shield className="h-16 w-16 text-slate-200 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h1>
                <p className="text-slate-500">No tienes permisos para acceder a la gestión de usuarios.</p>
                <Button variant="link" onClick={() => window.history.back()} className="mt-4">
                    Regresar
                </Button>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Usuarios</h1>
                        <p className="text-slate-500 mt-1">Administra las cuentas del sistema y niveles de permisos.</p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-lg shadow-primary/20">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Crear Nuevo Usuario
                    </Button>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-900"><Mail className="inline mr-2 h-4 w-4 text-slate-400" />Correo Electrónico</TableHead>
                                    <TableHead className="font-bold text-slate-900"><Shield className="inline mr-2 h-4 w-4 text-slate-400" />Rol</TableHead>
                                    <TableHead className="font-bold text-slate-900"><Calendar className="inline mr-2 h-4 w-4 text-slate-400" />Registrado el</TableHead>
                                    <TableHead className="text-right font-bold text-slate-900">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <UserIcon className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <span className="text-slate-900">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                                                user.role === UserRole.SUPERADMIN ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {roleLabels[user.role]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-medium">
                                            {new Date(user.createdAt).toLocaleDateString('es-ES', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right py-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={user.id === currentUser?.id}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/5 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-3xl p-8">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Añadir Nuevo Usuario</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                Crea una nueva cuenta con permisos específicos.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-6 pt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="font-semibold px-1">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="usuario@ejemplo.com"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        className="rounded-xl border-slate-200 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="font-semibold px-1">Contraseña Inicial</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Mínimo 8 caracteres"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        className="rounded-xl border-slate-200 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role" className="font-semibold px-1">Nivel de Acceso</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, role: value as UserRole })
                                        }
                                    >
                                        <SelectTrigger className="rounded-xl border-slate-200 focus:ring-primary/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value={UserRole.USER}>Usuario Estándar</SelectItem>
                                            <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                                            <SelectItem value={UserRole.SUPERADMIN}>Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-xl"
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" className="rounded-xl shadow-lg shadow-primary/20">
                                    Crear Cuenta
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
