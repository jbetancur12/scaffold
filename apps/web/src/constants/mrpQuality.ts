import { DocumentProcess, DocumentStatus } from '@scaffold/types';

export const qualityProcessLabels: Record<DocumentProcess, string> = {
    [DocumentProcess.PRODUCCION]: 'Producción',
    [DocumentProcess.CONTROL_CALIDAD]: 'Control de calidad',
    [DocumentProcess.EMPAQUE]: 'Empaque',
};

export const qualityDocumentStatusLabels: Record<DocumentStatus, string> = {
    [DocumentStatus.BORRADOR]: 'Borrador',
    [DocumentStatus.EN_REVISION]: 'En revisión',
    [DocumentStatus.APROBADO]: 'Aprobado',
    [DocumentStatus.OBSOLETO]: 'Obsoleto',
};

