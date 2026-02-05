import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { UserRole } from '@scaffold/types';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogout = async () => {
        try {
            await logout();
            toast({
                title: 'Success',
                description: 'You have been logged out successfully.',
            });
            navigate('/login');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to logout. Please try again.',
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
            <nav className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-8">
                            <h1 className="text-xl font-bold text-gray-900">Scaffold Dashboard</h1>
                            {user?.role === UserRole.SUPERADMIN && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/dashboard/users')}
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    Users
                                </Button>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <User className="h-5 w-5 text-primary" />
                                <CardTitle>User Profile</CardTitle>
                            </div>
                            <CardDescription>Your account information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <p className="text-sm">{user?.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                                    <p className="text-sm capitalize">{user?.role}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                                    <p className="text-sm font-mono text-xs">{user?.id}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Welcome!</CardTitle>
                            <CardDescription>You&apos;re successfully logged in</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                This is your dashboard. You can add more features and components here.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
