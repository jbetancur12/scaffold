export interface ShippingSplitResult {
    policyApplies: boolean;
    fullCoveredByUs: number;
    sharedSectionAmount: number;
    sharedCoveredByUs: number;
    extraCoveredByClient: number;
    wePay: number;
    clientPays: number;
}

export const calculateShippingSplit = (
    orderTotal: number,
    shippingAmount: number,
    orderCoverageThreshold: number,
    fullLimit: number,
    sharedLimit: number
): ShippingSplitResult => {
    const safeOrderTotal = Math.max(0, Number(orderTotal || 0));
    const safeAmount = Math.max(0, Number(shippingAmount || 0));
    const safeThreshold = Math.max(0, Number(orderCoverageThreshold || 0));
    const safeFullLimit = Math.max(0, Number(fullLimit || 0));
    const safeSharedLimit = Math.max(safeFullLimit, Number(sharedLimit || 0));
    const policyApplies = safeOrderTotal >= safeThreshold;

    if (!policyApplies) {
        return {
            policyApplies,
            fullCoveredByUs: 0,
            sharedSectionAmount: 0,
            sharedCoveredByUs: 0,
            extraCoveredByClient: safeAmount,
            wePay: 0,
            clientPays: safeAmount,
        };
    }

    const fullCoveredByUs = Math.min(safeAmount, safeFullLimit);
    const sharedSectionAmount = Math.max(0, Math.min(safeAmount, safeSharedLimit) - safeFullLimit);
    const sharedCoveredByUs = sharedSectionAmount / 2;
    const extraCoveredByClient = Math.max(0, safeAmount - safeSharedLimit);

    const wePay = fullCoveredByUs + sharedCoveredByUs;
    const clientPays = safeAmount - wePay;

    return {
        policyApplies,
        fullCoveredByUs,
        sharedSectionAmount,
        sharedCoveredByUs,
        extraCoveredByClient,
        wePay,
        clientPays,
    };
};
