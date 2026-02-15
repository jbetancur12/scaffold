import {
  RecallNotificationStatus,
  RecallScopeType,
  RecallStatus,
} from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityRecallTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="recall" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear Recall / Simulacro</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateRecall}>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input
                                        value={model.recallForm.title}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Tipo de alcance</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.recallForm.scopeType}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, scopeType: e.target.value as RecallScopeType }))}
                                    >
                                        <option value={RecallScopeType.LOTE}>Por lote</option>
                                        <option value={RecallScopeType.SERIAL}>Por serial</option>
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Motivo</Label>
                                    <Textarea
                                        value={model.recallForm.reason}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, reason: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código de lote</Label>
                                    <Input
                                        value={model.recallForm.lotCode}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, lotCode: e.target.value }))}
                                        required={model.recallForm.scopeType === RecallScopeType.LOTE}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código serial</Label>
                                    <Input
                                        value={model.recallForm.serialCode}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, serialCode: e.target.value }))}
                                        required={model.recallForm.scopeType === RecallScopeType.SERIAL}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Cantidad afectada</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={model.recallForm.affectedQuantity}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, affectedQuantity: Number(e.target.value) || 1 }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Objetivo de respuesta (min)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={model.recallForm.targetResponseMinutes}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, targetResponseMinutes: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center justify-between">
                                    <label className="text-sm flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={model.recallForm.isMock}
                                            onChange={(e) => model.setRecallForm((p) => ({ ...p, isMock: e.target.checked }))}
                                        />
                                        Marcar como simulacro
                                    </label>
                                    <Button type="submit" disabled={model.creatingRecall}>
                                        {model.creatingRecall ? 'Guardando...' : 'Crear recall'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Casos de Recall ({model.recalls.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {model.loadingRecalls ? <div>Cargando...</div> : model.recalls.length === 0 ? <div className="text-sm text-slate-500">Sin model.recalls registrados.</div> : model.recalls.map((recall) => (
                                <div key={recall.id} className="border rounded-md p-3 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium">{recall.code} - {recall.title}</div>
                                            <div className="text-sm text-slate-600">{recall.reason}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Alcance: {recall.scopeType} | Lote: {recall.lotCode || 'N/A'} | Serial: {recall.serialCode || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Recuperado: {recall.retrievedQuantity}/{recall.affectedQuantity} ({recall.coveragePercent}%)
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Simulacro: {recall.isMock ? 'Sí' : 'No'} | Meta(min): {recall.targetResponseMinutes || 'N/A'} | Real(min): {recall.actualResponseMinutes || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Inicio: {new Date(recall.startedAt).toLocaleString()} {recall.endedAt ? `| Cierre: ${new Date(recall.endedAt).toLocaleString()}` : ''}
                                            </div>
                                            {recall.closureEvidence ? (
                                                <div className="text-xs text-slate-500 mt-1">Evidencia: {recall.closureEvidence}</div>
                                            ) : null}
                                            <Badge variant="outline" className="mt-2">{recall.status}</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => model.quickShowRecallAffectedCustomers(recall.id)}>
                                                Ver afectados
                                            </Button>
                                            {recall.status !== RecallStatus.CERRADO ? (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => model.quickUpdateRecallProgress(recall.id, recall.retrievedQuantity)}>
                                                        Actualizar avance
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => model.quickCreateRecallNotification(recall.id)}>
                                                        Notificar cliente
                                                    </Button>
                                                    <Button size="sm" onClick={() => model.quickCloseRecall(recall.id)}>
                                                        Cerrar con evidencia
                                                    </Button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="border rounded-md p-2 space-y-2">
                                        <div className="text-sm font-medium">Notificaciones ({recall.notifications?.length || 0})</div>
                                        {recall.notifications && recall.notifications.length > 0 ? recall.notifications.map((notification) => (
                                            <div key={notification.id} className="border rounded p-2 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-medium">{notification.recipientName}</div>
                                                    <div className="text-xs text-slate-600">
                                                        {notification.channel} | {notification.recipientContact}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Enviada: {notification.sentAt ? new Date(notification.sentAt).toLocaleString() : 'pendiente'} | Confirmada: {notification.acknowledgedAt ? new Date(notification.acknowledgedAt).toLocaleString() : 'pendiente'}
                                                    </div>
                                                    <Badge variant="outline" className="mt-2">{notification.status}</Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    {notification.status === RecallNotificationStatus.PENDIENTE ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => model.quickUpdateRecallNotificationStatus(notification.id, RecallNotificationStatus.ENVIADA)}
                                                        >
                                                            Marcar enviada
                                                        </Button>
                                                    ) : null}
                                                    {notification.status !== RecallNotificationStatus.CONFIRMADA ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => model.quickUpdateRecallNotificationStatus(notification.id, RecallNotificationStatus.CONFIRMADA)}
                                                        >
                                                            Marcar confirmada
                                                        </Button>
                                                    ) : null}
                                                    {notification.status !== RecallNotificationStatus.FALLIDA ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => model.quickUpdateRecallNotificationStatus(notification.id, RecallNotificationStatus.FALLIDA)}
                                                        >
                                                            Marcar fallida
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-xs text-slate-500">Sin notificaciones registradas.</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

  );
}
