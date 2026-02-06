import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import UsersPage from '@/pages/dashboard/UsersPage';
import ProductListPage from '@/pages/mrp/ProductListPage';
import ProductFormPage from '@/pages/mrp/ProductFormPage';
import ProductBOMPage from '@/pages/mrp/ProductBOMPage';
import SupplierListPage from '@/pages/mrp/SupplierListPage';
import SupplierFormPage from '@/pages/mrp/SupplierFormPage';
import RawMaterialListPage from '@/pages/mrp/RawMaterialListPage';
import RawMaterialFormPage from '@/pages/mrp/RawMaterialFormPage';
import ProductionOrderListPage from '@/pages/mrp/ProductionOrderListPage';
import ProductionOrderFormPage from '@/pages/mrp/ProductionOrderFormPage';
import InventoryDashboardPage from '@/pages/mrp/InventoryDashboardPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Cargando...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Cargando...</div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <LoginPage />
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/users"
                        element={
                            <ProtectedRoute>
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/products"
                        element={
                            <ProtectedRoute>
                                <ProductListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/products/new"
                        element={
                            <ProtectedRoute>
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/products/:id/bom"
                        element={
                            <ProtectedRoute>
                                <ProductBOMPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/products/:id"
                        element={
                            <ProtectedRoute>
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/suppliers"
                        element={
                            <ProtectedRoute>
                                <SupplierListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/suppliers/new"
                        element={
                            <ProtectedRoute>
                                <SupplierFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/raw-materials"
                        element={
                            <ProtectedRoute>
                                <RawMaterialListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/raw-materials/new"
                        element={
                            <ProtectedRoute>
                                <RawMaterialFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/production-orders"
                        element={
                            <ProtectedRoute>
                                <ProductionOrderListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/production-orders/new"
                        element={
                            <ProtectedRoute>
                                <ProductionOrderFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/production-orders/:id"
                        element={
                            <ProtectedRoute>
                                <ProductionOrderFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mrp/inventory"
                        element={
                            <ProtectedRoute>
                                <InventoryDashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                <Toaster />
            </AuthProvider>
        </BrowserRouter>
    );
}
