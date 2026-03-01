import { OperationalAlertRole, OperationalAlertSeverity } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Download, Filter } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const severityLabel: Record<OperationalAlertSeverity, string> = {
  [OperationalAlertSeverity.CRITICA]: 'Crítica',
  [OperationalAlertSeverity.ALTA]: 'Alta',
  [OperationalAlertSeverity.MEDIA]: 'Media',
};

const severityStyle: Record<OperationalAlertSeverity, string> = {
  [OperationalAlertSeverity.CRITICA]: 'bg-red-50 text-red-700 border-red-200',
  [OperationalAlertSeverity.ALTA]: 'bg-orange-50 text-orange-700 border-orange-200',
  [OperationalAlertSeverity.MEDIA]: 'bg-amber-50 text-amber-700 border-amber-200',
};

const alertBorderStyle: Record<OperationalAlertSeverity, string> = {
  [OperationalAlertSeverity.CRITICA]: 'border-red-200 bg-red-50/20',
  [OperationalAlertSeverity.ALTA]: 'border-orange-200 bg-orange-50/20',
  [OperationalAlertSeverity.MEDIA]: 'border-amber-200 bg-amber-50/20',
};

const roleOptions: Array<{ value: OperationalAlertRole | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los roles' },
  { value: OperationalAlertRole.QA, label: 'QA' },
  { value: OperationalAlertRole.PRODUCCION, label: 'Producción' },
  { value: OperationalAlertRole.REGULATORIO, label: 'Regulatorio' },
  { value: OperationalAlertRole.DIRECCION_TECNICA, label: 'Dirección Técnica' },
];

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
};

export function QualityOperationalAlertsTab({ model }: { model: QualityComplianceModel }) {
  const criticalAlerts = model.operationalAlerts.filter((a) => a.severity === OperationalAlertSeverity.CRITICA).length;
  const highAlerts = model.operationalAlerts.filter((a) => a.severity === OperationalAlertSeverity.ALTA).length;
  const currentRoleLabel = roleOptions.find((o) => o.value === model.alertsRole)?.label ?? 'Todos';

  return (
    <TabsContent value="alerts" className="space-y-5">

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
              <Bell className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Alertas Operativas</h2>
              <p className="text-slate-500 text-sm mt-0.5">Bandeja de alertas por rol: vencimientos, NC abiertas, despachos sin confirmar y más.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
          {[
            { label: 'Total', value: model.operationalAlerts.length, color: 'text-slate-700', bg: '' },
            { label: 'Críticas', value: criticalAlerts, color: criticalAlerts > 0 ? 'text-red-600' : 'text-slate-400', bg: criticalAlerts > 0 ? 'bg-red-50/60' : '' },
            { label: 'Altas', value: highAlerts, color: highAlerts > 0 ? 'text-orange-700' : 'text-slate-400', bg: highAlerts > 0 ? 'bg-orange-50/60' : '' },
            { label: 'Rol activo', value: currentRoleLabel, isText: true, color: 'text-violet-700', bg: 'bg-violet-50/40' },
          ].map(({ label, value, color, bg, isText }) => (
            <div key={label} className={`flex flex-col items-center py-3 px-2 ${bg}`}>
              <span className={`${isText ? 'text-sm' : 'text-2xl'} font-bold ${color}`}>{value}</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5 text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters + Export */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Filter className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Filtros y reporte</h3>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Rol</Label>
            <div className="flex flex-wrap gap-1.5">
              {roleOptions.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => model.setAlertsRole(opt.value as OperationalAlertRole | 'all')}
                  className={`h-8 px-3 rounded-xl text-xs font-semibold border transition-all ${model.alertsRole === opt.value ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ventana (días)</Label>
            <Input type="number" min={1} max={90} value={model.daysAhead}
              onChange={(e) => model.setDaysAhead(Number(e.target.value) || 30)}
              className="h-9 w-28 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" disabled={model.exportingWeeklyComplianceReport}
              onClick={() => model.handleExportWeeklyComplianceReport('csv')}
              className="rounded-xl border-slate-200 h-9 text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" />{model.exportingWeeklyComplianceReport ? 'Generando...' : 'CSV semanal'}
            </Button>
            <Button variant="outline" size="sm" disabled={model.exportingWeeklyComplianceReport}
              onClick={() => model.handleExportWeeklyComplianceReport('json')}
              className="rounded-xl border-slate-200 h-9 text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" />{model.exportingWeeklyComplianceReport ? 'Generando...' : 'JSON semanal'}
            </Button>
          </div>
        </div>
      </div>

      {/* Alert rows */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Bell className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Bandeja</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.operationalAlerts.length}</span>
        </div>
        <div className="p-4 space-y-2">
          {model.loadingOperationalAlerts ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
              <span className="text-sm animate-pulse">Cargando alertas...</span>
            </div>
          ) : model.operationalAlerts.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin alertas para el filtro actual.</p>
              <p className="text-xs mt-1">Prueba con otro rol o aumenta la ventana de días.</p>
            </div>
          ) : model.operationalAlerts.map((alert) => (
            <div key={alert.id}
              className={`border rounded-2xl p-4 flex flex-wrap items-start justify-between gap-3 ${alertBorderStyle[alert.severity] || 'border-slate-200 bg-white'}`}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                  <Badge variant="outline" className={`text-[10px] font-bold ring-1 ring-inset ${severityStyle[alert.severity]}`}>
                    {severityLabel[alert.severity]}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{alert.description}</p>
                <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                  <span>Tipo: <span className="font-medium text-slate-700">{alert.type}</span></span>
                  <span>Entidad: <span className="font-medium text-slate-700">{alert.entityType}</span> / <span className="font-mono">{shortId(alert.entityCode || alert.entityId)}</span></span>
                  {alert.dueAt && (
                    <span>Vence: <span className="font-semibold text-slate-700">{new Date(alert.dueAt).toLocaleDateString('es-CO')}</span></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TabsContent>
  );
}
