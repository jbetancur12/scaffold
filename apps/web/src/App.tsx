import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { qualitySections } from '@/constants/mrpNavigation';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('@/pages/dashboard/UsersPage'));
const ProductListPage = lazy(() => import('@/pages/mrp/ProductListPage'));
const ProductGroupListPage = lazy(() => import('@/pages/mrp/ProductGroupListPage'));
const PriceListPage = lazy(() => import('@/pages/mrp/PriceListPage'));
const ProductFormPage = lazy(() => import('@/pages/mrp/ProductFormPage'));
const ProductDetailPage = lazy(() => import('@/pages/mrp/ProductDetailPage'));
const ProductBOMPage = lazy(() => import('@/pages/mrp/ProductBOMPage'));
const SupplierListPage = lazy(() => import('@/pages/mrp/SupplierListPage'));
const SupplierFormPage = lazy(() => import('@/pages/mrp/SupplierFormPage'));
const SupplierDetailPage = lazy(() => import('@/pages/mrp/SupplierDetailPage'));
const CustomerListPage = lazy(() => import('@/pages/mrp/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('@/pages/mrp/CustomerDetailPage'));
const CustomerFormPage = lazy(() => import('@/pages/mrp/CustomerFormPage'));
const RawMaterialListPage = lazy(() => import('@/pages/mrp/RawMaterialListPage'));
const RawMaterialFormPage = lazy(() => import('@/pages/mrp/RawMaterialFormPage'));
const RawMaterialDetailPage = lazy(() => import('@/pages/mrp/RawMaterialDetailPage'));
const ProductionOrderListPage = lazy(() => import('@/pages/mrp/ProductionOrderListPage'));
const ProductionOrderFormPage = lazy(() => import('@/pages/mrp/ProductionOrderFormPage'));
const ProductionRequirementsSimulatorPage = lazy(() => import('@/pages/mrp/ProductionRequirementsSimulatorPage'));
const InventoryDashboardPage = lazy(() => import('@/pages/mrp/InventoryDashboardPage'));
const PurchaseOrderListPage = lazy(() => import('@/pages/mrp/PurchaseOrderListPage'));
const PurchaseOrderFormPage = lazy(() => import('@/pages/mrp/PurchaseOrderFormPage'));
const PurchaseOrderDetailPage = lazy(() => import('@/pages/mrp/PurchaseOrderDetailPage'));
const PurchaseRequisitionListPage = lazy(() => import('@/pages/mrp/PurchaseRequisitionListPage'));
const PurchaseRequisitionFormPage = lazy(() => import('@/pages/mrp/PurchaseRequisitionFormPage'));
const PurchaseRequisitionDetailPage = lazy(() => import('@/pages/mrp/PurchaseRequisitionDetailPage'));
const SalesOrderListPage = lazy(() => import('@/pages/mrp/SalesOrderListPage'));
const SalesOrderFormPage = lazy(() => import('@/pages/mrp/SalesOrderFormPage'));
const SalesOrderDetailPage = lazy(() => import('@/pages/mrp/SalesOrderDetailPage'));
const QuotationListPage = lazy(() => import('@/pages/mrp/QuotationListPage'));
const QuotationFormPage = lazy(() => import('@/pages/mrp/QuotationFormPage'));
const QuotationDetailPage = lazy(() => import('@/pages/mrp/QuotationDetailPage'));
const ProductionOrderDetailPage = lazy(() => import('@/pages/mrp/ProductionOrderDetailPage'));
const OperationalSettingsPage = lazy(() => import('@/pages/mrp/OperationalSettingsPage'));
const ThreadCalculatorPage = lazy(() => import('@/pages/mrp/ThreadCalculatorPage'));
const WarehouseListPage = lazy(() => import('@/pages/mrp/WarehouseListPage'));
const WarehouseFormPage = lazy(() => import('@/pages/mrp/WarehouseFormPage'));
const ProductionAnalyticsPage = lazy(() => import('@/pages/mrp/ProductionAnalyticsPage'));
const ProductionForecastPage = lazy(() => import('@/pages/mrp/ProductionForecastPage'));
const OperatorListPage = lazy(() => import('@/pages/mrp/OperatorListPage'));
const OperatorFormPage = lazy(() => import('@/pages/mrp/OperatorFormPage'));
const ProductionEntryListPage = lazy(() => import('@/pages/mrp/ProductionEntryListPage'));
const ProductionEntryFormPage = lazy(() => import('@/pages/mrp/ProductionEntryFormPage'));

const QualityNcPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityNcPage })));
const QualityCapaPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityCapaPage })));
const QualityDeviationsOosPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityDeviationsOosPage })));
const QualityDhrDmrPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityDhrDmrPage })));
const QualityLabelingPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityLabelingPage })));
const QualityIncomingPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityIncomingPage })));
const QualityBatchReleasePage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityBatchReleasePage })));
const QualityEquipmentPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityEquipmentPage })));
const QualityInvimaPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityInvimaPage })));
const QualityComplianceDashboardPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityComplianceDashboardPage })));
const QualityAlertsPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityAlertsPage })));
const QualityChangeControlPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityChangeControlPage })));
const QualityDocsPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityDocsPage })));
const QualityAuditPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.QualityAuditPage })));
const PostmarketTechnoPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.PostmarketTechnoPage })));
const PostmarketRecallPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.PostmarketRecallPage })));
const PostmarketShipmentPage = lazy(() => import('@/pages/quality/QualitySectionPages').then((m) => ({ default: m.PostmarketShipmentPage })));

