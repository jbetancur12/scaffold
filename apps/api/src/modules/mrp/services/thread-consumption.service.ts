import { z } from 'zod';
import { CalculateThreadConsumptionSchema } from '@scaffold/schemas';

type CalculateThreadConsumptionInput = z.infer<typeof CalculateThreadConsumptionSchema>;
type OperationInput = CalculateThreadConsumptionInput['operations'][number];

type StitchProfile = {
    ratioCmPerCm: number;
    referenceStitchesPerCm: number;
    needles: number;
    needleThreadShare: number;
    looperThreadShare: number;
};

const STITCH_PROFILES: Record<string, StitchProfile> = {
    '101': { ratioCmPerCm: 4.0, referenceStitchesPerCm: 4, needles: 1, needleThreadShare: 1, looperThreadShare: 0 },
    '301': { ratioCmPerCm: 2.5, referenceStitchesPerCm: 4, needles: 1, needleThreadShare: 0.5, looperThreadShare: 0.5 },
    '401': { ratioCmPerCm: 5.5, referenceStitchesPerCm: 4, needles: 1, needleThreadShare: 0.33, looperThreadShare: 0.67 },
    '406': { ratioCmPerCm: 18, referenceStitchesPerCm: 4, needles: 2, needleThreadShare: 0.3, looperThreadShare: 0.7 },
    '503': { ratioCmPerCm: 12, referenceStitchesPerCm: 4, needles: 1, needleThreadShare: 0.45, looperThreadShare: 0.55 },
    '504': { ratioCmPerCm: 14, referenceStitchesPerCm: 4, needles: 1, needleThreadShare: 0.2, looperThreadShare: 0.8 },
    '512': { ratioCmPerCm: 18, referenceStitchesPerCm: 4, needles: 2, needleThreadShare: 0.25, looperThreadShare: 0.75 },
    '516': { ratioCmPerCm: 20, referenceStitchesPerCm: 4, needles: 2, needleThreadShare: 0.2, looperThreadShare: 0.8 },
    '602': { ratioCmPerCm: 25, referenceStitchesPerCm: 4, needles: 2, needleThreadShare: 0.2, looperThreadShare: 0.8 },
    '605': { ratioCmPerCm: 28, referenceStitchesPerCm: 4, needles: 3, needleThreadShare: 0.3, looperThreadShare: 0.7 },
};

export class ThreadConsumptionService {
    private round(value: number, decimals = 4): number {
        const factor = 10 ** decimals;
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    private getProfile(operation: OperationInput): StitchProfile {
        if (operation.stitchType === 'custom') {
            const ratio = operation.threadRatioCmPerCm ?? 2.5;
            const needles = operation.needles ?? 1;
            return {
                ratioCmPerCm: ratio,
                referenceStitchesPerCm: operation.stitchesPerCm ?? 4,
                needles,
                needleThreadShare: needles >= 2 ? 0.4 : 0.5,
                looperThreadShare: needles >= 2 ? 0.6 : 0.5,
            };
        }

        return STITCH_PROFILES[operation.stitchType];
    }

    calculate(input: CalculateThreadConsumptionInput) {
        let totalMeters = 0;
        let totalNeedleMeters = 0;
        let totalLooperMeters = 0;
        let maxMachineCount = 1;

        const operationBreakdown = input.operations.map((operation, index) => {
            const profile = this.getProfile(operation);
            const seamsPerUnit = operation.seamsPerUnit ?? 1;
            const machineCount = operation.machineCount ?? 1;
            maxMachineCount = Math.max(maxMachineCount, machineCount);

            const effectiveStitchesPerCm = operation.stitchesPerCm ?? profile.referenceStitchesPerCm;
            const stitchDensityFactor = effectiveStitchesPerCm / profile.referenceStitchesPerCm;
            const seamThicknessFactor = operation.seamThicknessFactor ?? 1;
            const reworkFactor = 1 + ((operation.reworkPercent ?? 0) / 100);
            const seamLengthWithAllowance = operation.seamLengthCm + (operation.startEndAllowanceCm ?? 0);
            const totalSeamCm = input.plannedUnits * seamsPerUnit * seamLengthWithAllowance * reworkFactor;

            const baseRatio = operation.threadRatioCmPerCm ?? profile.ratioCmPerCm;
            const effectiveRatio = baseRatio * stitchDensityFactor * seamThicknessFactor;

            const threadCm = totalSeamCm * effectiveRatio;
            const threadMeters = threadCm / 100;
            const needleMeters = threadMeters * profile.needleThreadShare;
            const looperMeters = threadMeters * profile.looperThreadShare;

            totalMeters += threadMeters;
            totalNeedleMeters += needleMeters;
            totalLooperMeters += looperMeters;

            return {
                operationIndex: index + 1,
                name: operation.name ?? `Operación ${index + 1}`,
                stitchType: operation.stitchType,
                needles: operation.needles ?? profile.needles,
                machineCount,
                seamLengthCmPerUnit: this.round(seamLengthWithAllowance, 2),
                totalSeamCm: this.round(totalSeamCm, 2),
                effectiveRatioCmPerCm: this.round(effectiveRatio, 4),
                threadMeters: this.round(threadMeters, 3),
                needleThreadMeters: this.round(needleMeters, 3),
                looperThreadMeters: this.round(looperMeters, 3),
            };
        });

        const preLossMeters = totalMeters;
        const wasteFactor = 1 + (input.wastePercent / 100);
        const setupFactor = 1 + (input.setupLossPercent / 100);
        const totalWithLossesMeters = preLossMeters * wasteFactor * setupFactor;
        const conesNeeded = totalWithLossesMeters / input.coneLengthMeters;

        return {
            input,
            assumptions: {
                note: 'Ratios base por tipo de puntada; se ajustan por densidad de puntada, espesor y retrabajo.',
                referenceStitchesPerCm: 4,
            },
            totals: {
                preLossMeters: this.round(preLossMeters, 3),
                wastePercent: input.wastePercent,
                setupLossPercent: input.setupLossPercent,
                totalMeters: this.round(totalWithLossesMeters, 3),
                needleThreadMeters: this.round(totalNeedleMeters * wasteFactor * setupFactor, 3),
                looperThreadMeters: this.round(totalLooperMeters * wasteFactor * setupFactor, 3),
                conesNeeded: this.round(conesNeeded, 4),
                conesNeededRoundedUp: Math.ceil(conesNeeded),
                suggestedMetersPerMachine: this.round(totalWithLossesMeters / maxMachineCount, 3),
                maxMachineCount,
            },
            operations: operationBreakdown,
        };
    }
}
