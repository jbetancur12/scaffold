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
import OperationalSettingsPage from '@/pages/mrp/OperationalSettingsPage';
import WarehouseListPage from '@/pages/mrp/WarehouseListPage';
import WarehouseFormPage from '@/pages/mrp/WarehouseFormPage';
import QualityCompliancePage from '@/pages/mrp/QualityCompliancePage';

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
        return <Navigate to="/" replace />;
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
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/users" element={<UsersPage />} />

                        {/* MRP Routes */}
                        <Route path="/mrp/products" element={<ProductListPage />} />
                        <Route path="/mrp/products/new" element={<ProductFormPage />} />
                        <Route path="/mrp/products/:id/bom" element={<ProductBOMPage />} />
                        <Route path="/mrp/products/:id" element={<ProductDetailPage />} />
                        <Route path="/mrp/products/:id/edit" element={<ProductFormPage />} />

                        <Route path="/mrp/suppliers" element={<SupplierListPage />} />
                        <Route path="/mrp/suppliers/new" element={<SupplierFormPage />} />
                        <Route path="/mrp/suppliers/:id" element={<SupplierDetailPage />} />
                        <Route path="/mrp/suppliers/:id/edit" element={<SupplierFormPage />} />

                        <Route path="/mrp/raw-materials" element={<RawMaterialListPage />} />
                        <Route path="/mrp/raw-materials/new" element={<RawMaterialFormPage />} />
                        <Route path="/mrp/raw-materials/:id" element={<RawMaterialDetailPage />} />
                        <Route path="/mrp/raw-materials/:id/edit" element={<RawMaterialFormPage />} />

                        <Route path="/mrp/production-orders" element={<ProductionOrderListPage />} />
                        <Route path="/mrp/production-orders/new" element={<ProductionOrderFormPage />} />
                        <Route path="/mrp/production-orders/:id" element={<ProductionOrderDetailPage />} />
                        <Route path="/mrp/production-orders/:id/edit" element={<ProductionOrderFormPage />} />

                        <Route path="/mrp/purchase-orders" element={<PurchaseOrderListPage />} />
                        <Route path="/mrp/purchase-orders/new" element={<PurchaseOrderFormPage />} />
                        <Route path="/mrp/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />

                        <Route path="/mrp/operational-settings" element={<OperationalSettingsPage />} />
                        <Route path="/mrp/quality" element={<Navigate to="/mrp/quality/nc" replace />} />
                        <Route path="/mrp/quality/:section" element={<QualityCompliancePage />} />

                        <Route path="/mrp/inventory" element={<InventoryDashboardPage />} />
                        <Route path="/mrp/warehouses" element={<WarehouseListPage />} />
                        <Route path="/mrp/warehouses/new" element={<WarehouseFormPage />} />
                        <Route path="/mrp/warehouses/:id/edit" element={<WarehouseFormPage />} />
                    </Route>
                </Routes>
                <Toaster />
            </AuthProvider>
        </BrowserRouter>
    );
}
