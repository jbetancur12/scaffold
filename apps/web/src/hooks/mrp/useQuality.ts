import { useCallback } from 'react';
import {
    AuditEvent,
    CapaAction,
    CapaStatus,
    ControlledDocument,
    DocumentApprovalMethod,
    DocumentProcess,
    DocumentStatus,
    NonConformity,
    NonConformityStatus,
    QualitySeverity,
    TechnovigilanceCase,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
    TechnovigilanceReportChannel,
    RecallCase,
    RecallNotification,
    RecallNotificationChannel,
    RecallNotificationStatus,
    RecallScopeType,
    RecallStatus,
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabel,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
    DispatchValidationResult,
    ComplianceKpiDashboard,
    ComplianceExportFile,
    QualityRiskControl,
    QualityRiskControlStatus,
    QualityTrainingEvidence,
} from '@scaffold/types';
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

export const useTechnovigilanceCasesQuery = (filters?: {
    status?: TechnovigilanceStatus;
    type?: TechnovigilanceCaseType;
    severity?: TechnovigilanceSeverity;
    causality?: TechnovigilanceCausality;
    reportedToInvima?: boolean;
}) => {
    const fetcher = useCallback(async (): Promise<TechnovigilanceCase[]> => {
        return mrpApi.listTechnovigilanceCases(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityTechnovigilanceCases);
};

export const useCreateTechnovigilanceCaseMutation = () => {
    return useMrpMutation<{
        title: string;
        description: string;
        type?: TechnovigilanceCaseType;
        severity?: TechnovigilanceSeverity;
        causality?: TechnovigilanceCausality;
        productionOrderId?: string;
        productionBatchId?: string;
        productionBatchUnitId?: string;
        lotCode?: string;
        serialCode?: string;
        createdBy?: string;
    }, TechnovigilanceCase>(
        async (payload) => mrpApi.createTechnovigilanceCase(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityTechnovigilanceCases);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useUpdateTechnovigilanceCaseMutation = () => {
    return useMrpMutation<{
        id: string;
        status?: TechnovigilanceStatus;
        severity?: TechnovigilanceSeverity;
        causality?: TechnovigilanceCausality;
        investigationSummary?: string;
        resolution?: string;
        actor?: string;
    }, TechnovigilanceCase>(
        async ({ id, ...payload }) => mrpApi.updateTechnovigilanceCase(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityTechnovigilanceCases);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useReportTechnovigilanceCaseMutation = () => {
    return useMrpMutation<{
        id: string;
        reportNumber: string;
        reportChannel: TechnovigilanceReportChannel;
        reportPayloadRef?: string;
        reportedAt?: string;
        ackAt?: string;
        actor?: string;
    }, TechnovigilanceCase>(
        async ({ id, ...payload }) => mrpApi.reportTechnovigilanceCase(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityTechnovigilanceCases);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useRecallCasesQuery = (filters?: { status?: RecallStatus; isMock?: boolean }) => {
    const fetcher = useCallback(async (): Promise<RecallCase[]> => {
        return mrpApi.listRecallCases(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityRecalls);
};

export const useCreateRecallCaseMutation = () => {
    return useMrpMutation<{
        title: string;
        reason: string;
        scopeType: RecallScopeType;
        lotCode?: string;
        serialCode?: string;
        affectedQuantity: number;
        isMock?: boolean;
        targetResponseMinutes?: number;
        actor?: string;
    }, RecallCase>(
        async (payload) => mrpApi.createRecallCase(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityRecalls);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useUpdateRecallProgressMutation = () => {
    return useMrpMutation<{ id: string; retrievedQuantity: number; actor?: string }, RecallCase>(
        async ({ id, ...payload }) => mrpApi.updateRecallProgress(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityRecalls);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useCreateRecallNotificationMutation = () => {
    return useMrpMutation<{
        id: string;
        recipientName: string;
        recipientContact: string;
        channel: RecallNotificationChannel;
        evidenceNotes?: string;
        actor?: string;
    }, RecallNotification>(
        async ({ id, ...payload }) => mrpApi.createRecallNotification(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityRecalls);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useUpdateRecallNotificationMutation = () => {
    return useMrpMutation<{
        notificationId: string;
        status: RecallNotificationStatus;
        sentAt?: string;
        acknowledgedAt?: string;
        evidenceNotes?: string;
        actor?: string;
    }, RecallNotification>(
        async ({ notificationId, ...payload }) => mrpApi.updateRecallNotification(notificationId, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityRecalls);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useCloseRecallCaseMutation = () => {
    return useMrpMutation<{
        id: string;
        closureEvidence: string;
        endedAt?: string;
        actualResponseMinutes?: number;
        actor?: string;
    }, RecallCase>(
        async ({ id, ...payload }) => mrpApi.closeRecallCase(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityRecalls);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useRegulatoryLabelsQuery = (filters?: {
    productionBatchId?: string;
    scopeType?: RegulatoryLabelScopeType;
    status?: RegulatoryLabelStatus;
}) => {
    const fetcher = useCallback(async (): Promise<RegulatoryLabel[]> => {
        return mrpApi.listRegulatoryLabels(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityRegulatoryLabels);
};

export const useUpsertRegulatoryLabelMutation = () => {
    return useMrpMutation<{
        productionBatchId: string;
        productionBatchUnitId?: string;
        scopeType: RegulatoryLabelScopeType;
        deviceType: RegulatoryDeviceType;
        codingStandard: RegulatoryCodingStandard;
        productName: string;
        manufacturerName: string;
        invimaRegistration: string;
        lotCode: string;
        serialCode?: string;
        manufactureDate: string;
        expirationDate?: string;
        gtin?: string;
        udiDi?: string;
        udiPi?: string;
        internalCode?: string;
        actor?: string;
    }, RegulatoryLabel>(
        async (payload) => mrpApi.upsertRegulatoryLabel(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityRegulatoryLabels);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useValidateDispatchReadinessMutation = () => {
    return useMrpMutation<{ productionBatchId: string; actor?: string }, DispatchValidationResult>(
        async (payload) => mrpApi.validateDispatchReadiness(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useComplianceDashboardQuery = () => {
    const fetcher = useCallback(async (): Promise<ComplianceKpiDashboard> => {
        return mrpApi.getComplianceDashboard();
    }, []);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityComplianceDashboard);
};

export const useExportComplianceMutation = () => {
    return useMrpMutation<{ format?: 'csv' | 'json' }, ComplianceExportFile>(
        async (payload) => mrpApi.exportCompliance(payload.format || 'csv')
    );
};

export const useRiskControlsQuery = (filters?: { process?: DocumentProcess; status?: QualityRiskControlStatus }) => {
    const fetcher = useCallback(async (): Promise<QualityRiskControl[]> => {
        return mrpApi.listQualityRiskControls(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityRiskControls);
};

export const useCreateRiskControlMutation = () => {
    return useMrpMutation<{
        process: DocumentProcess;
        risk: string;
        control: string;
        ownerRole: string;
        status?: QualityRiskControlStatus;
        evidenceRef?: string;
        actor?: string;
    }, QualityRiskControl>(
        async (payload) => mrpApi.createQualityRiskControl(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityRiskControls);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useTrainingEvidenceQuery = (filters?: { role?: string }) => {
    const fetcher = useCallback(async (): Promise<QualityTrainingEvidence[]> => {
        return mrpApi.listQualityTrainingEvidence(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityTrainingEvidence);
};

export const useCreateTrainingEvidenceMutation = () => {
    return useMrpMutation<{
        role: string;
        personName: string;
        trainingTopic: string;
        completedAt: string;
        validUntil?: string;
        trainerName?: string;
        evidenceRef?: string;
        actor?: string;
    }, QualityTrainingEvidence>(
        async (payload) => mrpApi.createQualityTrainingEvidence(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityTrainingEvidence);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
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
    return useMrpMutation<{ id: string; actor: string; approvalMethod: DocumentApprovalMethod; approvalSignature: string }, ControlledDocument>(
        async ({ id, ...payload }) => mrpApi.approveControlledDocument(id, payload),
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
