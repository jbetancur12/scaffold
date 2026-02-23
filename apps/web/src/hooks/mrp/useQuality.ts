import { useCallback } from 'react';
import {
    AuditEvent,
    CapaAction,
    CapaStatus,
    ProcessDeviation,
    ProcessDeviationStatus,
    OosCase,
    OosCaseStatus,
    OosDisposition,
    ChangeControl,
    ChangeControlType,
    ChangeControlStatus,
    ChangeImpactLevel,
    ChangeApprovalDecision,
    Equipment,
    EquipmentStatus,
    EquipmentCalibration,
    EquipmentCalibrationResult,
    EquipmentMaintenance,
    EquipmentMaintenanceType,
    EquipmentMaintenanceResult,
    BatchEquipmentUsage,
    EquipmentAlert,
    EquipmentHistory,
    OperationalAlertRole,
    OperationalAlert,
    WeeklyComplianceReportFile,
    ControlledDocument,
    DocumentApprovalMethod,
    DocumentCategory,
    DocumentProcess,
    DocumentProcessAreaCode,
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
    Customer,
    Shipment,
    RecallAffectedCustomer,
    DmrTemplate,
    BatchDhrExpedient,
    BatchDhrExportFile,
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
    IncomingInspection,
    IncomingInspectionResult,
    IncomingInspectionStatus,
    BatchRelease,
    BatchReleaseStatus,
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

export const useProcessDeviationsQuery = (filters?: { status?: ProcessDeviationStatus; productionBatchId?: string; productionOrderId?: string }) => {
    const fetcher = useCallback(async (): Promise<ProcessDeviation[]> => {
        return mrpApi.listProcessDeviations(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityProcessDeviations);
};

export const useCreateProcessDeviationMutation = () => {
    return useMrpMutation<{
        title: string;
        description: string;
        classification?: string;
        productionOrderId?: string;
        productionBatchId?: string;
        productionBatchUnitId?: string;
        containmentAction?: string;
        investigationSummary?: string;
        closureEvidence?: string;
        capaActionId?: string;
        actor?: string;
    }, ProcessDeviation>(
        async (payload) => mrpApi.createProcessDeviation(payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityProcessDeviations,
                    mrpQueryKeys.qualityAuditEvents,
                    mrpQueryKeys.qualityBatchReleases,
                ]);
            },
        }
    );
};

export const useUpdateProcessDeviationMutation = () => {
    return useMrpMutation<{
        id: string;
        title?: string;
        description?: string;
        classification?: string;
        status?: ProcessDeviationStatus;
        containmentAction?: string;
        investigationSummary?: string;
        closureEvidence?: string;
        capaActionId?: string;
        actor?: string;
    }, ProcessDeviation>(
        async ({ id, ...payload }) => mrpApi.updateProcessDeviation(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityProcessDeviations,
                    mrpQueryKeys.qualityAuditEvents,
                    mrpQueryKeys.qualityBatchReleases,
                ]);
            },
        }
    );
};

export const useOosCasesQuery = (filters?: { status?: OosCaseStatus; productionBatchId?: string; productionOrderId?: string }) => {
    const fetcher = useCallback(async (): Promise<OosCase[]> => {
        return mrpApi.listOosCases(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityOosCases);
};

export const useCreateOosCaseMutation = () => {
    return useMrpMutation<{
        testName: string;
        resultValue: string;
        specification: string;
        productionOrderId?: string;
        productionBatchId?: string;
        productionBatchUnitId?: string;
        investigationSummary?: string;
        disposition?: OosDisposition;
        decisionNotes?: string;
        capaActionId?: string;
        actor?: string;
    }, OosCase>(
        async (payload) => mrpApi.createOosCase(payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityOosCases,
                    mrpQueryKeys.qualityAuditEvents,
                    mrpQueryKeys.qualityBatchReleases,
                ]);
            },
        }
    );
};

