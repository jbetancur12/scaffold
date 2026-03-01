import { useState } from 'react';
import { InvimaRegistrationStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    FileCheck, Hash, Building2, Calendar,
    Stethoscope, AlertCircle, Save, Plus,
    CheckCircle2, Info, Factory, CalendarDays
} from 'lucide-react';
import type { QualityComplianceModel } from '../types';

export function QualityInvimaTab({ model }: { model: QualityComplianceModel }) {
    const [showForm, setShowForm] = useState(false);

    const getStatusStyle = (status: InvimaRegistrationStatus) => {
        switch (status) {
            case InvimaRegistrationStatus.ACTIVO:
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
            case InvimaRegistrationStatus.SUSPENDIDO:
                return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
            case InvimaRegistrationStatus.INACTIVO:
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/20';
        }
    };

    const getStatusIcon = (status: InvimaRegistrationStatus) => {
        switch (status) {
            case InvimaRegistrationStatus.ACTIVO:
                return <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />;
            case InvimaRegistrationStatus.SUSPENDIDO:
                return <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" />;
            default:
                return <Info className="w-3.5 h-3.5 mr-1 text-slate-400" />;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        model.handleCreateInvimaRegistration(e);
        setShowForm(false);
    };

    return (
        <TabsContent value="invima" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-fuchsia-600" />
                        Registros INVIMA
                        <Badge variant="secondary" className="bg-slate-200 hover:bg-slate-200 text-slate-700 ml-1 rounded-full font-bold">
                            {model.invimaRegistrations.length}
                        </Badge>
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">Registros sanitarios y permisos de comercialización.</p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-sm shadow-fuchsia-200 font-medium rounded-xl h-10 px-5"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Registro
                </Button>
            </div>

            {/* List */}
            {model.loadingInvimaRegistrations ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="animate-spin mb-4 h-8 w-8 border-4 border-slate-200 border-t-fuchsia-600 rounded-full" />
                    <p className="font-medium animate-pulse">Cargando registros...</p>
                </div>
            ) : model.invimaRegistrations.length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed rounded-2xl py-20 px-6 text-center shadow-sm">
                    <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-slate-50/50">
                        <FileCheck className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Sin registros INVIMA</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                        No hay registros sanitarios documentados. Cree el primero para hacer seguimiento.
                    </p>
                    <Button
                        onClick={() => setShowForm(true)}
                        variant="outline"
                        className="rounded-xl border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Crear primer registro
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {model.invimaRegistrations.map((reg) => {
                        const isExpired = reg.validUntil && new Date(reg.validUntil) < new Date();
                        const expiringSoon = reg.validUntil && !isExpired &&
                            (new Date(reg.validUntil).getTime() - new Date().getTime()) < (90 * 24 * 60 * 60 * 1000);

                        return (
                            <Card key={reg.id} className="group border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-fuchsia-200 duration-200 overflow-hidden bg-white">
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900 text-base font-mono tracking-tight break-all">
                                                {reg.code}
                                            </h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                                                <Building2 className="h-3 w-3 shrink-0" />
                                                {reg.holderName}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className={`shrink-0 capitalize font-semibold tracking-wide ring-1 ring-inset flex items-center ${getStatusStyle(reg.status)}`}>
                                            {getStatusIcon(reg.status)}
                                            {reg.status.toLowerCase()}
                                        </Badge>
                                    </div>

                                    {reg.manufacturerName && (
                                        <div className="flex items-start gap-2 text-sm mb-4">
                                            <Factory className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                            <div className="text-slate-700 leading-tight">
                                                <span className="text-slate-500 block text-xs">Fabricante</span>
                                                {reg.manufacturerName}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs font-medium pt-4 border-t border-slate-100">
                                        <div className="flex items-center text-slate-500 gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{reg.validFrom ? new Date(reg.validFrom).toLocaleDateString() : '--'}</span>
                                        </div>
                                        <div className="text-slate-300">→</div>
                                        <div className={`flex items-center gap-1.5 ${isExpired ? 'text-red-600 font-bold' : expiringSoon ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{reg.validUntil ? new Date(reg.validUntil).toLocaleDateString() : 'Indefinido'}</span>
                                            {(isExpired || expiringSoon) && <AlertCircle className="h-3.5 w-3.5" />}
                                        </div>
                                    </div>
                                </div>
                                {isExpired && reg.status === InvimaRegistrationStatus.ACTIVO && (
                                    <div className="bg-red-50 px-5 py-2 text-xs font-medium text-red-700 border-t border-red-100 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        Registro vencido — requiere renovación urgente.
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Creation Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader className="mb-2">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2.5 bg-fuchsia-50 text-fuchsia-600 rounded-xl ring-1 ring-fuchsia-100">
                                <Stethoscope className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-slate-900">Nuevo Registro INVIMA</DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 mt-0.5">
                                    Complete la información del registro sanitario.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1 */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                <FileCheck className="h-4 w-4 text-fuchsia-500" />
                                <h4 className="font-semibold text-slate-800 text-sm">Información General</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">
                                        Código INVIMA <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        <Input
                                            className="pl-9 h-10 border-slate-200 focus-visible:ring-fuchsia-500 rounded-xl bg-white"
                                            placeholder="Ej. 2018DM-0017551"
                                            value={model.invimaRegistrationForm.code}
                                            onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, code: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">
                                        Estado <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 cursor-pointer"
                                        value={model.invimaRegistrationForm.status}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, status: e.target.value as InvimaRegistrationStatus }))}
                                    >
                                        <option value={InvimaRegistrationStatus.ACTIVO}>Activo</option>
                                        <option value={InvimaRegistrationStatus.INACTIVO}>Inactivo</option>
                                        <option value={InvimaRegistrationStatus.SUSPENDIDO}>Suspendido</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                <Building2 className="h-4 w-4 text-fuchsia-500" />
                                <h4 className="font-semibold text-slate-800 text-sm">Entidades</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">
                                        Titular <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        <Input
                                            className="pl-9 h-10 border-slate-200 focus-visible:ring-fuchsia-500 rounded-xl bg-white"
                                            placeholder="Empresa titular del registro"
                                            value={model.invimaRegistrationForm.holderName}
                                            onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, holderName: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">
                                        Fabricante <span className="text-slate-400 font-normal text-xs">(Opcional)</span>
                                    </Label>
                                    <div className="relative">
                                        <Factory className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        <Input
                                            className="pl-9 h-10 border-slate-200 focus-visible:ring-fuchsia-500 rounded-xl bg-white"
                                            placeholder="Si es distinto al titular"
                                            value={model.invimaRegistrationForm.manufacturerName}
                                            onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, manufacturerName: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                <CalendarDays className="h-4 w-4 text-fuchsia-500" />
                                <h4 className="font-semibold text-slate-800 text-sm">Vigencia y Notas</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-slate-700">Válido Desde</Label>
                                        <Input
                                            type="date"
                                            className="h-10 border-slate-200 focus-visible:ring-fuchsia-500 rounded-xl bg-white"
                                            value={model.invimaRegistrationForm.validFrom}
                                            onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, validFrom: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-slate-700">Válido Hasta</Label>
                                        <Input
                                            type="date"
                                            className="h-10 border-slate-200 focus-visible:ring-fuchsia-500 rounded-xl bg-white"
                                            value={model.invimaRegistrationForm.validUntil}
                                            onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, validUntil: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">Notas</Label>
                                    <Textarea
                                        className="h-[80px] resize-none border-slate-200 focus-visible:ring-fuchsia-500 rounded-xl bg-white"
                                        placeholder="Restricciones u observaciones..."
                                        value={model.invimaRegistrationForm.notes}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, notes: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={model.creatingInvimaRegistration}
                                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-sm font-medium rounded-xl h-10 px-6"
                            >
                                {model.creatingInvimaRegistration ? (
                                    <>
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Guardar Registro
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </TabsContent>
    );
}
