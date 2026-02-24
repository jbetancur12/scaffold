import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Star, Download } from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/utils";

interface SupplierInfo {
    supplier: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    lastPrice: number;
    lastDate: string; // ISO date string
    isCheapest: boolean;
}

interface Requirement {
    material: {
        id: string;
        name: string;
        unit: string;
        sku: string;
    };
    required: number;
    available: number;
    potentialSuppliers: SupplierInfo[];
    pepsLots?: {
        lotId: string;
        lotCode: string;
        warehouseId: string;
        warehouseName: string;
        available: number;
        receivedAt: string;
        suggestedUse: number;
    }[];
}

interface ProductionRequirementsTableProps {
    requirements: Requirement[];
}

export function ProductionRequirementsTable({ requirements }: ProductionRequirementsTableProps) {

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    const handleExport = () => {
        const headers = [
            "Material", "SKU", "Requerido", "Unidad", "Disponible", "Faltante",
            "Lotes PEPS sugeridos", "Mejor Proveedor", "Precio Ultima Compra", "Fecha Ultima Compra"
        ];

        const rows = requirements.map(req => {
            const missing = Math.max(0, req.required - req.available);
            const cheapestSupplier = req.potentialSuppliers.find(s => s.isCheapest);

            return [
                req.material.name,
                req.material.sku,
                req.required,
                req.material.unit,
                req.available,
                missing,
                (req.pepsLots || [])
                    .filter((lot) => lot.suggestedUse > 0)
                    .map((lot) => `${lot.lotCode} (${lot.suggestedUse})`)
                    .join(' | '),
                cheapestSupplier ? cheapestSupplier.supplier.name : "",
                cheapestSupplier ? cheapestSupplier.lastPrice : "",
                cheapestSupplier ? new Date(cheapestSupplier.lastDate).toLocaleDateString() : ""
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "analisis_materiales.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" onClick={handleExport} disabled={requirements.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Excel
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right">Requerido</TableHead>
                            <TableHead className="text-right">Disponible</TableHead>
                            <TableHead className="text-right">Faltante</TableHead>
                            <TableHead>Lotes PEPS sugeridos</TableHead>
                            <TableHead>Proveedores Conocidos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requirements.map((req) => {
                            const missing = Math.max(0, req.required - req.available);
                            const isMissing = missing > 0;

                            return (
                                <TableRow key={req.material.id}>
                                    <TableCell>
                                        <div className="font-medium">{req.material.name}</div>
                                        <div className="text-xs text-muted-foreground">{req.material.sku}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatQuantity(req.required)} {req.material.unit}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatQuantity(req.available)} {req.material.unit}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={isMissing ? "destructive" : "outline"} className={!isMissing ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                            {isMissing ? `-${formatQuantity(missing)}` : "OK"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[320px]">
                                        {(req.pepsLots || []).length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {(req.pepsLots || []).filter((lot) => lot.suggestedUse > 0).map((lot) => (
                                                    <div key={lot.lotId} className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-xs">
                                                        <div className="font-medium text-blue-900">{lot.lotCode}</div>
                                                        <div className="text-blue-700">
                                                            Sugerido: {formatQuantity(lot.suggestedUse)} / Disp: {formatQuantity(lot.available)} {req.material.unit}
                                                        </div>
                                                        <div className="text-blue-600">
                                                            {lot.warehouseName} | {new Date(lot.receivedAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(req.pepsLots || []).every((lot) => lot.suggestedUse <= 0) && (
                                                    <span className="text-xs text-muted-foreground italic">Sin sugerencia PEPS</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Sin lotes trazables</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[400px]">
                                        {req.potentialSuppliers.length > 0 ? (
                                            <div className="flex flex-col gap-2">
                                                {req.potentialSuppliers.map((sup, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center justify-between p-2 rounded border ${sup.isCheapest ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100"}`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1 font-medium text-sm">
                                                                {sup.supplier.name}
                                                                {sup.isCheapest && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {new Date(sup.lastDate).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-semibold ${sup.isCheapest ? "text-green-700" : "text-slate-600"}`}>
                                                                {formatCurrency(sup.lastPrice)}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => copyToClipboard(`${req.material.name} - ${sup.supplier.name}`)}
                                                                title="Copiar datos"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Sin historial de compra</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
