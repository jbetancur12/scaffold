import { useCallback } from 'react';
import { Product } from '@scaffold/types';
import { CreateProductVariantDto, UpdateProductVariantDto } from '@scaffold/schemas';
import { mrpApi } from '@/services/mrpApi';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQueriesByPrefix, invalidateMrpQuery, useMrpMutation, useMrpQuery } from '@/hooks/useMrpQuery';

export const useProductsQuery = (page = 1, limit = 10) => {
    const fetchProducts = useCallback(async (): Promise<{ products: Product[]; total: number }> => {
        return mrpApi.getProducts(page, limit);
    }, [page, limit]);

    return useMrpQuery(fetchProducts, true, mrpQueryKeys.productsList(page, limit));
};

export const useProductQuery = (id?: string) => {
    const fetchProduct = useCallback(async (): Promise<Product> => {
        if (!id) throw new Error('Product ID is required');
        return mrpApi.getProduct(id);
    }, [id]);

    return useMrpQuery(fetchProduct, Boolean(id), id ? mrpQueryKeys.product(id) : undefined);
};

export const useSaveProductMutation = () => {
    return useMrpMutation<{ id?: string; payload: Partial<Product> }, Product>(
        async ({ id, payload }) => {
            if (id) {
                return mrpApi.updateProduct(id, payload);
            }
            return mrpApi.createProduct(payload);
        },
        {
            onSuccess: async (product) => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.products);
                invalidateMrpQuery(mrpQueryKeys.product(product.id));
            },
        }
    );
};

export const useDeleteProductMutation = () => {
    return useMrpMutation<string, void>(
        async (id) => mrpApi.deleteProduct(id),
        {
            onSuccess: async () => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.products);
            },
        }
    );
};

export const useSaveVariantMutation = () => {
    return useMrpMutation<
        { productId: string; variantId?: string; payload: CreateProductVariantDto | UpdateProductVariantDto },
        unknown
    >(
        async ({ productId, variantId, payload }) => {
            if (variantId) {
                return mrpApi.updateVariant(variantId, payload as UpdateProductVariantDto);
            }
            return mrpApi.createVariant(productId, payload as CreateProductVariantDto);
        },
        {
            onSuccess: async () => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.products);
            },
        }
    );
};

export const useDeleteVariantMutation = () => {
    return useMrpMutation<string, void>(
        async (variantId) => mrpApi.deleteVariant(variantId),
        {
            onSuccess: async () => {
                invalidateMrpQueriesByPrefix(mrpQueryKeys.products);
            },
        }
    );
};
