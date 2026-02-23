import { DocumentCategory, DocumentProcess, DocumentProcessAreaCode, DocumentStatus } from '@scaffold/types';

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

export const qualityDocumentCategoryLabels: Record<DocumentCategory, string> = {
    [DocumentCategory.MAN]: 'Manuales',
    [DocumentCategory.PRO]: 'Procedimientos',
    [DocumentCategory.INS]: 'Instructivos',
    [DocumentCategory.FOR]: 'Formatos',
};

export const qualityProcessAreaCodeLabels: Record<DocumentProcessAreaCode, string> = {
    [DocumentProcessAreaCode.GAF]: 'Gestión administrativa y financiera',
    [DocumentProcessAreaCode.GC]: 'Gestión de calidad',
    [DocumentProcessAreaCode.GP]: 'Gestión de la producción',
    [DocumentProcessAreaCode.GTH]: 'Gestión de talento humano',
    [DocumentProcessAreaCode.GS]: 'Gestión de saneamiento',
    [DocumentProcessAreaCode.GM]: 'Gestión metrológica',
};
