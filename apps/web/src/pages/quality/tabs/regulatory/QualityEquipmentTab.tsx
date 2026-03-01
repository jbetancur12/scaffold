import {
  EquipmentCalibrationResult,
  EquipmentMaintenanceResult,
  EquipmentMaintenanceType,
  EquipmentStatus,
} from '@scaffold/types';
import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  Plus,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
  History,
  Link,
} from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const formatDate = (value?: string | Date) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('es-CO');
};

const alertSeverityStyle: Record<string, string> = {
  critical: 'border-red-200 bg-red-50/30',
  high: 'border-orange-200 bg-orange-50/30',
  medium: 'border-amber-200 bg-amber-50/30',
  low: 'border-slate-200 bg-white',
};

const calibResultStyle: Record<string, string> = {
  [EquipmentCalibrationResult.APROBADA]: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  [EquipmentCalibrationResult.RECHAZADA]: 'text-red-700 bg-red-50 border-red-200',
};

const maintResultStyle: Record<string, string> = {
  [EquipmentMaintenanceResult.COMPLETADO]: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  [EquipmentMaintenanceResult.CON_OBSERVACIONES]: 'text-amber-700 bg-amber-50 border-amber-200',
  [EquipmentMaintenanceResult.FALLIDO]: 'text-red-700 bg-red-50 border-red-200',
};

