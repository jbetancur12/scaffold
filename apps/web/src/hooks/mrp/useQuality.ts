import { useCallback } from 'react';
import { AuditEvent, CapaAction, CapaStatus, ControlledDocument, DocumentProcess, DocumentStatus, NonConformity, NonConformityStatus, QualitySeverity } from '@scaffold/types';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueries, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useNonConformitiesQuery = (filters?: { status?: NonConformityStatus; severity?: QualitySeverity; source?: string }) => {
    const fetcher = useCallback(async (): Promise<NonConformity[]> => {
        return mrpApi.listNonConformities(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityNonConformities);
};

export const useCreateNonConformityMutation = () => {
    return useMrpMutation<
        { title: string; description: string; severity?: QualitySeverity; source?: string; productionOrderId?: string; productionBatchId?: string; productionBatchUnitId?: string; createdBy?: string },
        NonConformity
    >(
        async (payload) => mrpApi.createNonConformity(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityNonConformities);
            },
        }
    );
};

export const useUpdateNonConformityMutation = () => {
    return useMrpMutation<{ id: string; status?: NonConformityStatus; rootCause?: string; correctiveAction?: string; actor?: string }, NonConformity>(
        async ({ id, ...payload }) => mrpApi.updateNonConformity(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityNonConformities);
                invalidateMrpQuery(mrpQueryKeys.qualityCapas);
            },
        }
    );
};

export const useCapasQuery = (filters?: { status?: CapaStatus; nonConformityId?: string }) => {
    const fetcher = useCallback(async (): Promise<CapaAction[]> => {
        return mrpApi.listCapaActions(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityCapas);
};

export const useCreateCapaMutation = () => {
    return useMrpMutation<{ nonConformityId: string; actionPlan: string; owner?: string; dueDate?: string; actor?: string }, CapaAction>(
        async (payload) => mrpApi.createCapaAction(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityCapas);
            },
        }
    );
};

export const useUpdateCapaMutation = () => {
    return useMrpMutation<{ id: string; status?: CapaStatus; verificationNotes?: string; owner?: string; dueDate?: string; actionPlan?: string; actor?: string }, CapaAction>(
        async ({ id, ...payload }) => mrpApi.updateCapaAction(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityCapas);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useQualityAuditQuery = (filters?: { entityType?: string; entityId?: string }) => {
    const fetcher = useCallback(async (): Promise<AuditEvent[]> => {
        return mrpApi.listQualityAuditEvents(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityAuditEvents);
};

export const useControlledDocumentsQuery = (filters?: { process?: DocumentProcess; status?: DocumentStatus }) => {
    const fetcher = useCallback(async (): Promise<ControlledDocument[]> => {
        return mrpApi.listControlledDocuments(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityDocuments);
};

export const useActiveControlledDocumentsByProcessQuery = (process: DocumentProcess) => {
    const fetcher = useCallback(async (): Promise<ControlledDocument[]> => {
        return mrpApi.listActiveControlledDocumentsByProcess(process);
    }, [process]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityActiveDocuments(process));
};

export const useCreateControlledDocumentMutation = () => {
    return useMrpMutation<{
        code: string;
        title: string;
        process: DocumentProcess;
        version?: number;
        content?: string;
        effectiveDate?: string;
        expiresAt?: string;
        actor?: string;
    }, ControlledDocument>(
        async (payload) => mrpApi.createControlledDocument(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityDocuments);
            },
        }
    );
};

export const useSubmitControlledDocumentMutation = () => {
    return useMrpMutation<{ id: string; actor?: string }, ControlledDocument>(
        async ({ id, actor }) => mrpApi.submitControlledDocument(id, actor),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityDocuments);
            },
        }
    );
};

export const useApproveControlledDocumentMutation = () => {
    return useMrpMutation<{ id: string; actor?: string }, ControlledDocument>(
        async ({ id, actor }) => mrpApi.approveControlledDocument(id, actor),
        {
            onSuccess: async (_result, _input) => {
                invalidateMrpQuery(mrpQueryKeys.qualityDocuments);
                invalidateMrpQueries([
                    mrpQueryKeys.qualityActiveDocuments(DocumentProcess.PRODUCCION),
                    mrpQueryKeys.qualityActiveDocuments(DocumentProcess.CONTROL_CALIDAD),
                    mrpQueryKeys.qualityActiveDocuments(DocumentProcess.EMPAQUE),
                ]);
            },
        }
    );
};
