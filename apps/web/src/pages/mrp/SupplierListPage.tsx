import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Truck, Plus, Edit2, Building2, User, Phone, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSuppliersQuery } from '@/hooks/mrp/useSuppliers';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { Badge } from '@/components/ui/badge';

export default function SupplierListPage() {
    const navigate = useNavigate();

    const { data: suppliersResponse, loading, error } = useSuppliersQuery();
    const suppliers = suppliersResponse?.suppliers ?? [];

    useMrpQueryErrorToast(error, 'No se pudieron cargar los proveedores');

    // Stats calculation for KPIs
    const totalSuppliers = suppliers.length;
    const activeContacts = suppliers.filter(s => s.contactName || s.email || s.phone).length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Hero Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-violet-100 text-violet-700 rounded-2xl shadow-sm hidden sm:block">
                        <Truck className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                                Proveedores
                            </h1>
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 uppercase tracking-wider text-[10px] font-bold">
                                Directorio
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-base max-w-2xl">
                            Gestiona la lista de proveedores, contactos y condiciones comerciales para tus compras de materia prima.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button
                        onClick={() => navigate('/mrp/suppliers/new')}
                        className="h-11 px-6 shadow-md shadow-violet-600/20 bg-violet-600 hover:bg-violet-700 text-white font-medium w-full sm:w-auto transition-colors"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Proveedor
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-slate-100 text-slate-600 rounded-xl">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Proveedores</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {loading ? '-' : totalSuppliers}
                        </h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Contactos Definidos</p>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">
                                {loading ? '-' : activeContacts}
                            </h3>
                            {totalSuppliers > 0 && activeContacts === totalSuppliers && (
                                <span className="text-xs text-emerald-600 font-medium flex items-center bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                    <ArrowUpRight className="h-3 w-3 mr-0.5" /> 100%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Optional third card to keep the uniform grid aesthetic, could represent active orders or spend in the future */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 opacity-70">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                        <Truck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Desempeño</p>
                        <h3 className="text-sm font-medium text-slate-400 mt-1">
                            Próximamente
                        </h3>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Search Header - Optional for now if no query params exist, but good for structure */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="text-sm text-slate-500 font-medium w-full text-right sm:text-left">
                        {totalSuppliers > 0 ? `Mostrando ${totalSuppliers} proveedores registrados` : ''}
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap lg:w-1/3">Nombre de Empresa</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Contacto Principal</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Datos de Contacto</TableHead>
                                <TableHead className="py-4 text-right font-semibold text-slate-700 whitespace-nowrap">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                                            <span className="text-sm font-medium">Cargando proveedores...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="p-4 bg-slate-100 rounded-full">
                                                <Building2 className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <p className="text-base font-medium text-slate-900">No hay proveedores registrados</p>
                                            <p className="text-sm text-slate-500 max-w-sm">
                                                Registra a tus socios comerciales para comenzar a realizar solicitudes y órdenes de compra de materia prima.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-2 text-violet-700 border-violet-200 hover:bg-violet-50"
                                                onClick={() => navigate('/mrp/suppliers/new')}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Agregar Proveedor
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((supplier) => (
                                    <TableRow
                                        key={supplier.id}
                                        className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/mrp/suppliers/${supplier.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100 group-hover:scale-105 transition-transform">
                                                    <Building2 className="h-5 w-5 text-violet-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{supplier.name}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{supplier.address ? `${supplier.city ? supplier.city + ', ' : ''}${supplier.address}` : 'Sin dirección'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="font-medium text-slate-700">
                                                    {supplier.contactName || <span className="text-slate-400 italic font-normal">Sin definir</span>}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {supplier.email ? (
                                                    <span className="text-sm text-slate-600 hover:text-violet-600 hover:underline inline-flex items-center max-w-[200px] truncate">
                                                        {supplier.email}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No email</span>
                                                )}

                                                {supplier.phone && (
                                                    <span className="text-xs text-slate-500 flex items-center">
                                                        <Phone className="h-3 w-3 mr-1 opacity-70" />
                                                        {supplier.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/mrp/suppliers/${supplier.id}/edit`);
                                                    }}
                                                    title="Editar Proveedor"
                                                    className="h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-violet-600"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
