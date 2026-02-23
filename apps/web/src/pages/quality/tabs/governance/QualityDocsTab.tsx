import {
  DocumentCategory,
  DocumentProcessAreaCode,
  DocumentStatus,
} from '@scaffold/types';
import { Fragment, useEffect, useMemo, useState } from 'react';
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
  const masterDocument = model.documents.find((doc) => doc.isInitialDictionary);
  const [indexQuery, setIndexQuery] = useState('');
  const [indexCategoryFilter, setIndexCategoryFilter] = useState<'all' | DocumentCategory | 'uncategorized'>('all');
  const [indexPage, setIndexPage] = useState(1);
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null);
  const [showObsolete, setShowObsolete] = useState(false);
  const INDEX_PAGE_SIZE = 8;
  const normalizedQuery = indexQuery.trim().toLowerCase();
  const filteredDocuments = useMemo(() => {
    const rows = [...model.documents].sort((a, b) => a.code.localeCompare(b.code));
    const byStatus = showObsolete
      ? rows
      : rows.filter((doc) => doc.status !== DocumentStatus.OBSOLETO);
    const byText = !normalizedQuery ? byStatus : byStatus.filter((doc) => {
      const code = doc.code.toLowerCase();
      const title = doc.title.toLowerCase();
      return code.includes(normalizedQuery) || title.includes(normalizedQuery);
    });
    if (indexCategoryFilter === 'all') return byText;
    if (indexCategoryFilter === 'uncategorized') return byText.filter((doc) => !doc.documentCategory);
    return byText.filter((doc) => doc.documentCategory === indexCategoryFilter);
  }, [model.documents, normalizedQuery, indexCategoryFilter, showObsolete]);
  const totalIndexPages = Math.max(1, Math.ceil(filteredDocuments.length / INDEX_PAGE_SIZE));
  const pagedDocuments = useMemo(() => {
    const start = (indexPage - 1) * INDEX_PAGE_SIZE;
    return filteredDocuments.slice(start, start + INDEX_PAGE_SIZE);
  }, [filteredDocuments, indexPage]);
  useEffect(() => {
    setIndexPage(1);
  }, [indexQuery, indexCategoryFilter]);
  useEffect(() => {
    if (indexPage > totalIndexPages) {
      setIndexPage(totalIndexPages);
    }
  }, [indexPage, totalIndexPages]);

  const codePrefix = `${model.documentForm.processAreaCode.toUpperCase()}-${model.documentForm.documentCategory.toUpperCase()}-`;
  const jumpToDocument = (id: string) => {
    const el = document.getElementById(`doc-row-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const openDocumentInIndex = (id: string, code: string) => {
    setIndexCategoryFilter('all');
    setIndexQuery(code);
    setIndexPage(1);
    setExpandedDocumentId(id);
    window.setTimeout(() => jumpToDocument(id), 120);
  };
  useEffect(() => {
    if (expandedDocumentId && !pagedDocuments.some((doc) => doc.id === expandedDocumentId)) {
      setExpandedDocumentId(null);
    }
  }, [expandedDocumentId, pagedDocuments]);

  return (
    <TabsContent value="docs" className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Documento Maestro (Diccionario)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!masterDocument ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                Aún no existe el documento maestro inicial (diccionario).
              </p>
              <p className="mt-1 text-xs text-amber-800">
                El primer documento que crees quedará marcado automáticamente como diccionario.
              </p>
              <div className="mt-3">
                <Button type="button" variant="outline" onClick={model.presetInitialControlDocument}>
                  Usar plantilla recomendada
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border p-3">
              <div className="font-medium">{masterDocument.code} v{masterDocument.version} - {masterDocument.title}</div>
              <div className="text-xs text-slate-600 mt-1">
                Estado: {qualityDocumentStatusLabels[masterDocument.status]} | Última aprobación: {masterDocument.approvedAt ? new Date(masterDocument.approvedAt).toLocaleString() : 'N/A'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openDocumentInIndex(masterDocument.id, masterDocument.code)}>
                  Ir al registro
                </Button>
                {masterDocument.sourceFilePath ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => model.handleDownloadDocumentSource(masterDocument.id, masterDocument.sourceFileName)}
                  >
                    Descargar fuente
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => model.handlePrintDocument(masterDocument.id)}>
                  Imprimir/PDF
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registrar Documento Controlado</CardTitle></CardHeader>
        <CardContent>
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
              <div className="rounded-md border p-3">
                <div className="text-sm font-semibold text-slate-700">Índice rápido (Código, Nombre, Versión)</div>
                <div className="mt-2 max-w-md">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={indexCategoryFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setIndexCategoryFilter('all')}
                    >
                      Todas
                    </Button>
                    {categoryOrder.map((category) => (
                      <Button
                        key={`chip-${category}`}
                        type="button"
                        size="sm"
                        variant={indexCategoryFilter === category ? 'default' : 'outline'}
                        onClick={() => setIndexCategoryFilter(category)}
                      >
                        {category}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant={indexCategoryFilter === 'uncategorized' ? 'default' : 'outline'}
                      onClick={() => setIndexCategoryFilter('uncategorized')}
                    >
                      Sin categoría
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={showObsolete ? 'default' : 'outline'}
                      onClick={() => setShowObsolete((prev) => !prev)}
                    >
                      {showObsolete ? 'Ocultando obsoletos' : 'Mostrar obsoletos'}
                    </Button>
                  </div>
                  <Input
                    value={indexQuery}
                    onChange={(e) => setIndexQuery(e.target.value)}
                    placeholder="Buscar por código o título"
                  />
                </div>
                {filteredDocuments.length === 0 ? (
                  <div className="mt-3 text-sm text-slate-500">Sin resultados para la búsqueda.</div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="text-xs text-slate-600">
                      Mostrando {pagedDocuments.length} de {filteredDocuments.length} documentos
                    </div>
                    <div className="max-h-80 overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100">
                          <tr className="text-left text-slate-700">
                            <th className="py-2 px-2">Código</th>
                            <th className="py-2 px-2">Nombre</th>
                            <th className="py-2 px-2">Categoría</th>
                            <th className="py-2 px-2">Estado</th>
                            <th className="py-2 px-2">Versión</th>
                            <th className="py-2 px-2">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedDocuments.map((doc) => (
                            <Fragment key={`index-fragment-${doc.id}`}>
                              <tr id={`doc-row-${doc.id}`} key={`index-${doc.id}`} className="border-t">
                                <td className="py-2 px-2">{doc.code}</td>
                                <td className="py-2 px-2">{doc.title}</td>
                                <td className="py-2 px-2">
                                  {doc.documentCategory ? qualityDocumentCategoryLabels[doc.documentCategory] : 'Sin categoría'}
                                </td>
                                <td className="py-2 px-2">{qualityDocumentStatusLabels[doc.status]}</td>
                                <td className="py-2 px-2">{doc.version}</td>
                                <td className="py-2 px-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setExpandedDocumentId((prev) => (prev === doc.id ? null : doc.id))}
                                  >
                                    {expandedDocumentId === doc.id ? 'Ocultar' : 'Detalles'}
                                  </Button>
                                </td>
                              </tr>
                              {expandedDocumentId === doc.id ? (
                                <tr className="bg-slate-50/80">
                                  <td colSpan={6} className="px-3 py-3">
                                    <div className="space-y-3">
                                      <div className="text-xs text-slate-600">
                                        Área: {doc.processAreaCode ? qualityProcessAreaCodeLabels[doc.processAreaCode] : 'N/A'} | Proceso: {qualityProcessLabels[doc.process]} | Estado: {qualityDocumentStatusLabels[doc.status]}
                                      </div>
                                      {doc.approvedAt ? (
                                        <div className="text-xs text-slate-600">
                                          Aprobado: {new Date(doc.approvedAt).toLocaleString()}
                                        </div>
                                      ) : null}
                                      <div className="text-xs">
                                        {doc.sourceFileName ? (
                                          <span className="text-slate-600">Fuente adjunta: {doc.sourceFileName}</span>
                                        ) : (
                                          <span className="text-amber-700">Sin archivo fuente adjunto</span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{qualityDocumentStatusLabels[doc.status]}</Badge>
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
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={indexPage <= 1}
                        onClick={() => setIndexPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <div className="text-xs text-slate-600">
                        Página {indexPage} de {totalIndexPages}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={indexPage >= totalIndexPages}
                        onClick={() => setIndexPage((p) => Math.min(totalIndexPages, p + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
