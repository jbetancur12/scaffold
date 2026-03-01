import { useState } from 'react';
import {
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
} from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';
import { Tag, Plus, X, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const statusStyle: Record<string, string> = {
    [RegulatoryLabelStatus.VALIDADA]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [RegulatoryLabelStatus.BORRADOR]: 'bg-slate-50 text-slate-600 border-slate-200',
    [RegulatoryLabelStatus.BLOQUEADA]: 'bg-amber-50 text-amber-700 border-amber-200',
};

const labelField = (label: string, className = '') => (
    <label className={`text-xs font-medium text-slate-600 uppercase tracking-wide ${className}`}>{label}</label>
);

export function QualityLabelingTab({ model }: { model: QualityComplianceModel }) {
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        await model.handleUpsertRegulatoryLabel(e);
        setShowForm(false);
    };

    const validatedCount = model.regulatoryLabels.filter((l) => l.status === RegulatoryLabelStatus.VALIDADA).length;
    const draftCount = model.regulatoryLabels.filter((l) => l.status === RegulatoryLabelStatus.BORRADOR).length;

    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

    return (
        <TabsContent value="labeling" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <Tag className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Etiquetado Regulatorio</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Registro y validación de etiquetas UDI / INVIMA por lote.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total', value: model.regulatoryLabels.length, color: 'text-slate-700', bg: '' },
                        { label: 'Validadas', value: validatedCount, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
                        { label: 'Borradores', value: draftCount, color: 'text-slate-500', bg: '' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Labels list (with inline collapsible form) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                {/* List header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Etiquetas regulatorias</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                        {model.regulatoryLabels.length}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={model.validatingDispatch}
                            onClick={model.quickValidateDispatch}
                            className="rounded-xl border-slate-200 text-slate-600 h-8 text-xs"
                        >
                            {model.validatingDispatch ? (
                                <>
                                    <div className="animate-spin mr-1.5 h-3 w-3 border-2 border-slate-400/30 border-t-slate-400 rounded-full" />
                                    Validando...
                                </>
                            ) : (
                                <><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Validar despacho</>
                            )}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowForm((v) => !v)}
                            className={showForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}
                        >
                            {showForm
                                ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</>
                                : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva etiqueta</>}
                        </Button>
                    </div>
                </div>

                {/* Inline form */}
                {showForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Nueva etiqueta regulatoria</p>
                        <form className="space-y-5" onSubmit={handleSubmit}>

                            {/* Section: Lote */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Identificación del lote</p>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        {labelField('ID Lote')}
                                        <Input value={model.regulatoryLabelForm.productionBatchId}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                            required className={`${inputClass} font-mono`} placeholder="UUID del lote" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('ID Unidad Serial')}
                                        <Input value={model.regulatoryLabelForm.productionBatchUnitId}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, productionBatchUnitId: e.target.value }))}
                                            className={`${inputClass} font-mono`} placeholder="Opcional" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('Alcance')}
                                        <select className={selectClass} value={model.regulatoryLabelForm.scopeType}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, scopeType: e.target.value as RegulatoryLabelScopeType }))}>
                                            <option value={RegulatoryLabelScopeType.LOTE}>Lote</option>
                                            <option value={RegulatoryLabelScopeType.SERIAL}>Serial</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Producto */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Datos del producto</p>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        {labelField('Producto')}
                                        <Input value={model.regulatoryLabelForm.productName}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, productName: e.target.value }))}
                                            className={inputClass} placeholder="Si lo dejas vacío se toma del lote" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('Fabricante')}
                                        <Input value={model.regulatoryLabelForm.manufacturerName}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, manufacturerName: e.target.value }))}
                                            className={inputClass} placeholder="Autocompleta desde INVIMA" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('Tipo de dispositivo')}
                                        <select className={selectClass} value={model.regulatoryLabelForm.deviceType}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, deviceType: e.target.value as RegulatoryDeviceType }))}>
                                            {Object.values(RegulatoryDeviceType).map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('Registro INVIMA')}
                                        <Input value={model.regulatoryLabelForm.invimaRegistration}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, invimaRegistration: e.target.value }))}
                                            className={inputClass} placeholder="Opcional si el producto tiene INVIMA" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Códigos */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Codificación UDI</p>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        {labelField('Estándar de codificación')}
                                        <select className={selectClass} value={model.regulatoryLabelForm.codingStandard}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, codingStandard: e.target.value as RegulatoryCodingStandard }))}>
                                            {Object.values(RegulatoryCodingStandard).map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('GTIN')}
                                        <Input value={model.regulatoryLabelForm.gtin}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, gtin: e.target.value }))}
                                            className={`${inputClass} font-mono`} placeholder="Global Trade Item Number" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('UDI-DI')}
                                        <Input value={model.regulatoryLabelForm.udiDi}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, udiDi: e.target.value }))}
                                            className={`${inputClass} font-mono`} />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('UDI-PI')}
                                        <Input value={model.regulatoryLabelForm.udiPi}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, udiPi: e.target.value }))}
                                            className={`${inputClass} font-mono`} />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('Código interno')}
                                        <Input value={model.regulatoryLabelForm.internalCode}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, internalCode: e.target.value }))}
                                            className={`${inputClass} font-mono`} />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('Código de lote')}
                                        <Input value={model.regulatoryLabelForm.lotCode}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, lotCode: e.target.value }))}
                                            className={`${inputClass} font-mono`} placeholder="Por defecto usa código del lote" />
                                    </div>
                                    {model.regulatoryLabelForm.scopeType === RegulatoryLabelScopeType.SERIAL && (
                                        <div className="space-y-1.5">
                                            {labelField('Serial')}
                                            <Input value={model.regulatoryLabelForm.serialCode}
                                                onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, serialCode: e.target.value }))}
                                                required className={`${inputClass} font-mono`} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section: Fechas */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Fechas</p>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        {labelField('Fecha de fabricación')}
                                        <Input type="date" required value={model.regulatoryLabelForm.manufactureDate}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, manufactureDate: e.target.value }))}
                                            className={inputClass} />
                                    </div>
                                    <div className="space-y-1.5">
                                        {labelField('Fecha de vencimiento')}
                                        <Input type="date" value={model.regulatoryLabelForm.expirationDate}
                                            onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, expirationDate: e.target.value }))}
                                            className={inputClass} />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl border-slate-200 text-slate-600">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={model.savingRegulatoryLabel}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                                    {model.savingRegulatoryLabel ? (
                                        <>
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar etiqueta
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* List */}
                <div className="p-4 space-y-3">
                    {model.loadingRegulatoryLabels ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando etiquetas...</span>
                        </div>
                    ) : model.regulatoryLabels.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Tag className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sin etiquetas registradas.</p>
                            <p className="text-xs mt-1 text-slate-400">Usa el botón "Nueva etiqueta" para comenzar.</p>
                        </div>
                    ) : (
                        model.regulatoryLabels.map((lbl) => {
                            const st = lbl.status ?? RegulatoryLabelStatus.BORRADOR;
                            const hasErrors = lbl.validationErrors && lbl.validationErrors.length > 0;
                            return (
                                <div key={lbl.id}
                                    className={`border rounded-2xl p-4 transition-all ${hasErrors ? 'border-red-200 bg-red-50/20' : st === RegulatoryLabelStatus.VALIDADA ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-slate-900 text-sm">{lbl.productName || 'Sin nombre'}</span>
                                                <span className="text-xs text-slate-400 font-mono">|</span>
                                                <span className="text-xs font-semibold text-slate-600">{lbl.scopeType}</span>
                                                <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset ${statusStyle[st] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                                    {st === RegulatoryLabelStatus.VALIDADA ? 'Validada' : st}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                                <span>Lote: <span className="font-mono font-semibold text-slate-700">{lbl.lotCode || 'N/A'}</span></span>
                                                <span>Serial: <span className="font-mono font-semibold text-slate-700">{lbl.serialCode || 'N/A'}</span></span>
                                                <span>Tipo: <span className="font-semibold text-slate-700">{lbl.deviceType}</span></span>
                                                <span>Estándar: <span className="font-semibold text-slate-700">{lbl.codingStandard}</span></span>
                                                <span>Código: <span className="font-mono font-semibold text-slate-700">{lbl.codingValue || 'N/A'}</span></span>
                                            </div>

                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                                <span>INVIMA: <span className="font-semibold text-slate-700">{lbl.invimaRegistration || 'N/A'}</span></span>
                                                <span>Fabricación: <span className="font-semibold text-slate-700">{new Date(lbl.manufactureDate).toLocaleDateString()}</span></span>
                                                {lbl.expirationDate && (
                                                    <span>Vence: <span className="font-semibold text-slate-700">{new Date(lbl.expirationDate).toLocaleDateString()}</span></span>
                                                )}
                                            </div>

                                            {hasErrors && (
                                                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-1">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    <span>{lbl.validationErrors!.join(' · ')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </TabsContent>
    );
}