export const useUpdateOosCaseMutation = () => {
    return useMrpMutation<{
        id: string;
        testName?: string;
        resultValue?: string;
        specification?: string;
        status?: OosCaseStatus;
        investigationSummary?: string;
        disposition?: OosDisposition;
        decisionNotes?: string;
        capaActionId?: string;
        actor?: string;
    }, OosCase>(
        async ({ id, ...payload }) => mrpApi.updateOosCase(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityOosCases,
                    mrpQueryKeys.qualityAuditEvents,
                    mrpQueryKeys.qualityBatchReleases,
                ]);
            },
        }
    );
};

export const useChangeControlsQuery = (filters?: {
    status?: ChangeControlStatus;
    type?: ChangeControlType;
    impactLevel?: ChangeImpactLevel;
    affectedProductionBatchId?: string;
    affectedProductionOrderId?: string;
}) => {
    const fetcher = useCallback(async (): Promise<ChangeControl[]> => {
        return mrpApi.listChangeControls(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityChangeControls);
};

export const useCreateChangeControlMutation = () => {
    return useMrpMutation<{
        title: string;
        description: string;
        type: ChangeControlType;
        impactLevel?: ChangeImpactLevel;
        evaluationSummary?: string;
        requestedBy?: string;
        effectiveDate?: string;
        linkedDocumentId?: string;
        affectedProductionOrderId?: string;
        affectedProductionBatchId?: string;
        beforeChangeBatchCode?: string;
        afterChangeBatchCode?: string;
        actor?: string;
    }, ChangeControl>(
        async (payload) => mrpApi.createChangeControl(payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityChangeControls,
                    mrpQueryKeys.qualityAuditEvents,
                    mrpQueryKeys.qualityComplianceDashboard,
                ]);
            },
        }
    );
};

export const useUpdateChangeControlMutation = () => {
    return useMrpMutation<{
        id: string;
        title?: string;
        description?: string;
        type?: ChangeControlType;
        impactLevel?: ChangeImpactLevel;
        status?: ChangeControlStatus;
        evaluationSummary?: string;
        requestedBy?: string;
        effectiveDate?: string;
        linkedDocumentId?: string;
        affectedProductionOrderId?: string;
        affectedProductionBatchId?: string;
        beforeChangeBatchCode?: string;
        afterChangeBatchCode?: string;
        actor?: string;
    }, ChangeControl>(
        async ({ id, ...payload }) => mrpApi.updateChangeControl(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityChangeControls,
                    mrpQueryKeys.qualityAuditEvents,
                    mrpQueryKeys.qualityComplianceDashboard,
                ]);
            },
        }
    );
};

export const useCreateChangeControlApprovalMutation = () => {
    return useMrpMutation<{
        changeControlId: string;
        role: string;
        approver?: string;
        decision: ChangeApprovalDecision;
        decisionNotes?: string;
        actor?: string;
    }, ChangeControl>(
        async (payload) => mrpApi.createChangeControlApproval(payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityChangeControls,
                    mrpQueryKeys.qualityAuditEvents,
                    mrpQueryKeys.qualityComplianceDashboard,
                ]);
            },
        }
    );
};

export const useEquipmentQuery = (filters?: { status?: EquipmentStatus; isCritical?: boolean }) => {
    const fetcher = useCallback(async (): Promise<Equipment[]> => {
        return mrpApi.listEquipment(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityEquipment);
};

export const useCreateEquipmentMutation = () => {
    return useMrpMutation<{
        code: string;
        name: string;
        area?: string;
        isCritical?: boolean;
        status?: EquipmentStatus;
        calibrationFrequencyDays?: number;
        maintenanceFrequencyDays?: number;
        notes?: string;
        actor?: string;
    }, Equipment>(
        async (payload) => mrpApi.createEquipment(payload),
        {
            onSuccess: async () => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityEquipment,
                    mrpQueryKeys.qualityEquipmentAlerts,
                    mrpQueryKeys.qualityAuditEvents,
                ]);
            },
        }
    );
};