const PageFallback = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
    </div>
);

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

function LegacyQualitySectionRedirect() {
    const { section } = useParams<{ section: string }>();
    const sectionExists = qualitySections.some((item) => item.domain === 'quality' && item.value === section);
    return <Navigate to={sectionExists ? `/quality/${section}` : '/quality/nc'} replace />;
}

function LegacyPostmarketSectionRedirect() {
    const { section } = useParams<{ section: string }>();
    const sectionExists = qualitySections.some((item) => item.domain === 'postmarket' && item.value === section);
    return <Navigate to={sectionExists ? `/postmarket/${section}` : '/postmarket/techno'} replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Suspense fallback={<PageFallback />}>
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
                            <Route path="/mrp/price-list" element={<PriceListPage />} />
                            <Route path="/mrp/product-groups" element={<ProductGroupListPage />} />
                            <Route path="/mrp/products/new" element={<ProductFormPage />} />
                            <Route path="/mrp/products/:id/bom" element={<ProductBOMPage />} />
                            <Route path="/mrp/products/:id" element={<ProductDetailPage />} />
                            <Route path="/mrp/products/:id/edit" element={<ProductFormPage />} />

                            <Route path="/mrp/suppliers" element={<SupplierListPage />} />
                            <Route path="/mrp/suppliers/new" element={<SupplierFormPage />} />
                            <Route path="/mrp/suppliers/:id" element={<SupplierDetailPage />} />
                            <Route path="/mrp/suppliers/:id/edit" element={<SupplierFormPage />} />

                            <Route path="/mrp/customers" element={<CustomerListPage />} />
                            <Route path="/mrp/customers/:id" element={<CustomerDetailPage />} />
                            <Route path="/mrp/customers/new" element={<CustomerFormPage />} />
                            <Route path="/mrp/customers/:id/edit" element={<CustomerFormPage />} />

                            <Route path="/mrp/raw-materials" element={<RawMaterialListPage />} />
                            <Route path="/mrp/raw-materials/new" element={<RawMaterialFormPage />} />
                            <Route path="/mrp/raw-materials/:id" element={<RawMaterialDetailPage />} />
                            <Route path="/mrp/raw-materials/:id/edit" element={<RawMaterialFormPage />} />

                            <Route path="/mrp/production-orders" element={<ProductionOrderListPage />} />
                            <Route path="/mrp/production-orders/simulator" element={<ProductionRequirementsSimulatorPage />} />
                            <Route path="/mrp/production-orders/new" element={<ProductionOrderFormPage />} />
                            <Route path="/mrp/production-orders/:id" element={<ProductionOrderDetailPage />} />
                            <Route path="/mrp/production-orders/:id/edit" element={<ProductionOrderFormPage />} />
                            <Route path="/mrp/production-analytics" element={<ProductionAnalyticsPage />} />
                            <Route path="/mrp/production-forecast" element={<ProductionForecastPage />} />

                            <Route path="/mrp/purchase-orders" element={<PurchaseOrderListPage />} />
                            <Route path="/mrp/purchase-orders/new" element={<PurchaseOrderFormPage />} />
                            <Route path="/mrp/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
                            <Route path="/mrp/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                            <Route path="/mrp/purchase-requisitions" element={<PurchaseRequisitionListPage />} />
                            <Route path="/mrp/purchase-requisitions/new" element={<PurchaseRequisitionFormPage />} />
                            <Route path="/mrp/purchase-requisitions/:id" element={<PurchaseRequisitionDetailPage />} />

                            <Route path="/mrp/sales-orders" element={<SalesOrderListPage />} />
                            <Route path="/mrp/sales-orders/new" element={<SalesOrderFormPage />} />
                            <Route path="/mrp/sales-orders/:id/edit" element={<SalesOrderFormPage />} />
                            <Route path="/mrp/sales-orders/:id" element={<SalesOrderDetailPage />} />
                            <Route path="/mrp/quotations" element={<QuotationListPage />} />
                            <Route path="/mrp/quotations/new" element={<QuotationFormPage />} />
                            <Route path="/mrp/quotations/:id/edit" element={<QuotationFormPage />} />
                            <Route path="/mrp/quotations/:id" element={<QuotationDetailPage />} />

                            <Route path="/mrp/operators" element={<OperatorListPage />} />
                            <Route path="/mrp/operators/new" element={<OperatorFormPage />} />
                            <Route path="/mrp/operators/:id" element={<OperatorFormPage />} />

                            <Route path="/mrp/production-entries" element={<ProductionEntryListPage />} />
                            <Route path="/mrp/production-entries/new" element={<ProductionEntryFormPage />} />

                            <Route path="/mrp/operational-settings" element={<OperationalSettingsPage />} />
                            <Route path="/mrp/thread-calculator" element={<ThreadCalculatorPage />} />
                            <Route path="/quality" element={<Navigate to="/quality/nc" replace />} />
                            <Route path="/quality/nc" element={<QualityNcPage />} />
                            <Route path="/quality/capa" element={<QualityCapaPage />} />
                            <Route path="/quality/deviations-oos" element={<QualityDeviationsOosPage />} />
                            <Route path="/quality/dhr-dmr" element={<QualityDhrDmrPage />} />
                            <Route path="/quality/labeling" element={<QualityLabelingPage />} />
                            <Route path="/quality/incoming" element={<QualityIncomingPage />} />
                            <Route path="/quality/batch-release" element={<QualityBatchReleasePage />} />
                            <Route path="/quality/equipment" element={<QualityEquipmentPage />} />
                            <Route path="/quality/invima" element={<QualityInvimaPage />} />
                            <Route path="/quality/compliance" element={<QualityComplianceDashboardPage />} />
                            <Route path="/quality/alerts" element={<QualityAlertsPage />} />
                            <Route path="/quality/change-control" element={<QualityChangeControlPage />} />
                            <Route path="/quality/docs" element={<QualityDocsPage />} />
                            <Route path="/quality/audit" element={<QualityAuditPage />} />
                            <Route path="/quality/:section" element={<LegacyQualitySectionRedirect />} />
                            <Route path="/postmarket" element={<Navigate to="/postmarket/techno" replace />} />
                            <Route path="/postmarket/techno" element={<PostmarketTechnoPage />} />
                            <Route path="/postmarket/recall" element={<PostmarketRecallPage />} />
                            <Route path="/postmarket/shipment" element={<PostmarketShipmentPage />} />
                            <Route path="/postmarket/:section" element={<LegacyPostmarketSectionRedirect />} />
                            <Route path="/mrp/quality" element={<Navigate to="/quality/nc" replace />} />
                            <Route path="/mrp/quality/:section" element={<LegacyQualitySectionRedirect />} />
                            <Route path="/mrp/postmarket" element={<Navigate to="/postmarket/techno" replace />} />
                            <Route path="/mrp/postmarket/:section" element={<LegacyPostmarketSectionRedirect />} />

                            <Route path="/mrp/inventory" element={<InventoryDashboardPage />} />
                            <Route path="/mrp/warehouses" element={<WarehouseListPage />} />
                            <Route path="/mrp/warehouses/new" element={<WarehouseFormPage />} />
                            <Route path="/mrp/warehouses/:id/edit" element={<WarehouseFormPage />} />
                        </Route>
                    </Routes>
                </Suspense>
                <Toaster />
            </AuthProvider>
        </BrowserRouter>
    );
}
