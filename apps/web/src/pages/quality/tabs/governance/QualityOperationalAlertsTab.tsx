import { OperationalAlertRole, OperationalAlertSeverity } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

const severityLabel: Record<OperationalAlertSeverity, string> = {
  [OperationalAlertSeverity.CRITICA]: 'Crítica',
  [OperationalAlertSeverity.ALTA]: 'Alta',
  [OperationalAlertSeverity.MEDIA]: 'Media',
};

const roleOptions: Array<{ value: OperationalAlertRole | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los roles' },
  { value: OperationalAlertRole.QA, label: 'QA' },
  { value: OperationalAlertRole.PRODUCCION, label: 'Producción' },
  { value: OperationalAlertRole.REGULATORIO, label: 'Regulatorio' },
  { value: OperationalAlertRole.DIRECCION_TECNICA, label: 'Dirección técnica' },
];

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

export function QualityOperationalAlertsTab({ model }: { model: QualityComplianceModel }) {
  const criticalAlerts = model.operationalAlerts.filter((alert) => alert.severity === OperationalAlertSeverity.CRITICA).length;

  return (
    <TabsContent value="alerts" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Alertas Operativas y Bandeja por Rol</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-slate-500">Alertas activas</div>
            <div className="text-2xl font-semibold">{model.operationalAlerts.length}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-slate-500">Alertas críticas</div>
            <div className="text-2xl font-semibold">{criticalAlerts}</div>
          </div>
          <div className="rounded-md border p-3 md:col-span-2">
            <div className="text-slate-500">Filtro de rol</div>
            <div className="text-sm font-medium mt-1">{roleOptions.find((option) => option.value === model.alertsRole)?.label}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y Reporte Semanal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Rol</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                value={model.alertsRole}
                onChange={(e) => model.setAlertsRole(e.target.value as OperationalAlertRole | 'all')}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Ventana de alerta (días)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={model.daysAhead}
                onChange={(e) => model.setDaysAhead(Number(e.target.value) || 30)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              disabled={model.exportingWeeklyComplianceReport}
              onClick={() => model.handleExportWeeklyComplianceReport('csv')}
            >
              {model.exportingWeeklyComplianceReport ? 'Generando...' : 'Reporte semanal CSV'}
            </Button>
            <Button
              variant="outline"
              disabled={model.exportingWeeklyComplianceReport}
              onClick={() => model.handleExportWeeklyComplianceReport('json')}
            >
              {model.exportingWeeklyComplianceReport ? 'Generando...' : 'Reporte semanal JSON'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bandeja ({model.operationalAlerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {model.loadingOperationalAlerts ? <div>Cargando...</div> : model.operationalAlerts.length === 0 ? (
            <div className="text-sm text-slate-500">Sin alertas para el filtro seleccionado.</div>
          ) : model.operationalAlerts.map((alert) => (
            <div key={alert.id} className="border rounded-md p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{alert.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{alert.description}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Tipo: {alert.type} | Entidad: {alert.entityType} / {shortId(alert.entityCode || alert.entityId)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Vence: {alert.dueAt ? new Date(alert.dueAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{severityLabel[alert.severity]}</Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
