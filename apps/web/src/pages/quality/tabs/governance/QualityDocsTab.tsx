import {
  DocumentCategory,
  DocumentProcessAreaCode,
  DocumentStatus,
} from '@scaffold/types';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
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
import {
  FolderOpen,
  FileText,
  Plus,
  X,
  Save,
  AlertTriangle,
  Download,
  Upload,
  Printer,
  ChevronDown,
  ChevronUp,
  BookMarked,
} from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const docStatusStyle: Record<string, string> = {
  [DocumentStatus.BORRADOR]: 'bg-slate-50 text-slate-600 border-slate-200',
  [DocumentStatus.EN_REVISION]: 'bg-amber-50 text-amber-700 border-amber-200',
  [DocumentStatus.APROBADO]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [DocumentStatus.OBSOLETO]: 'bg-red-50 text-red-500 border-red-200',
};

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
  const [showNewDocForm, setShowNewDocForm] = useState(false);
  const INDEX_PAGE_SIZE = 8;
  const normalizedQuery = indexQuery.trim().toLowerCase();

  const filteredDocuments = useMemo(() => {
    const rows = [...model.documents].sort((a, b) => a.code.localeCompare(b.code));
    const byStatus = showObsolete ? rows : rows.filter((doc) => doc.status !== DocumentStatus.OBSOLETO);
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

  useEffect(() => { setIndexPage(1); }, [indexQuery, indexCategoryFilter]);
  useEffect(() => {
    if (indexPage > totalIndexPages) setIndexPage(totalIndexPages);
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
    setShowNewDocForm(false);
    window.setTimeout(() => jumpToDocument(id), 120);
  };
  useEffect(() => {
    if (expandedDocumentId && !pagedDocuments.some((doc) => doc.id === expandedDocumentId)) {
      setExpandedDocumentId(null);
    }
  }, [expandedDocumentId, pagedDocuments]);

  const handleSubmitNewDoc = async (e: React.FormEvent) => {
    await model.handleCreateDocument(e);
    setShowNewDocForm(false);
  };

  const vigente = model.documents.filter((d) => d.status === DocumentStatus.APROBADO).length;
  const revision = model.documents.filter((d) => d.status === DocumentStatus.EN_REVISION).length;

  const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
  const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

  return (
    <TabsContent value="docs" className="space-y-5">

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
              <FolderOpen className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Documentos Controlados</h2>
              <p className="text-slate-500 text-sm mt-0.5">Gestión y control de versiones del sistema documental QA.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
          {[
            { label: 'Total', value: model.documents.filter((d) => d.status !== DocumentStatus.OBSOLETO).length, color: 'text-slate-700', bg: '' },
            { label: 'Vigentes', value: vigente, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
            { label: 'En revisión', value: revision, color: 'text-amber-700', bg: 'bg-amber-50/60' },
            { label: 'Borradores', value: model.documents.filter((d) => d.status === DocumentStatus.BORRADOR).length, color: 'text-slate-500', bg: '' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
              <span className={`text-2xl font-bold ${color}`}>{value}</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Master Document Banner */}
      {!masterDocument ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">Aún no existe el documento maestro (diccionario)</p>
            <p className="text-xs text-amber-700 mt-0.5">El primer documento que crees quedará marcado automáticamente como diccionario.</p>
            <Button type="button" variant="outline" size="sm" onClick={model.presetInitialControlDocument}
              className="mt-3 rounded-xl border-amber-300 text-amber-800 hover:bg-amber-100">
              Usar plantilla recomendada
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-violet-50 rounded-xl shrink-0">
            <BookMarked className="h-4 w-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 font-mono text-sm">{masterDocument.code}</span>
              <span className="text-xs text-slate-400">v{masterDocument.version}</span>
              <span className="font-semibold text-slate-700 text-sm truncate">— {masterDocument.title}</span>
              <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset shrink-0 ${docStatusStyle[masterDocument.status] || ''}`}>
                {qualityDocumentStatusLabels[masterDocument.status]}
              </Badge>
              <span className="text-[11px] text-slate-400 font-medium">Documento Maestro</span>
            </div>
            {masterDocument.approvedAt && (
              <p className="text-xs text-slate-500 mt-1">Última aprobación: {new Date(masterDocument.approvedAt).toLocaleString('es-CO')}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => openDocumentInIndex(masterDocument.id, masterDocument.code)}
                className="rounded-xl text-xs h-8">Ir al registro</Button>
              {masterDocument.sourceFilePath && (
                <Button size="sm" variant="outline"
                  onClick={() => model.handleDownloadDocumentSource(masterDocument.id, masterDocument.sourceFileName)}
                  className="rounded-xl text-xs h-8"><Download className="mr-1 h-3 w-3" />Descargar fuente</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => model.handlePrintDocument(masterDocument.id)}
                className="rounded-xl text-xs h-8"><Printer className="mr-1 h-3 w-3" />PDF</Button>
            </div>
          </div>
        </div>
      )}

      {/* Documents list + inline form */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Documentos</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.documents.length}</span>
          <div className="ml-auto">
            <Button type="button" size="sm" onClick={() => setShowNewDocForm((v) => !v)}
              className={showNewDocForm
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
              {showNewDocForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo documento</>}
            </Button>
          </div>
        </div>

        {/* Inline new doc form */}
        {showNewDocForm && (
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
            <p className="text-sm font-bold text-slate-700 mb-4">Nuevo documento controlado</p>
            <form className="space-y-4" onSubmit={handleSubmitNewDoc}>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Categoría documental</Label>
                  <select className={selectClass} value={model.documentForm.documentCategory}
                    onChange={(e) => model.setDocumentForm((p) => ({ ...p, documentCategory: e.target.value as DocumentCategory }))}>
                    <option value={DocumentCategory.MAN}>MAN — Manual de calidad</option>
                    <option value={DocumentCategory.PRO}>PRO — Procedimientos</option>
                    <option value={DocumentCategory.INS}>INS — Instructivos</option>
                    <option value={DocumentCategory.FOR}>FOR — Formatos</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Área / macroproceso</Label>
                  <select className={selectClass} value={model.documentForm.processAreaCode}
                    onChange={(e) => model.setDocumentForm((p) => ({ ...p, processAreaCode: e.target.value as DocumentProcessAreaCode }))}>
                    <option value={DocumentProcessAreaCode.GAF}>GAF — Gestión administrativa y financiera</option>
                    <option value={DocumentProcessAreaCode.GC}>GC — Gestión de calidad</option>
                    <option value={DocumentProcessAreaCode.GP}>GP — Gestión de la producción</option>
                    <option value={DocumentProcessAreaCode.GTH}>GTH — Gestión de talento humano</option>
                    <option value={DocumentProcessAreaCode.GS}>GS — Gestión de saneamiento</option>
                    <option value={DocumentProcessAreaCode.GM}>GM — Gestión metrológica</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Código</Label>
                  <div className="flex gap-2">
                    <Input value={codePrefix} readOnly className="max-w-[180px] bg-slate-50 rounded-xl border-slate-200 font-mono text-sm h-10" />
                    <Input value={model.documentForm.codeNumber}
                      onChange={(e) => model.setDocumentForm((p) => ({ ...p, codeNumber: e.target.value.toUpperCase() }))}
                      placeholder="05" required className={`${inputClass} font-mono`} />
                  </div>
                  <p className="text-xs text-slate-400">Código final: <strong className="text-slate-700 font-mono">{codePrefix}{model.documentForm.codeNumber || 'XX'}</strong></p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Versión</Label>
                  <Input type="number" min={1} value={model.documentForm.version}
                    onChange={(e) => model.setDocumentForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))}
                    className={inputClass} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Título</Label>
                  <Input value={model.documentForm.title}
                    onChange={(e) => model.setDocumentForm((p) => ({ ...p, title: e.target.value }))}
                    required className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Vigencia desde</Label>
                  <Input type="date" value={model.documentForm.effectiveDate}
                    onChange={(e) => model.setDocumentForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                    className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Vigencia hasta</Label>
                  <Input type="date" value={model.documentForm.expiresAt}
                    onChange={(e) => model.setDocumentForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    className={inputClass} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Contenido / alcance</Label>
                  <Textarea value={model.documentForm.content}
                    onChange={(e) => model.setDocumentForm((p) => ({ ...p, content: e.target.value }))}
                    className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[80px] resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewDocForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                <Button type="submit" disabled={model.creatingDocument}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                  {model.creatingDocument ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Crear documento</>}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Filters + table */}
        <div className="p-4 space-y-3">
          {model.loadingDocuments ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
              <span className="text-sm animate-pulse">Cargando documentos...</span>
            </div>
          ) : (
            <>
              {/* Filter bar */}
              <div className="flex flex-wrap gap-2 items-center">
                <Input value={indexQuery} onChange={(e) => setIndexQuery(e.target.value)}
                  placeholder="Buscar por código o título..."
                  className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 max-w-xs text-sm" />
                <div className="flex flex-wrap gap-1.5">
                  {(['all', ...categoryOrder, 'uncategorized'] as const).map((cat) => (
                    <button key={cat} type="button"
                      onClick={() => setIndexCategoryFilter(cat)}
                      className={`h-7 px-3 rounded-lg text-xs font-semibold border transition-all ${indexCategoryFilter === cat ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                      {cat === 'all' ? 'Todas' : cat === 'uncategorized' ? 'Sin cat.' : cat}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setShowObsolete((prev) => !prev)}
                    className={`h-7 px-3 rounded-lg text-xs font-semibold border transition-all ${showObsolete ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    {showObsolete ? 'Ocultar obsoletos' : 'Ver obsoletos'}
                  </button>
                </div>
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Sin documentos para los filtros actuales.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500">Mostrando {pagedDocuments.length} de {filteredDocuments.length}</p>
                  {/* Table */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-left text-slate-600 text-xs font-semibold uppercase tracking-wide">
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Título</th>
                          <th className="px-4 py-3">Cat.</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">v</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedDocuments.map((doc) => (
                          <Fragment key={`index-fragment-${doc.id}`}>
                            <tr id={`doc-row-${doc.id}`}
                              className={`border-t border-slate-100 hover:bg-slate-50/60 transition-colors ${doc.status === DocumentStatus.OBSOLETO ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{doc.code}</td>
                              <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">{doc.title}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{doc.documentCategory ? qualityDocumentCategoryLabels[doc.documentCategory] : '—'}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${docStatusStyle[doc.status] || ''}`}>
                                  {qualityDocumentStatusLabels[doc.status]}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{doc.version}</td>
                              <td className="px-4 py-3">
                                <button type="button"
                                  onClick={() => setExpandedDocumentId((prev) => (prev === doc.id ? null : doc.id))}
                                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-semibold">
                                  {expandedDocumentId === doc.id
                                    ? <><ChevronUp className="h-3.5 w-3.5" />Ocultar</>
                                    : <><ChevronDown className="h-3.5 w-3.5" />Detalles</>}
                                </button>
                              </td>
                            </tr>
                            {expandedDocumentId === doc.id && (
                              <tr className="bg-slate-50/80 border-t border-violet-100">
                                <td colSpan={6} className="px-4 py-4">
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                      <span>Área: <span className="font-semibold text-slate-700">{doc.processAreaCode ? qualityProcessAreaCodeLabels[doc.processAreaCode] : 'N/A'}</span></span>
                                      <span>Proceso: <span className="font-semibold text-slate-700">{qualityProcessLabels[doc.process]}</span></span>
                                      {doc.approvedAt && <span>Aprobado: <span className="font-semibold text-slate-700">{new Date(doc.approvedAt).toLocaleString('es-CO')}</span></span>}
                                    </div>
                                    <div className="text-xs">
                                      {doc.sourceFileName
                                        ? <span className="text-slate-600">Fuente: <span className="font-mono font-semibold text-slate-800">{doc.sourceFileName}</span></span>
                                        : <span className="text-amber-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Sin archivo fuente adjunto</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Input id={`upload-doc-${doc.id}`} type="file" className="hidden"
                                        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          void model.handleUploadDocumentSource(doc.id, file);
                                          e.currentTarget.value = '';
                                        }} />
                                      <Button size="sm" variant="outline" type="button"
                                        disabled={model.uploadingDocumentSource}
                                        onClick={() => (document.getElementById(`upload-doc-${doc.id}`) as HTMLInputElement | null)?.click()}
                                        className="rounded-xl h-8 text-xs">
                                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                                        {model.uploadingDocumentSource ? 'Adjuntando...' : 'Adjuntar'}
                                      </Button>
                                      {doc.sourceFilePath && (
                                        <Button size="sm" variant="outline"
                                          onClick={() => model.handleDownloadDocumentSource(doc.id, doc.sourceFileName)}
                                          className="rounded-xl h-8 text-xs">
                                          <Download className="mr-1.5 h-3.5 w-3.5" />Descargar
                                        </Button>
                                      )}
                                      <Button size="sm" variant="outline"
                                        onClick={() => model.handlePrintDocument(doc.id)}
                                        className="rounded-xl h-8 text-xs">
                                        <Printer className="mr-1.5 h-3.5 w-3.5" />PDF
                                      </Button>
                                      {doc.status === DocumentStatus.BORRADOR && (
                                        <Button size="sm" variant="outline"
                                          disabled={model.submittingDocument}
                                          onClick={() => model.handleSubmitDocument(doc.id)}
                                          className="rounded-xl h-8 text-xs text-amber-700 border-amber-200 hover:bg-amber-50">
                                          Enviar revisión
                                        </Button>
                                      )}
                                      {doc.status === DocumentStatus.EN_REVISION && (
                                        <Button size="sm"
                                          disabled={model.approvingDocument}
                                          onClick={() => model.handleApproveDocument(doc.id)}
                                          className="rounded-xl h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                          Aprobar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={indexPage <= 1}
                      onClick={() => setIndexPage((p) => Math.max(1, p - 1))}
                      className="rounded-xl border-slate-200 h-8 text-xs">← Anterior</Button>
                    <span className="text-xs text-slate-600">Pág. {indexPage} / {totalIndexPages}</span>
                    <Button type="button" size="sm" variant="outline" disabled={indexPage >= totalIndexPages}
                      onClick={() => setIndexPage((p) => Math.min(totalIndexPages, p + 1))}
                      className="rounded-xl border-slate-200 h-8 text-xs">Siguiente →</Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
