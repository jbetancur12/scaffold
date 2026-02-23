import {
  DocumentCategory,
  DocumentProcessAreaCode,
  DocumentStatus,
} from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  qualityDocumentCategoryLabels,
  qualityDocumentStatusLabels,
  qualityProcessAreaCodeLabels,
  qualityProcessLabels,
} from '@/constants/mrpQuality';
import type { QualityComplianceModel } from '../types';

export function QualityDocsTab({ model }: { model: QualityComplianceModel }) {
  const categoryOrder: DocumentCategory[] = [
    DocumentCategory.MAN,
    DocumentCategory.PRO,
    DocumentCategory.INS,
    DocumentCategory.FOR,
  ];

  const codePrefix = `${model.documentForm.processAreaCode.toUpperCase()}-${model.documentForm.documentCategory.toUpperCase()}-`;

  return (
    <TabsContent value="docs" className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Registrar Documento Controlado</CardTitle></CardHeader>
        <CardContent>
          {model.requiresInitialControlDocument ? (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                Primero debes crear el documento base: <strong>CONTROL DE DOCUMENTOS COLMOR</strong>.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Puedes definir el código libremente y luego crear los demás documentos.
              </p>
              <div className="mt-3">
                <Button type="button" variant="outline" onClick={model.presetInitialControlDocument}>
                  Usar plantilla del documento base
                </Button>
              </div>
            </div>
          ) : null}
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateDocument}>
            <div className="space-y-1">
              <Label>Categoría documental</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={model.documentForm.documentCategory}
                onChange={(e) => model.setDocumentForm((p) => ({ ...p, documentCategory: e.target.value as DocumentCategory }))}
              >
                <option value={DocumentCategory.MAN}>MAN - Manual de calidad</option>
                <option value={DocumentCategory.PRO}>PRO - Procedimientos</option>
                <option value={DocumentCategory.INS}>INS - Instructivos</option>
                <option value={DocumentCategory.FOR}>FOR - Formatos</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Área / macroproceso</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={model.documentForm.processAreaCode}
                onChange={(e) => model.setDocumentForm((p) => ({ ...p, processAreaCode: e.target.value as DocumentProcessAreaCode }))}
              >
                <option value={DocumentProcessAreaCode.GAF}>GAF - Gestión administrativa y financiera</option>
                <option value={DocumentProcessAreaCode.GC}>GC - Gestión de calidad</option>
                <option value={DocumentProcessAreaCode.GP}>GP - Gestión de la producción</option>
                <option value={DocumentProcessAreaCode.GTH}>GTH - Gestión de talento humano</option>
                <option value={DocumentProcessAreaCode.GS}>GS - Gestión de saneamiento</option>
                <option value={DocumentProcessAreaCode.GM}>GM - Gestión metrológica</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input value={codePrefix} readOnly className="max-w-[190px] bg-slate-50" />
                <Input
                  value={model.documentForm.codeNumber}
                  onChange={(e) => model.setDocumentForm((p) => ({ ...p, codeNumber: e.target.value.toUpperCase() }))}
                  placeholder="05"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">Solo escribe el consecutivo. Código final: <strong>{codePrefix}{model.documentForm.codeNumber || 'XX'}</strong></p>
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                value={model.documentForm.title}
                onChange={(e) => model.setDocumentForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Versión</Label>
              <Input
                type="number"
                min={1}
                value={model.documentForm.version}
                onChange={(e) => model.setDocumentForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Contenido / alcance</Label>
              <Textarea
                value={model.documentForm.content}
                onChange={(e) => model.setDocumentForm((p) => ({ ...p, content: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Vigencia desde</Label>
              <Input
                type="date"
                value={model.documentForm.effectiveDate}
                onChange={(e) => model.setDocumentForm((p) => ({ ...p, effectiveDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Vigencia hasta</Label>
              <Input
                type="date"
                value={model.documentForm.expiresAt}
                onChange={(e) => model.setDocumentForm((p) => ({ ...p, expiresAt: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={model.creatingDocument}>
                {model.creatingDocument ? 'Guardando...' : 'Crear documento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documentos ({model.documents.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {model.loadingDocuments ? <div>Cargando...</div> : model.documents.length === 0 ? (
            <div className="text-sm text-slate-500">Sin documentos.</div>
          ) : (
            <>
              {categoryOrder.map((category) => {
            const docs = model.documents.filter((doc) => doc.documentCategory === category);
            if (docs.length === 0) return null;
            return (
              <div key={category} className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  {qualityDocumentCategoryLabels[category]} ({docs.length})
                </div>
                {docs.map((doc) => (
                  <div key={doc.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{doc.code} v{doc.version} - {doc.title}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        Área: {doc.processAreaCode ? qualityProcessAreaCodeLabels[doc.processAreaCode] : 'N/A'} | Proceso: {qualityProcessLabels[doc.process]} | Estado: {qualityDocumentStatusLabels[doc.status]}
                      </div>
                      {doc.approvedAt ? (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Aprobado: {new Date(doc.approvedAt).toLocaleString()}
                        </div>
                      ) : null}
                      {doc.sourceFileName ? (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Fuente adjunta: {doc.sourceFileName}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-700 mt-1">Sin archivo fuente adjunto</div>
                      )}
                      <Badge variant="outline" className="mt-2">{qualityDocumentStatusLabels[doc.status]}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <div className="inline-flex">
                        <Input
                          id={`upload-doc-${doc.id}`}
                          type="file"
                          className="hidden"
                          accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            void model.handleUploadDocumentSource(doc.id, file);
                            e.currentTarget.value = '';
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          disabled={model.uploadingDocumentSource}
                          onClick={() => {
                            const input = document.getElementById(`upload-doc-${doc.id}`) as HTMLInputElement | null;
                            input?.click();
                          }}
                        >
                          {model.uploadingDocumentSource ? 'Adjuntando...' : 'Adjuntar archivo'}
                        </Button>
                      </div>
                      {doc.sourceFilePath ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => model.handleDownloadDocumentSource(doc.id, doc.sourceFileName)}
                        >
                          Descargar fuente
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => model.handlePrintDocument(doc.id)}
                      >
                        Imprimir/PDF
                      </Button>
                      {doc.status === DocumentStatus.BORRADOR ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={model.submittingDocument}
                          onClick={() => model.handleSubmitDocument(doc.id)}
                        >
                          Enviar revisión
                        </Button>
                      ) : null}
                      {doc.status === DocumentStatus.EN_REVISION ? (
                        <Button
                          size="sm"
                          disabled={model.approvingDocument}
                          onClick={() => model.handleApproveDocument(doc.id)}
                        >
                          Aprobar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            );
              })}
              {(() => {
                const uncategorized = model.documents.filter((doc) => !doc.documentCategory);
                if (uncategorized.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      Sin categoría ({uncategorized.length})
                    </div>
                    {uncategorized.map((doc) => (
                      <div key={doc.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{doc.code} v{doc.version} - {doc.title}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            Área: {doc.processAreaCode ? qualityProcessAreaCodeLabels[doc.processAreaCode] : 'N/A'} | Proceso: {qualityProcessLabels[doc.process]} | Estado: {qualityDocumentStatusLabels[doc.status]}
                          </div>
                          <Badge variant="outline" className="mt-2">{qualityDocumentStatusLabels[doc.status]}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => model.handlePrintDocument(doc.id)}>Imprimir/PDF</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
