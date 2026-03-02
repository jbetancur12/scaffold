import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Users, Plus, Edit2, UserSquare2, Phone, ArrowUpRight, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomersQuery } from '@/hooks/mrp/useCustomers';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function CustomerListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: customersResponse, loading, error } = useCustomersQuery();
    // The API might return an array directly or an object with a properties. Let's assume it's an array for now based on listCustomers endpoint returning `Customer[]`
    const customers = Array.isArray(customersResponse) ? customersResponse : [];
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [importCsvText, setImportCsvText] = useState('');
    const [importFileName, setImportFileName] = useState('');
    const [importPreview, setImportPreview] = useState<{
        summary: {
            totalRows: number;
            customersInFile: number;
            customersToCreate: number;
            customersToUpdate: number;
            errorCount: number;
        };
        errors: Array<{ rowNumber: number; message: string }>;
    } | null>(null);
    const [importPreviewOpen, setImportPreviewOpen] = useState(false);
    const [previewingImport, setPreviewingImport] = useState(false);
    const [applyingImport, setApplyingImport] = useState(false);

    useMrpQueryErrorToast(error, 'No se pudieron cargar los clientes');

    // Stats calculation for KPIs
    const totalCustomers = customers.length;
    const activeContacts = customers.filter(c => c.contactName || c.email || c.phone).length;

    const downloadBlob = (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleExportCsv = async () => {
        try {
            const blob = await mrpApi.exportCustomersCsv();
            downloadBlob(blob, `clientes-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo exportar el directorio'), variant: 'destructive' });
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await mrpApi.downloadCustomersImportTemplateCsv();
            downloadBlob(blob, 'plantilla_clientes.csv');
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo descargar la plantilla'), variant: 'destructive' });
        }
    };

    const handleSelectImportFile = async (file: File | undefined) => {
        if (!file) return;
        setPreviewingImport(true);
        try {
            const csvText = await file.text();
            const preview = await mrpApi.previewCustomersImport({
                csvText,
                actor: 'sistema-web',
            });
            setImportCsvText(csvText);
            setImportFileName(file.name);
            setImportPreview(preview);
            setImportPreviewOpen(true);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo previsualizar el archivo CSV'), variant: 'destructive' });
        } finally {
            setPreviewingImport(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleApplyImport = async () => {
        if (!importPreview || !importCsvText) return;
        setApplyingImport(true);
        try {
            const result = await mrpApi.importCustomersCsv({
                csvText: importCsvText,
                actor: 'sistema-web',
            });
            toast({
                title: 'Importación completada',
                description: `Clientes C/U: ${result.customersToCreate}/${result.customersToUpdate}`,
            });
            setImportPreviewOpen(false);
            window.location.reload();
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo importar el directorio'), variant: 'destructive' });
        } finally {
            setApplyingImport(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Hero Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl shadow-sm hidden sm:block">
                        <Users className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                                Clientes
                            </h1>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase tracking-wider text-[10px] font-bold">
                                Directorio
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-base max-w-2xl">
                            Gestiona la lista de clientes, información de contacto y detalles para tus pedidos de venta.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 w-full md:w-auto">
                    <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-xl border border-slate-200 bg-white/80">
                        <Button
                            onClick={handleDownloadTemplate}
                            variant="ghost"
                            className="h-10 px-4 text-slate-700 hover:text-slate-900 hover:bg-slate-100 w-full sm:w-auto"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Plantilla
                        </Button>
                        <Button
                            onClick={handleExportCsv}
                            variant="ghost"
                            className="h-10 px-4 text-slate-700 hover:text-slate-900 hover:bg-slate-100 w-full sm:w-auto"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="h-10 px-4 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 w-full sm:w-auto"
                            disabled={previewingImport}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {previewingImport ? 'Validando...' : 'Importar CSV'}
                        </Button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => handleSelectImportFile(e.target.files?.[0])}
                    />
                    <Button
                        onClick={() => navigate('/mrp/customers/new')}
                        className="h-11 px-6 shadow-md shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white font-medium w-full sm:w-auto transition-colors"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-slate-100 text-slate-600 rounded-xl">
                        <UserSquare2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Clientes</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {loading ? '-' : totalCustomers}
                        </h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Contactos Definidos</p>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">
                                {loading ? '-' : activeContacts}
                            </h3>
                            {totalCustomers > 0 && activeContacts === totalCustomers && (
                                <span className="text-xs text-emerald-600 font-medium flex items-center bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                    <ArrowUpRight className="h-3 w-3 mr-0.5" /> 100%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Optional third card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 opacity-70">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Actividad</p>
                        <h3 className="text-sm font-medium text-slate-400 mt-1">
                            Próximamente
                        </h3>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="text-sm text-slate-500 font-medium w-full text-right sm:text-left">
                        {totalCustomers > 0 ? `Mostrando ${totalCustomers} clientes registrados` : ''}
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap lg:w-1/3">Cliente / Razón Social</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Documento</TableHead>
                                <TableHead className="py-4 font-semibold text-slate-700 whitespace-nowrap">Datos de Contacto</TableHead>
                                <TableHead className="py-4 text-right font-semibold text-slate-700 whitespace-nowrap">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="text-sm font-medium">Cargando clientes...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                                            <div className="p-4 bg-slate-100 rounded-full">
                                                <UserSquare2 className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <p className="text-base font-medium text-slate-900">No hay clientes registrados</p>
                                            <p className="text-sm text-slate-500 max-w-sm">
                                                Registra a tus clientes para poder generarles pedidos de venta y facturas.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                                                onClick={() => navigate('/mrp/customers/new')}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Agregar Cliente
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer) => (
                                    <TableRow
                                        key={customer.id}
                                        className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/mrp/customers/${customer.id}/edit`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                                                    <UserSquare2 className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{customer.name}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{customer.address || 'Sin dirección'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-700">
                                                    {customer.documentType ? `${customer.documentType} ` : ''}{customer.documentNumber || <span className="text-slate-400 italic font-normal">Sin definir</span>}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {customer.email ? (
                                                    <span className="text-sm text-slate-600 hover:text-blue-600 hover:underline inline-flex items-center max-w-[200px] truncate">
                                                        {customer.email}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No email</span>
                                                )}

                                                {customer.phone && (
                                                    <span className="text-xs text-slate-500 flex items-center">
                                                        <Phone className="h-3 w-3 mr-1 opacity-70" />
                                                        {customer.phone}
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
                                                        navigate(`/mrp/customers/${customer.id}/edit`);
                                                    }}
                                                    title="Editar Cliente"
                                                    className="h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-blue-600"
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

            <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Previsualización de importación</DialogTitle>
                    </DialogHeader>
                    {!importPreview ? null : (
                        <div className="space-y-4 text-sm">
                            <p className="text-slate-600">Archivo: <span className="font-semibold">{importFileName || 'N/A'}</span></p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="rounded-lg border p-2">Filas: <b>{importPreview.summary.totalRows}</b></div>
                                <div className="rounded-lg border p-2">En archivo: <b>{importPreview.summary.customersInFile}</b></div>
                                <div className="rounded-lg border p-2">Crear: <b>{importPreview.summary.customersToCreate}</b></div>
                                <div className="rounded-lg border p-2">Actualizar: <b>{importPreview.summary.customersToUpdate}</b></div>
                                <div className="rounded-lg border p-2">Errores: <b>{importPreview.summary.errorCount}</b></div>
                            </div>

                            {importPreview.errors.length > 0 ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 max-h-64 overflow-auto">
                                    <p className="font-semibold text-red-700 mb-2">Errores detectados (corrige antes de importar):</p>
                                    <ul className="list-disc pl-5 space-y-1 text-red-700">
                                        {importPreview.errors.map((row, idx) => (
                                            <li key={`${row.rowNumber}-${idx}`}>Fila {row.rowNumber}: {row.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
                                    Archivo válido. Puedes continuar con la importación.
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="border-slate-300" onClick={() => setImportPreviewOpen(false)}>Cerrar</Button>
                        <Button
                            onClick={handleApplyImport}
                            disabled={!importPreview || importPreview.summary.errorCount > 0 || applyingImport}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {applyingImport ? 'Importando...' : 'Confirmar importación'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
