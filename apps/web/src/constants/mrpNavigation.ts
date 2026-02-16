export type QualitySection =
    | 'nc'
    | 'capa'
    | 'deviations-oos'
    | 'techno'
    | 'recall'
    | 'shipment'
    | 'dhr-dmr'
    | 'labeling'
    | 'incoming'
    | 'batch-release'
    | 'equipment'
    | 'invima'
    | 'compliance'
    | 'change-control'
    | 'docs'
    | 'audit';

export type QualitySectionCategory = 'operacion' | 'regulatorio' | 'gobierno';
export type QualitySectionDomain = 'quality' | 'postmarket';

export const qualitySectionCategoryLabels: Record<QualitySectionCategory, string> = {
    operacion: 'Operación',
    regulatorio: 'Regulatorio',
    gobierno: 'Gobierno',
};

export const qualitySections: Array<{
    value: QualitySection;
    label: string;
    domain: QualitySectionDomain;
    path: `/quality/${QualitySection}` | `/postmarket/${QualitySection}`;
    category: QualitySectionCategory;
}> = [
    { value: 'nc', label: 'No Conformidades', domain: 'quality', path: '/quality/nc', category: 'operacion' },
    { value: 'capa', label: 'CAPA', domain: 'quality', path: '/quality/capa', category: 'operacion' },
    { value: 'deviations-oos', label: 'Desviaciones/OOS', domain: 'quality', path: '/quality/deviations-oos', category: 'operacion' },
    { value: 'dhr-dmr', label: 'DHR/DMR', domain: 'quality', path: '/quality/dhr-dmr', category: 'regulatorio' },
    { value: 'labeling', label: 'Etiquetado', domain: 'quality', path: '/quality/labeling', category: 'regulatorio' },
    { value: 'incoming', label: 'Recepción', domain: 'quality', path: '/quality/incoming', category: 'regulatorio' },
    { value: 'batch-release', label: 'Liberación QA', domain: 'quality', path: '/quality/batch-release', category: 'regulatorio' },
    { value: 'equipment', label: 'Equipos', domain: 'quality', path: '/quality/equipment', category: 'regulatorio' },
    { value: 'invima', label: 'Registros INVIMA', domain: 'quality', path: '/quality/invima', category: 'regulatorio' },
    { value: 'compliance', label: 'Cumplimiento', domain: 'quality', path: '/quality/compliance', category: 'gobierno' },
    { value: 'change-control', label: 'Control de cambios', domain: 'quality', path: '/quality/change-control', category: 'gobierno' },
    { value: 'docs', label: 'Control documental', domain: 'quality', path: '/quality/docs', category: 'gobierno' },
    { value: 'audit', label: 'Auditoría', domain: 'quality', path: '/quality/audit', category: 'gobierno' },
    { value: 'techno', label: 'Tecnovigilancia', domain: 'postmarket', path: '/postmarket/techno', category: 'operacion' },
    { value: 'recall', label: 'Recall', domain: 'postmarket', path: '/postmarket/recall', category: 'operacion' },
    { value: 'shipment', label: 'Despachos', domain: 'postmarket', path: '/postmarket/shipment', category: 'operacion' },
];

export const qualitySectionCategoryOrder: QualitySectionCategory[] = ['operacion', 'regulatorio', 'gobierno'];
