import {
  EquipmentCalibrationResult,
  EquipmentMaintenanceResult,
  EquipmentMaintenanceType,
  EquipmentStatus,
} from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

const formatDate = (value?: string | Date) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

export function QualityEquipmentTab({ model }: { model: QualityComplianceModel }) {
  return (
    <TabsContent value="equipment" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Calibración y Mantenimiento de Equipos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-slate-500">Equipos registrados</div>
            <div className="text-2xl font-semibold">{model.equipment.length}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-slate-500">Equipos críticos</div>
            <div className="text-2xl font-semibold">{model.criticalEquipmentCount}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-slate-500">Alertas próximas/vencidas</div>
            <div className="text-2xl font-semibold">{model.equipmentAlerts.length}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateEquipment}>
            <div className="space-y-1">
              <Label>Código</Label>
              <Input
                value={model.equipmentForm.code}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, code: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={model.equipmentForm.name}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Área (opcional)</Label>
              <Input
                value={model.equipmentForm.area}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, area: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                value={model.equipmentForm.status}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, status: e.target.value as EquipmentStatus }))}
              >
                <option value={EquipmentStatus.ACTIVO}>activo</option>
                <option value={EquipmentStatus.INACTIVO}>inactivo</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Frecuencia calibración (días)</Label>
              <Input
                type="number"
                min={1}
                value={model.equipmentForm.calibrationFrequencyDays}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, calibrationFrequencyDays: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Frecuencia mantenimiento (días)</Label>
              <Input
                type="number"
                min={1}
                value={model.equipmentForm.maintenanceFrequencyDays}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, maintenanceFrequencyDays: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={model.equipmentForm.isCritical}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, isCritical: e.target.checked }))}
              />
              Equipo crítico para liberación QA
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={model.equipmentForm.notes}
                onChange={(e) => model.setEquipmentForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={model.creatingEquipment}>
                {model.creatingEquipment ? 'Guardando...' : 'Guardar equipo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Registrar Calibración</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={model.handleCreateCalibration}>
              <div className="space-y-1">
                <Label>Equipo</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                  value={model.calibrationForm.equipmentId}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, equipmentId: e.target.value }))}
                >
                  <option value="">Selecciona equipo</option>
                  {model.equipment.map((row) => (
                    <option key={row.id} value={row.id}>{row.code} - {row.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Fecha ejecución</Label>
                <Input
                  type="date"
                  value={model.calibrationForm.executedAt}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, executedAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha vencimiento</Label>
                <Input
                  type="date"
                  value={model.calibrationForm.dueAt}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, dueAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Resultado</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                  value={model.calibrationForm.result}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, result: e.target.value as EquipmentCalibrationResult }))}
                >
                  <option value={EquipmentCalibrationResult.APROBADA}>aprobada</option>
                  <option value={EquipmentCalibrationResult.RECHAZADA}>rechazada</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Certificado (opcional)</Label>
                <Input
                  value={model.calibrationForm.certificateRef}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, certificateRef: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Evidencia (opcional)</Label>
                <Input
                  value={model.calibrationForm.evidenceRef}
                  onChange={(e) => model.setCalibrationForm((p) => ({ ...p, evidenceRef: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={model.creatingCalibration}>
                {model.creatingCalibration ? 'Guardando...' : 'Guardar calibración'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrar Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={model.handleCreateMaintenance}>
              <div className="space-y-1">
                <Label>Equipo</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                  value={model.maintenanceForm.equipmentId}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, equipmentId: e.target.value }))}
                >
                  <option value="">Selecciona equipo</option>
                  {model.equipment.map((row) => (
                    <option key={row.id} value={row.id}>{row.code} - {row.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Fecha ejecución</Label>
                <Input
                  type="date"
                  value={model.maintenanceForm.executedAt}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, executedAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha vencimiento</Label>
                <Input
                  type="date"
                  value={model.maintenanceForm.dueAt}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, dueAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                  value={model.maintenanceForm.type}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, type: e.target.value as EquipmentMaintenanceType }))}
                >
                  <option value={EquipmentMaintenanceType.PREVENTIVO}>preventivo</option>
                  <option value={EquipmentMaintenanceType.CORRECTIVO}>correctivo</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Resultado</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                  value={model.maintenanceForm.result}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, result: e.target.value as EquipmentMaintenanceResult }))}
                >
                  <option value={EquipmentMaintenanceResult.COMPLETADO}>completado</option>
                  <option value={EquipmentMaintenanceResult.CON_OBSERVACIONES}>con observaciones</option>
                  <option value={EquipmentMaintenanceResult.FALLIDO}>fallido</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Evidencia (opcional)</Label>
                <Input
                  value={model.maintenanceForm.evidenceRef}
                  onChange={(e) => model.setMaintenanceForm((p) => ({ ...p, evidenceRef: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={model.creatingMaintenance}>
                {model.creatingMaintenance ? 'Guardando...' : 'Guardar mantenimiento'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vincular Equipo a Lote</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleRegisterEquipmentUsage}>
            <div className="space-y-1">
              <Label>ID lote de producción</Label>
              <Input
                value={model.usageForm.productionBatchId}
                onChange={(e) => model.setUsageForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Equipo</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                value={model.usageForm.equipmentId}
                onChange={(e) => model.setUsageForm((p) => ({ ...p, equipmentId: e.target.value }))}
                required
              >
                <option value="">Selecciona equipo</option>
                {model.equipment.map((row) => (
                  <option key={row.id} value={row.id}>{row.code} - {row.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Fecha de uso (opcional)</Label>
              <Input
                type="date"
                value={model.usageForm.usedAt}
                onChange={(e) => model.setUsageForm((p) => ({ ...p, usedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas (opcional)</Label>
              <Input
                value={model.usageForm.notes}
                onChange={(e) => model.setUsageForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={model.registeringUsage}>
                {model.registeringUsage ? 'Guardando...' : 'Registrar uso'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Vencimiento ({model.equipmentAlerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {model.loadingEquipmentAlerts ? <div>Cargando...</div> : model.equipmentAlerts.length === 0 ? (
            <div className="text-sm text-slate-500">Sin alertas.</div>
          ) : model.equipmentAlerts.map((alert, idx) => (
            <div key={`${alert.equipmentId}-${alert.alertType}-${idx}`} className="border rounded-md p-3">
              <div className="font-medium">{alert.equipmentCode} - {alert.equipmentName}</div>
              <div className="text-xs text-slate-600 mt-1">
                {alert.alertType === 'calibration' ? 'Calibración' : 'Mantenimiento'} vence: {formatDate(alert.dueAt)}
              </div>
              <div className="text-xs text-slate-600">
                {alert.daysRemaining < 0 ? `Vencido hace ${Math.abs(alert.daysRemaining)} día(s)` : `Vence en ${alert.daysRemaining} día(s)`}
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline">{alert.severity}</Badge>
                {alert.isCritical ? <Badge variant="outline">crítico</Badge> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipos ({model.equipment.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {model.loadingEquipment ? <div>Cargando...</div> : model.equipment.length === 0 ? (
            <div className="text-sm text-slate-500">Sin equipos.</div>
          ) : model.equipment.map((row) => (
            <div key={row.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{row.code} - {row.name}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Área: {row.area || 'N/A'} | Calibración: {formatDate(row.nextCalibrationDueAt)} | Mantenimiento: {formatDate(row.nextMaintenanceDueAt)}
                </div>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline">{row.status}</Badge>
                  {row.isCritical ? <Badge variant="outline">crítico</Badge> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => model.quickToggleEquipmentStatus(row.id, row.status)}>
                  {row.status === EquipmentStatus.ACTIVO ? 'Inactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => model.setSelectedEquipmentId(row.id)}>
                  Historial
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial por Equipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Seleccionar equipo</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
              value={model.selectedEquipmentId}
              onChange={(e) => model.setSelectedEquipmentId(e.target.value)}
            >
              <option value="">Selecciona equipo</option>
              {model.equipment.map((row) => (
                <option key={row.id} value={row.id}>{row.code} - {row.name}</option>
              ))}
            </select>
          </div>

          {model.loadingEquipmentHistory ? <div>Cargando historial...</div> : null}
          {!model.loadingEquipmentHistory && model.selectedEquipmentId && !model.equipmentHistory ? (
            <div className="text-sm text-slate-500">No se encontró historial para el equipo seleccionado.</div>
          ) : null}

          {model.equipmentHistory ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
              <div className="border rounded-md p-3">
                <div className="font-medium">Calibraciones ({model.equipmentHistory.calibrations.length})</div>
                <div className="space-y-2 mt-2">
                  {model.equipmentHistory.calibrations.slice(0, 5).map((row) => (
                    <div key={row.id} className="text-xs text-slate-600">
                      {formatDate(row.executedAt)} | {row.result} | vence {formatDate(row.dueAt)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded-md p-3">
                <div className="font-medium">Mantenimientos ({model.equipmentHistory.maintenances.length})</div>
                <div className="space-y-2 mt-2">
                  {model.equipmentHistory.maintenances.slice(0, 5).map((row) => (
                    <div key={row.id} className="text-xs text-slate-600">
                      {formatDate(row.executedAt)} | {row.type} | {row.result}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded-md p-3">
                <div className="font-medium">Usos en lote ({model.equipmentHistory.usages.length})</div>
                <div className="space-y-2 mt-2">
                  {model.equipmentHistory.usages.slice(0, 5).map((row) => (
                    <div key={row.id} className="text-xs text-slate-600">
                      {formatDate(row.usedAt)} | Lote: {row.productionBatch?.code || row.productionBatchId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Usos de Equipos ({model.equipmentUsage.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {model.loadingEquipmentUsage ? <div>Cargando...</div> : model.equipmentUsage.length === 0 ? (
            <div className="text-sm text-slate-500">Sin usos registrados.</div>
          ) : model.equipmentUsage.slice(0, 15).map((row) => (
            <div key={row.id} className="border rounded-md p-3">
              <div className="font-medium">{row.equipment?.code || row.equipmentId} - {row.equipment?.name || 'Equipo'}</div>
              <div className="text-xs text-slate-600 mt-1">
                Lote: {row.productionBatch?.code || row.productionBatchId} | Uso: {formatDate(row.usedAt)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
