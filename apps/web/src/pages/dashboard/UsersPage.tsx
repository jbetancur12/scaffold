import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi, CreateUserData } from '@/services/userApi';
import { User, UserRole } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
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
import { Trash2, UserPlus } from 'lucide-react';

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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">User Management</h1>
                        <p className="text-muted-foreground mt-1">Manage system users and their roles</p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create User
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : (
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                                                {user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={user.id === currentUser?.id}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                            <DialogDescription>
                                Add a new user to the system with specified role and credentials.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, role: value as UserRole })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={UserRole.USER}>User</SelectItem>
                                            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                                            <SelectItem value={UserRole.SUPERADMIN}>Superadmin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">Create User</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