export function QualityEquipmentTab({ model }: { model: QualityComplianceModel }) {
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showCalibForm, setShowCalibForm] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);

  const handleEquipSubmit = async (e: React.FormEvent) => { await model.handleCreateEquipment(e); setShowEquipForm(false); };
  const handleCalibSubmit = async (e: React.FormEvent) => { await model.handleCreateCalibration(e); setShowCalibForm(false); };
  const handleMaintSubmit = async (e: React.FormEvent) => { await model.handleCreateMaintenance(e); setShowMaintForm(false); };
  const handleUsageSubmit = async (e: React.FormEvent) => { await model.handleRegisterEquipmentUsage(e); setShowUsageForm(false); };

  const activeCount = model.equipment.filter((e) => e.status === EquipmentStatus.ACTIVO).length;

  const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
  const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

  return (
    <TabsContent value="equipment" className="space-y-5">

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
              <Wrench className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Equipos &amp; Calibración</h2>
              <p className="text-slate-500 text-sm mt-0.5">Gestión de equipos, calibraciones, mantenimientos y alertas de vencimiento.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
          {[
            { label: 'Equipos', value: model.equipment.length, color: 'text-slate-700', bg: '' },
            { label: 'Activos', value: activeCount, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
            { label: 'Críticos', value: model.criticalEquipmentCount, color: 'text-red-600', bg: '' },
            { label: 'Alertas', value: model.equipmentAlerts.length, color: model.equipmentAlerts.length > 0 ? 'text-amber-700' : 'text-slate-400', bg: model.equipmentAlerts.length > 0 ? 'bg-amber-50/60' : '' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`flex flex-col items-center py-3 px-2 ${bg}`}>
              <span className={`text-2xl font-bold ${color}`}>{value}</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts banner (only when there are alerts) */}
      {model.equipmentAlerts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-slate-800">Alertas de vencimiento</h3>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">{model.equipmentAlerts.length}</span>
          </div>
          <div className="p-4 space-y-2">
            {model.loadingEquipmentAlerts ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <div className="animate-spin h-4 w-4 border-2 border-slate-200 border-t-violet-600 rounded-full" />Cargando...
              </div>
            ) : model.equipmentAlerts.map((alert, idx) => (
              <div key={`${alert.equipmentId}-${alert.alertType}-${idx}`}
                className={`border rounded-2xl p-3 flex flex-wrap items-center gap-3 ${alertSeverityStyle[alert.severity] || 'border-slate-200 bg-white'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono text-xs">{alert.equipmentCode}</span>
                    <span className="text-slate-700 font-semibold text-sm">{alert.equipmentName}</span>
                    {alert.isCritical && (
                      <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-red-50 font-bold">CRÍTICO</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium">{alert.alertType === 'calibration' ? 'Calibración' : 'Mantenimiento'}</span>
                    {' '}vence: <span className="font-semibold text-slate-700">{formatDate(alert.dueAt)}</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${alert.daysRemaining < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {alert.daysRemaining < 0 ? `⚠ Vencido hace ${Math.abs(alert.daysRemaining)}d` : `${alert.daysRemaining}d restantes`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Equipos</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.equipment.length}</span>
          <div className="ml-auto">
            <Button type="button" size="sm" onClick={() => setShowEquipForm((v) => !v)}
              className={showEquipForm
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
              {showEquipForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo equipo</>}
            </Button>
          </div>
        </div>

        {showEquipForm && (
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
            <p className="text-sm font-bold text-slate-700 mb-4">Registrar equipo</p>
            <form className="space-y-4" onSubmit={handleEquipSubmit}>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Código</Label>
                  <Input value={model.equipmentForm.code} onChange={(e) => model.setEquipmentForm((p) => ({ ...p, code: e.target.value }))}
                    required className={`${inputClass} font-mono`} placeholder="EQ-001" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Nombre</Label>
                  <Input value={model.equipmentForm.name} onChange={(e) => model.setEquipmentForm((p) => ({ ...p, name: e.target.value }))}
                    required className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Área <span className="normal-case text-slate-400">(opcional)</span></Label>
                  <Input value={model.equipmentForm.area} onChange={(e) => model.setEquipmentForm((p) => ({ ...p, area: e.target.value }))}
                    className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Estado</Label>
                  <select className={selectClass} value={model.equipmentForm.status}
                    onChange={(e) => model.setEquipmentForm((p) => ({ ...p, status: e.target.value as EquipmentStatus }))}>
                    <option value={EquipmentStatus.ACTIVO}>Activo</option>
                    <option value={EquipmentStatus.INACTIVO}>Inactivo</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Frecuencia calibración (días)</Label>
                  <Input type="number" min={1} value={model.equipmentForm.calibrationFrequencyDays}
                    onChange={(e) => model.setEquipmentForm((p) => ({ ...p, calibrationFrequencyDays: e.target.value }))}
                    className={inputClass} placeholder="365" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Frecuencia mantenimiento (días)</Label>
                  <Input type="number" min={1} value={model.equipmentForm.maintenanceFrequencyDays}
                    onChange={(e) => model.setEquipmentForm((p) => ({ ...p, maintenanceFrequencyDays: e.target.value }))}
                    className={inputClass} placeholder="180" />
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer"
                        checked={model.equipmentForm.isCritical}
                        onChange={(e) => model.setEquipmentForm((p) => ({ ...p, isCritical: e.target.checked }))} />
                      <div className="h-5 w-5 rounded border-2 border-slate-300 bg-white peer-checked:border-violet-600 peer-checked:bg-violet-600 transition-colors flex items-center justify-center">
                        {model.equipmentForm.isCritical && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Equipo crítico para liberación QA</span>
                  </label>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Notas <span className="normal-case text-slate-400">(opcional)</span></Label>
                  <Textarea value={model.equipmentForm.notes} onChange={(e) => model.setEquipmentForm((p) => ({ ...p, notes: e.target.value }))}
                    className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[60px] resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEquipForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                <Button type="submit" disabled={model.creatingEquipment}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                  {model.creatingEquipment ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Guardar equipo</>}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="p-4 space-y-3">
          {model.loadingEquipment ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
              <span className="text-sm animate-pulse">Cargando equipos...</span>
            </div>
          ) : model.equipment.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin equipos registrados.</p>
              <p className="text-xs mt-1">Usa "Nuevo equipo" para comenzar.</p>
            </div>
          ) : model.equipment.map((row) => (
            <div key={row.id}
              className={`border rounded-2xl p-4 transition-all ${row.status === EquipmentStatus.ACTIVO ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-70'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono text-sm">{row.code}</span>
                    <span className="text-slate-700 font-semibold">— {row.name}</span>
                    <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${row.status === EquipmentStatus.ACTIVO ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {row.status}
                    </Badge>
                    {row.isCritical && (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-50 text-red-700 border-red-200">CRÍTICO</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {row.area && <span>Área: <span className="font-semibold text-slate-700">{row.area}</span></span>}
                    <span>Calibración: <span className={`font-semibold ${row.nextCalibrationDueAt ? 'text-slate-700' : 'text-slate-400'}`}>{formatDate(row.nextCalibrationDueAt)}</span></span>
                    <span>Mantenimiento: <span className={`font-semibold ${row.nextMaintenanceDueAt ? 'text-slate-700' : 'text-slate-400'}`}>{formatDate(row.nextMaintenanceDueAt)}</span></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => model.quickToggleEquipmentStatus(row.id, row.status)}
                    className="rounded-xl border-slate-200 text-xs h-8">
                    {row.status === EquipmentStatus.ACTIVO ? 'Inactivar' : 'Activar'}
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => model.setSelectedEquipmentId(row.id)}
                    className="rounded-xl border-slate-200 text-xs h-8">
                    <History className="mr-1 h-3.5 w-3.5" />Historial
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action forms: Calibration + Maintenance + Usage in a 3-col grid of action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Calibración */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Calibración</h3>
            <Button type="button" size="sm" onClick={() => setShowCalibForm((v) => !v)}
              className={`ml-auto ${showCalibForm ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200' : 'bg-violet-600 hover:bg-violet-700 text-white'} rounded-xl h-7 text-xs px-2.5`}>
              {showCalibForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {showCalibForm ? (
            <form className="p-4 space-y-3" onSubmit={handleCalibSubmit}>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Equipo</Label>
                <select className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={model.calibrationForm.equipmentId}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, equipmentId: e.target.value }))}>
                  <option value="">Selecciona...</option>
                  {model.equipment.map((r) => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Fecha ejecución</Label>
                  <Input type="date" value={model.calibrationForm.executedAt}
                    onChange={(e) => model.setCalibrationForm((p) => ({ ...p, executedAt: e.target.value }))}
                    className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Vencimiento</Label>
                  <Input type="date" value={model.calibrationForm.dueAt}
                    onChange={(e) => model.setCalibrationForm((p) => ({ ...p, dueAt: e.target.value }))}
                    className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Resultado</Label>
                <select className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={model.calibrationForm.result}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, result: e.target.value as EquipmentCalibrationResult }))}>
                  <option value={EquipmentCalibrationResult.APROBADA}>Aprobada</option>
                  <option value={EquipmentCalibrationResult.RECHAZADA}>Rechazada</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Certificado / Evidencia <span className="text-slate-400">(opcional)</span></Label>
                <Input value={model.calibrationForm.certificateRef}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, certificateRef: e.target.value }))}
                  className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" placeholder="Ref certificado" />
                <Input value={model.calibrationForm.evidenceRef}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, evidenceRef: e.target.value }))}
                  className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" placeholder="Ref evidencia" />
              </div>
              <Button type="submit" disabled={model.creatingCalibration} size="sm"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs">
                {model.creatingCalibration ? 'Guardando...' : <><Save className="mr-1.5 h-3.5 w-3.5" />Guardar calibración</>}
              </Button>
            </form>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs py-8">
              <Activity className="h-6 w-6 mx-auto mb-2 opacity-20" />
              Registra una nueva calibración
            </div>
          )}
        </div>

        {/* Mantenimiento */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-violet-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Mantenimiento</h3>
            <Button type="button" size="sm" onClick={() => setShowMaintForm((v) => !v)}
              className={`ml-auto ${showMaintForm ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200' : 'bg-violet-600 hover:bg-violet-700 text-white'} rounded-xl h-7 text-xs px-2.5`}>
              {showMaintForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {showMaintForm ? (
            <form className="p-4 space-y-3" onSubmit={handleMaintSubmit}>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Equipo</Label>
                <select className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={model.maintenanceForm.equipmentId}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, equipmentId: e.target.value }))}>
                  <option value="">Selecciona...</option>
                  {model.equipment.map((r) => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Ejecución</Label>
                  <Input type="date" value={model.maintenanceForm.executedAt}
                    onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, executedAt: e.target.value }))}
                    className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Vencimiento</Label>
                  <Input type="date" value={model.maintenanceForm.dueAt}
                    onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, dueAt: e.target.value }))}
                    className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Tipo</Label>
                  <select className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={model.maintenanceForm.type}
                    onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, type: e.target.value as EquipmentMaintenanceType }))}>
                    <option value={EquipmentMaintenanceType.PREVENTIVO}>Preventivo</option>
                    <option value={EquipmentMaintenanceType.CORRECTIVO}>Correctivo</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Resultado</Label>
                  <select className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={model.maintenanceForm.result}
                    onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, result: e.target.value as EquipmentMaintenanceResult }))}>
                    <option value={EquipmentMaintenanceResult.COMPLETADO}>Completado</option>
                    <option value={EquipmentMaintenanceResult.CON_OBSERVACIONES}>Con observaciones</option>
                    <option value={EquipmentMaintenanceResult.FALLIDO}>Fallido</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Evidencia <span className="text-slate-400">(opcional)</span></Label>
                <Input value={model.maintenanceForm.evidenceRef}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, evidenceRef: e.target.value }))}
                  className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
              </div>
              <Button type="submit" disabled={model.creatingMaintenance} size="sm"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs">
                {model.creatingMaintenance ? 'Guardando...' : <><Save className="mr-1.5 h-3.5 w-3.5" />Guardar mantenimiento</>}
              </Button>
            </form>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs py-8">
              <Wrench className="h-6 w-6 mx-auto mb-2 opacity-20" />
              Registra un nuevo mantenimiento
            </div>
          )}
        </div>

        {/* Vincular uso a lote */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Link className="h-4 w-4 text-violet-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Vincular a lote</h3>
            <Button type="button" size="sm" onClick={() => setShowUsageForm((v) => !v)}
              className={`ml-auto ${showUsageForm ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200' : 'bg-violet-600 hover:bg-violet-700 text-white'} rounded-xl h-7 text-xs px-2.5`}>
              {showUsageForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {showUsageForm ? (
            <form className="p-4 space-y-3" onSubmit={handleUsageSubmit}>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">ID Lote de producción</Label>
                <Input value={model.usageForm.productionBatchId}
                  onChange={(e) => model.setUsageForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                  required className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 font-mono text-xs" placeholder="UUID" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Equipo</Label>
                <select className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={model.usageForm.equipmentId}
                  onChange={(e) => model.setUsageForm((p) => ({ ...p, equipmentId: e.target.value }))}
                  required>
                  <option value="">Selecciona...</option>
                  {model.equipment.map((r) => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Fecha de uso <span className="text-slate-400">(opcional)</span></Label>
                <Input type="date" value={model.usageForm.usedAt}
                  onChange={(e) => model.setUsageForm((p) => ({ ...p, usedAt: e.target.value }))}
                  className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Notas <span className="text-slate-400">(opcional)</span></Label>
                <Input value={model.usageForm.notes}
                  onChange={(e) => model.setUsageForm((p) => ({ ...p, notes: e.target.value }))}
                  className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
              </div>
              <Button type="submit" disabled={model.registeringUsage} size="sm"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs">
                {model.registeringUsage ? 'Guardando...' : <><Save className="mr-1.5 h-3.5 w-3.5" />Registrar uso</>}
              </Button>
            </form>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs py-8">
              <Link className="h-6 w-6 mx-auto mb-2 opacity-20" />
              Vincula un equipo a un lote
            </div>
          )}
        </div>
      </div>

      {/* History viewer */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <History className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Historial por equipo</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5 max-w-sm">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Seleccionar equipo</Label>
            <select className={selectClass} value={model.selectedEquipmentId}
              onChange={(e) => model.setSelectedEquipmentId(e.target.value)}>
              <option value="">Selecciona un equipo...</option>
              {model.equipment.map((r) => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}
            </select>
          </div>

          {model.loadingEquipmentHistory ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="animate-spin h-4 w-4 border-2 border-slate-200 border-t-violet-600 rounded-full" />Cargando historial...
            </div>
          ) : !model.selectedEquipmentId ? (
            <div className="text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              Selecciona un equipo para ver su historial.
            </div>
          ) : !model.equipmentHistory ? (
            <div className="text-sm text-slate-400">No se encontró historial.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Calibrations */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calibraciones ({model.equipmentHistory.calibrations.length})</p>
                <div className="space-y-2">
                  {model.equipmentHistory.calibrations.length === 0
                    ? <p className="text-xs text-slate-400">Sin registros.</p>
                    : model.equipmentHistory.calibrations.slice(0, 5).map((row) => (
                      <div key={row.id} className="text-xs flex items-center justify-between gap-2">
                        <span className="text-slate-600">{formatDate(row.executedAt)}</span>
                        <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${calibResultStyle[row.result] || ''}`}>{row.result}</Badge>
                        <span className="text-slate-400">→ {formatDate(row.dueAt)}</span>
                      </div>
                    ))}
                </div>
              </div>
              {/* Maintenances */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mantenimientos ({model.equipmentHistory.maintenances.length})</p>
                <div className="space-y-2">
                  {model.equipmentHistory.maintenances.length === 0
                    ? <p className="text-xs text-slate-400">Sin registros.</p>
                    : model.equipmentHistory.maintenances.slice(0, 5).map((row) => (
                      <div key={row.id} className="text-xs flex items-center justify-between gap-2">
                        <span className="text-slate-600">{formatDate(row.executedAt)}</span>
                        <span className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 rounded-lg px-1.5 py-0.5">{row.type}</span>
                        <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${maintResultStyle[row.result] || ''}`}>{row.result}</Badge>
                      </div>
                    ))}
                </div>
              </div>
              {/* Usages */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Usos en lote ({model.equipmentHistory.usages.length})</p>
                <div className="space-y-2">
                  {model.equipmentHistory.usages.length === 0
                    ? <p className="text-xs text-slate-400">Sin registros.</p>
                    : model.equipmentHistory.usages.slice(0, 5).map((row) => (
                      <div key={row.id} className="text-xs flex items-center justify-between gap-2">
                        <span className="text-slate-600">{formatDate(row.usedAt)}</span>
                        <span className="font-mono font-semibold text-slate-700">{row.productionBatch?.code || row.productionBatchId.slice(0, 8) + '...'}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent equipment usage log */}
      {model.equipmentUsage.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-violet-500" />
            <h3 className="font-semibold text-slate-800">Últimos usos registrados</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.equipmentUsage.length}</span>
          </div>
          <div className="p-4 space-y-2">
            {model.loadingEquipmentUsage ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="animate-spin h-4 w-4 border-2 border-slate-200 border-t-violet-600 rounded-full" />Cargando...
              </div>
            ) : model.equipmentUsage.slice(0, 15).map((row) => (
              <div key={row.id} className="flex items-center justify-between text-xs border border-slate-100 bg-slate-50/60 rounded-xl px-3 py-2.5">
                <span className="font-bold text-slate-700 font-mono">{row.equipment?.code || row.equipmentId.slice(0, 8)}</span>
                <span className="text-slate-500 mx-2">—</span>
                <span className="flex-1 text-slate-600 truncate">{row.equipment?.name || 'Equipo'}</span>
                <span className="text-slate-400 mx-2 shrink-0">Lote: <span className="font-mono font-semibold text-slate-700">{row.productionBatch?.code || row.productionBatchId.slice(0, 8)}...</span></span>
                <span className="text-slate-400 shrink-0">{formatDate(row.usedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TabsContent>
  );
}
