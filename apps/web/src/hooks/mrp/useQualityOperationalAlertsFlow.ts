import { useState } from 'react';
import { OperationalAlertRole } from '@scaffold/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import {
    useOperationalAlertsQuery,
    useExportWeeklyComplianceReportMutation,
} from '@/hooks/mrp/useQuality';

export const useQualityOperationalAlertsFlow = () => {
    const { toast } = useToast();
    const [alertsRole, setAlertsRole] = useState<OperationalAlertRole | 'all'>('all');
    const [daysAhead, setDaysAhead] = useState<number>(30);

    const { data: operationalAlertsData, loading: loadingOperationalAlerts } = useOperationalAlertsQuery({
        role: alertsRole === 'all' ? undefined : alertsRole,
        daysAhead,
    });

    const { execute: exportWeeklyComplianceReport, loading: exportingWeeklyComplianceReport } = useExportWeeklyComplianceReportMutation();

    const operationalAlerts = operationalAlertsData ?? [];

    const handleExportWeeklyComplianceReport = async (format: 'csv' | 'json') => {
        try {
            const file = await exportWeeklyComplianceReport({
                role: alertsRole === 'all' ? undefined : alertsRole,
                daysAhead,
                format,
            });

            const blob = new Blob([file.content], {
                type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json',
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', file.fileName.replace(/[:]/g, '-'));
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            toast({
                title: 'Reporte semanal generado',
                description: `Archivo ${format.toUpperCase()} descargado correctamente.`,
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo exportar el reporte semanal'),
                variant: 'destructive',
            });
        }
    };

    return {
        alertsRole,
        setAlertsRole,
        daysAhead,
        setDaysAhead,
        operationalAlerts,
        loadingOperationalAlerts,
        exportingWeeklyComplianceReport,
        handleExportWeeklyComplianceReport,
    };
};
