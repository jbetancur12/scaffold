/**
 * SKU Generator Utility
 * 
 * Implements the naming convention: [CAT]-[PROD]-[VAR]
 * Standardizes input to uppercase, removes special characters, and abbreviates.
 */

export const generateProductSku = (productName: string): string => {
    if (!productName) return '';

    // Remove accents and special chars
    const cleanName = productName
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special chars
        .toUpperCase();

    const words = cleanName.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) return '';

    // Logic: 
    // - 1 word: First 3 letters (e.g. FAJA -> FAJ)
    // - 2+ words: First 3 letters of first word + First 3 of second (FAJA ADELGAZANTE -> FAJ-ADE)

    if (words.length === 1) {
        return words[0].substring(0, 3);
    }

    const first = words[0].substring(0, 3);
    const second = words[1].substring(0, 3);

    return `${first}-${second}`;
};

export const generateVariantSku = (productSku: string, variantName: string): string => {
    if (!productSku) return '';
    if (!variantName) return productSku;

    // Clean variant name similar to product
    const cleanVariant = variantName
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .toUpperCase();

    const words = cleanVariant.split(/\s+/).filter(w => w.length > 0);

    // Generate suffix from variant name words
    // Example: "Azul XS" -> "AZU-XS"
    // Example: "Negro" -> "NEG"

    const suffix = words.map(w => {
        // Special case for sizes like XS, XL, S, M, L -> Keep them as is if short
        if (w.length <= 3) return w;
        return w.substring(0, 3);
    }).join('-');

    return `${productSku}-${suffix}`;
};

export const generateRawMaterialSku = (materialName: string): string => {
    if (!materialName) return '';
    const baseSku = generateProductSku(materialName);
    return `MAT-${baseSku}`;
};