export const useUpdateEquipmentMutation = () => {
    return useMrpMutation<{
        id: string;
        code?: string;
        name?: string;
        area?: string;
        isCritical?: boolean;
        status?: EquipmentStatus;
        calibrationFrequencyDays?: number;
        maintenanceFrequencyDays?: number;
        notes?: string;
        actor?: string;
    }, Equipment>(
        async ({ id, ...payload }) => mrpApi.updateEquipment(id, payload),
        {
            onSuccess: async (_result, input) => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityEquipment,
                    mrpQueryKeys.qualityEquipmentAlerts,
                    mrpQueryKeys.qualityAuditEvents,
                ]);
                if (input.id) {
                    invalidateMrpQuery(mrpQueryKeys.qualityEquipmentHistory(input.id));
                }
            },
        }
    );
};

export const useCreateEquipmentCalibrationMutation = () => {
    return useMrpMutation<{
        equipmentId: string;
        executedAt?: string;
        dueAt?: string;
        result?: EquipmentCalibrationResult;
        certificateRef?: string;
        evidenceRef?: string;
        performedBy?: string;
        notes?: string;
        actor?: string;
    }, EquipmentCalibration>(
        async ({ equipmentId, ...payload }) => mrpApi.createEquipmentCalibration(equipmentId, payload),
        {
            onSuccess: async (_result, input) => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityEquipment,
                    mrpQueryKeys.qualityEquipmentAlerts,
                    mrpQueryKeys.qualityAuditEvents,
                ]);
                if (input.equipmentId) {
                    invalidateMrpQuery(mrpQueryKeys.qualityEquipmentHistory(input.equipmentId));
                }
            },
        }
    );
};

export const useCreateEquipmentMaintenanceMutation = () => {
    return useMrpMutation<{
        equipmentId: string;
        executedAt?: string;
        dueAt?: string;
        type?: EquipmentMaintenanceType;
        result?: EquipmentMaintenanceResult;
        evidenceRef?: string;
        performedBy?: string;
        notes?: string;
        actor?: string;
    }, EquipmentMaintenance>(
        async ({ equipmentId, ...payload }) => mrpApi.createEquipmentMaintenance(equipmentId, payload),
        {
            onSuccess: async (_result, input) => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityEquipment,
                    mrpQueryKeys.qualityEquipmentAlerts,
                    mrpQueryKeys.qualityAuditEvents,
                ]);
                if (input.equipmentId) {
                    invalidateMrpQuery(mrpQueryKeys.qualityEquipmentHistory(input.equipmentId));
                }
            },
        }
    );
};

export const useRegisterBatchEquipmentUsageMutation = () => {
    return useMrpMutation<{
        productionBatchId: string;
        equipmentId: string;
        usedAt?: string;
        usedBy?: string;
        notes?: string;
        actor?: string;
    }, BatchEquipmentUsage>(
        async (payload) => mrpApi.registerBatchEquipmentUsage(payload),
        {
            onSuccess: async (_result, input) => {
                invalidateMrpQueries([
                    mrpQueryKeys.qualityEquipmentUsage,
                    mrpQueryKeys.qualityAuditEvents,
                ]);
                if (input.equipmentId) {
                    invalidateMrpQuery(mrpQueryKeys.qualityEquipmentHistory(input.equipmentId));
                }
            },
        }
    );
};

