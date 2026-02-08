import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import UsersPage from '@/pages/dashboard/UsersPage';
import ProductListPage from '@/pages/mrp/ProductListPage';
import ProductFormPage from '@/pages/mrp/ProductFormPage';
import ProductDetailPage from '@/pages/mrp/ProductDetailPage';
import ProductBOMPage from '@/pages/mrp/ProductBOMPage';
import SupplierListPage from '@/pages/mrp/SupplierListPage';
import SupplierFormPage from '@/pages/mrp/SupplierFormPage';
import SupplierDetailPage from '@/pages/mrp/SupplierDetailPage';
import RawMaterialListPage from '@/pages/mrp/RawMaterialListPage';
import RawMaterialFormPage from '@/pages/mrp/RawMaterialFormPage';
import RawMaterialDetailPage from '@/pages/mrp/RawMaterialDetailPage';
import ProductionOrderListPage from '@/pages/mrp/ProductionOrderListPage';
import ProductionOrderFormPage from '@/pages/mrp/ProductionOrderFormPage';
import InventoryDashboardPage from '@/pages/mrp/InventoryDashboardPage';
import PurchaseOrderListPage from '@/pages/mrp/PurchaseOrderListPage';
import PurchaseOrderFormPage from '@/pages/mrp/PurchaseOrderFormPage';
import PurchaseOrderDetailPage from '@/pages/mrp/PurchaseOrderDetailPage';
import ProductionOrderDetailPage from '@/pages/mrp/ProductionOrderDetailPage';

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

                    {/* Dashboard Layout Route - wraps all protected pages */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <Outlet />
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/dashboard/users" element={<UsersPage />} />

                        {/* MRP Routes */}
                        <Route path="/dashboard/mrp/products" element={<ProductListPage />} />
                        <Route path="/dashboard/mrp/products/new" element={<ProductFormPage />} />
                        <Route path="/dashboard/mrp/products/:id/bom" element={<ProductBOMPage />} />
                        <Route path="/dashboard/mrp/products/:id" element={<ProductDetailPage />} />
                        <Route path="/dashboard/mrp/products/:id/edit" element={<ProductFormPage />} />

                        <Route path="/dashboard/mrp/suppliers" element={<SupplierListPage />} />
                        <Route path="/dashboard/mrp/suppliers/new" element={<SupplierFormPage />} />
                        <Route path="/dashboard/mrp/suppliers/:id" element={<SupplierDetailPage />} />
                        <Route path="/dashboard/mrp/suppliers/:id/edit" element={<SupplierFormPage />} />

                        <Route path="/dashboard/mrp/raw-materials" element={<RawMaterialListPage />} />
                        <Route path="/dashboard/mrp/raw-materials/new" element={<RawMaterialFormPage />} />
                        <Route path="/dashboard/mrp/raw-materials/:id" element={<RawMaterialDetailPage />} />
                        <Route path="/dashboard/mrp/raw-materials/:id/edit" element={<RawMaterialFormPage />} />

                        <Route path="/dashboard/mrp/production-orders" element={<ProductionOrderListPage />} />
                        <Route path="/dashboard/mrp/production-orders/new" element={<ProductionOrderFormPage />} />
                        <Route path="/dashboard/mrp/production-orders/:id" element={<ProductionOrderDetailPage />} />
                        <Route path="/dashboard/mrp/production-orders/:id/edit" element={<ProductionOrderFormPage />} />

                        <Route path="/dashboard/mrp/purchase-orders" element={<PurchaseOrderListPage />} />
                        <Route path="/dashboard/mrp/purchase-orders/new" element={<PurchaseOrderFormPage />} />
                        <Route path="/dashboard/mrp/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />

                        <Route path="/dashboard/mrp/inventory" element={<InventoryDashboardPage />} />
                    </Route>

                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                <Toaster />
            </AuthProvider>
        </BrowserRouter>
    );
}
