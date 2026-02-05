import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi, CreateUserData } from '@/services/userApi';
import { User, UserRole } from '@scaffold/types';
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
                description: 'Failed to load users',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await userApi.createUser(formData);
            toast({
                title: 'Success',
                description: 'User created successfully',
            });
            setIsCreateModalOpen(false);
            setFormData({ email: '', password: '', role: UserRole.USER });
            loadUsers();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create user',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await userApi.deleteUser(id);
            toast({
                title: 'Success',
                description: 'User deleted successfully',
            });
            loadUsers();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete user',
                variant: 'destructive',
            });
        }
    };

    if (currentUser?.role !== UserRole.SUPERADMIN) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Shield className="h-16 w-16 text-slate-200 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
                <p className="text-slate-500">You don't have permission to access user management.</p>
                <Button variant="link" onClick={() => window.history.back()} className="mt-4">
                    Go back
                </Button>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                        <p className="text-slate-500 mt-1">Manage system accounts and permission levels.</p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-lg shadow-primary/20">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create New User
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
                                    <TableHead className="font-bold text-slate-900"><Mail className="inline mr-2 h-4 w-4 text-slate-400" />Email</TableHead>
                                    <TableHead className="font-bold text-slate-900"><Shield className="inline mr-2 h-4 w-4 text-slate-400" />Role</TableHead>
                                    <TableHead className="font-bold text-slate-900"><Calendar className="inline mr-2 h-4 w-4 text-slate-400" />Joined On</TableHead>
                                    <TableHead className="text-right font-bold text-slate-900">Actions</TableHead>
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
                                                {user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-medium">
                                            {new Date(user.createdAt).toLocaleDateString('en-US', {
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
                            <DialogTitle className="text-2xl font-bold">Add New User</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                Create a new account with specific permissions.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-6 pt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="font-semibold px-1">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="user@example.com"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        className="rounded-xl border-slate-200 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="font-semibold px-1">Initial Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        className="rounded-xl border-slate-200 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role" className="font-semibold px-1">Access Level</Label>
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
                                            <SelectItem value={UserRole.USER}>Standard User</SelectItem>
                                            <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
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
                                    Cancel
                                </Button>
                                <Button type="submit" className="rounded-xl shadow-lg shadow-primary/20">
                                    Create Account
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