export const useBatchEquipmentUsageQuery = (filters?: { productionBatchId?: string; equipmentId?: string }) => {
    const fetcher = useCallback(async (): Promise<BatchEquipmentUsage[]> => {
        return mrpApi.listBatchEquipmentUsage(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityEquipmentUsage);
};

export const useEquipmentHistoryQuery = (equipmentId?: string) => {
    const fetcher = useCallback(async (): Promise<EquipmentHistory | null> => {
        if (!equipmentId) return null;
        return mrpApi.getEquipmentHistory(equipmentId);
    }, [equipmentId]);

    return useMrpQuery(
        fetcher,
        Boolean(equipmentId),
        equipmentId ? mrpQueryKeys.qualityEquipmentHistory(equipmentId) : undefined
    );
};

export const useEquipmentAlertsQuery = (daysAhead = 30) => {
    const fetcher = useCallback(async (): Promise<EquipmentAlert[]> => {
        return mrpApi.listEquipmentAlerts(daysAhead);
    }, [daysAhead]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityEquipmentAlerts);
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

export const useCustomersQuery = (search?: string) => {
    const fetcher = useCallback(async (): Promise<Customer[]> => {
        return mrpApi.listCustomers(search);
    }, [search]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityCustomers);
};

export const useCreateCustomerMutation = () => {
    return useMrpMutation<{
        name: string;
        documentType?: string;
        documentNumber?: string;
        contactName?: string;
        email?: string;
        phone?: string;
        address?: string;
        notes?: string;
    }, Customer>(
        async (payload) => mrpApi.createCustomer(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityCustomers);
            },
        }
    );
};

export const useShipmentsQuery = (filters?: {
    customerId?: string;
    productionBatchId?: string;
    serialCode?: string;
    commercialDocument?: string;
}) => {
    const fetcher = useCallback(async (): Promise<Shipment[]> => {
        return mrpApi.listShipments(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityShipments);
};

export const useCreateShipmentMutation = () => {
    return useMrpMutation<{
        customerId: string;
        commercialDocument: string;
        shippedAt?: string;
        dispatchedBy?: string;
        notes?: string;
        items: Array<{
            productionBatchId: string;
            productionBatchUnitId?: string;
            quantity: number;
        }>;
    }, Shipment>(
        async (payload) => mrpApi.createShipment(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityShipments);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useDmrTemplatesQuery = (filters?: {
    productId?: string;
    process?: DocumentProcess;
    isActive?: boolean;
}) => {
    const fetcher = useCallback(async (): Promise<DmrTemplate[]> => {
        return mrpApi.listDmrTemplates(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityDmrTemplates);
};

export const useCreateDmrTemplateMutation = () => {
    return useMrpMutation<{
        productId?: string;
        process: DocumentProcess;
        code: string;
        title: string;
        version?: number;
        sections: string[];
        requiredEvidence?: string[];
        isActive?: boolean;
        createdBy?: string;
        approvedBy?: string;
        approvedAt?: string;
    }, DmrTemplate>(
        async (payload) => mrpApi.createDmrTemplate(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityDmrTemplates);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useBatchDhrQuery = (productionBatchId?: string, actor?: string) => {
    const fetcher = useCallback(async (): Promise<BatchDhrExpedient | null> => {
        if (!productionBatchId) return null;
        return mrpApi.getBatchDhr(productionBatchId, actor);
    }, [productionBatchId, actor]);

    return useMrpQuery(
        fetcher,
        Boolean(productionBatchId),
        productionBatchId ? mrpQueryKeys.qualityBatchDhr(productionBatchId) : undefined
    );
};

export const useExportBatchDhrMutation = () => {
    return useMrpMutation<{
        productionBatchId: string;
        format?: 'csv' | 'json';
        actor?: string;
    }, BatchDhrExportFile>(
        async ({ productionBatchId, format, actor }) => mrpApi.exportBatchDhr(productionBatchId, format || 'json', actor)
    );
};

export const useRecallAffectedCustomersQuery = (recallCaseId?: string) => {
    const fetcher = useCallback(async (): Promise<RecallAffectedCustomer[]> => {
        if (!recallCaseId) return [];
        return mrpApi.listRecallAffectedCustomers(recallCaseId);
    }, [recallCaseId]);

    return useMrpQuery(fetcher, Boolean(recallCaseId), recallCaseId ? `${mrpQueryKeys.qualityRecalls}.affected.${recallCaseId}` : undefined);
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
        productName?: string;
        manufacturerName?: string;
        invimaRegistration?: string;
        lotCode?: string;
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

export const useOperationalAlertsQuery = (filters?: { role?: OperationalAlertRole; daysAhead?: number }) => {
    const role = filters?.role;
    const daysAhead = filters?.daysAhead;
    const fetcher = useCallback(async (): Promise<OperationalAlert[]> => {
        return mrpApi.listOperationalAlerts({ role, daysAhead });
    }, [daysAhead, role]);

    const queryKey = `${mrpQueryKeys.qualityOperationalAlerts}:${role ?? 'all'}:${daysAhead ?? 'default'}`;
    return useMrpQuery(fetcher, true, queryKey);
};

export const useExportWeeklyComplianceReportMutation = () => {
    return useMrpMutation<{
        role?: OperationalAlertRole;
        daysAhead?: number;
        format?: 'csv' | 'json';
    }, WeeklyComplianceReportFile>(
        async (payload) => mrpApi.exportWeeklyComplianceReport(payload)
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

export const useIncomingInspectionsQuery = (filters?: {
    status?: IncomingInspectionStatus;
    rawMaterialId?: string;
    purchaseOrderId?: string;
}) => {
    const fetcher = useCallback(async (): Promise<IncomingInspection[]> => {
        return mrpApi.listIncomingInspections(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityIncomingInspections);
};

export const useResolveIncomingInspectionMutation = () => {
    return useMrpMutation<{
        id: string;
        inspectionResult: IncomingInspectionResult;
        supplierLotCode?: string;
        certificateRef?: string;
        notes?: string;
        quantityAccepted: number;
        quantityRejected: number;
        acceptedUnitCost?: number;
        actor?: string;
    }, IncomingInspection>(
        async ({ id, ...payload }) => mrpApi.resolveIncomingInspection(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityIncomingInspections);
                invalidateMrpQuery(mrpQueryKeys.rawMaterials);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useCorrectIncomingInspectionCostMutation = () => {
    return useMrpMutation<{
        id: string;
        acceptedUnitCost: number;
        reason: string;
        actor?: string;
    }, IncomingInspection>(
        async ({ id, ...payload }) => mrpApi.correctIncomingInspectionCost(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityIncomingInspections);
                invalidateMrpQuery(mrpQueryKeys.rawMaterials);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useBatchReleasesQuery = (filters?: { productionBatchId?: string; status?: BatchReleaseStatus }) => {
    const fetcher = useCallback(async (): Promise<BatchRelease[]> => {
        return mrpApi.listBatchReleases(filters);
    }, [filters]);

    return useMrpQuery(fetcher, true, mrpQueryKeys.qualityBatchReleases);
};

export const useUpsertBatchReleaseChecklistMutation = () => {
    return useMrpMutation<{
        productionBatchId: string;
        qcApproved: boolean;
        labelingValidated: boolean;
        documentsCurrent: boolean;
        evidencesComplete: boolean;
        checklistNotes?: string;
        rejectedReason?: string;
        actor?: string;
    }, BatchRelease>(
        async (payload) => mrpApi.upsertBatchReleaseChecklist(payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityBatchReleases);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useSignBatchReleaseMutation = () => {
    return useMrpMutation<{
        productionBatchId: string;
        actor: string;
        approvalMethod: DocumentApprovalMethod;
        approvalSignature: string;
    }, BatchRelease>(
        async ({ productionBatchId, ...payload }) => mrpApi.signBatchRelease(productionBatchId, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityBatchReleases);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};

export const useControlledDocumentsQuery = (filters?: {
    process?: DocumentProcess;
    documentCategory?: DocumentCategory;
    processAreaCode?: DocumentProcessAreaCode;
    status?: DocumentStatus;
}) => {
    const process = filters?.process;
    const documentCategory = filters?.documentCategory;
    const processAreaCode = filters?.processAreaCode;
    const status = filters?.status;
    const fetcher = useCallback(async (): Promise<ControlledDocument[]> => {
        return mrpApi.listControlledDocuments({ process, documentCategory, processAreaCode, status });
    }, [documentCategory, process, processAreaCode, status]);

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
        documentCategory: DocumentCategory;
        processAreaCode: DocumentProcessAreaCode;
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

export const useUploadControlledDocumentSourceMutation = () => {
    return useMrpMutation<{
        id: string;
        fileName: string;
        mimeType: string;
        base64Data: string;
        actor?: string;
    }, ControlledDocument>(
        async ({ id, ...payload }) => mrpApi.uploadControlledDocumentSource(id, payload),
        {
            onSuccess: async () => {
                invalidateMrpQuery(mrpQueryKeys.qualityDocuments);
                invalidateMrpQuery(mrpQueryKeys.qualityAuditEvents);
            },
        }
    );
};
