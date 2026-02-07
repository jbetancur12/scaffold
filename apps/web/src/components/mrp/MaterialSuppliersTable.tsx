import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { RawMaterialSupplier } from "@/services/mrpApi";
import { format } from "date-fns";

interface MaterialSuppliersTableProps {
    suppliers: RawMaterialSupplier[];
}

export function MaterialSuppliersTable({ suppliers }: MaterialSuppliersTableProps) {
    if (suppliers.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">No hay historial de compras para este material.</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="text-right">Último Precio</TableHead>
                        <TableHead className="text-right">Fecha Compra</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {suppliers.map((s, idx) => (
                        <TableRow key={idx}>
                            <TableCell className="font-medium">{s.supplier.name}</TableCell>
                            <TableCell>{s.supplier.email || '-'}</TableCell>
                            <TableCell>{s.supplier.phone || '-'}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(Number(s.lastPurchasePrice))}</TableCell>
                            <TableCell className="text-right">{format(new Date(s.lastPurchaseDate), 'dd/MM/yyyy')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
