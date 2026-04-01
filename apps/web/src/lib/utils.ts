import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ProductVariant } from "@scaffold/types"

const SIZE_ORDER: Record<string, number> = {
  xxxs: 0,
  xxs: 1,
  xs: 2,
  s: 3,
  m: 4,
  l: 5,
  xl: 6,
  xxl: 7,
  xxxl: 8,
  unica: 9,
  u: 9,
  one_size: 9,
  onesize: 9,
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeSizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '_')
}

export function getSizeSortKey(value: string) {
  const normalized = normalizeSizeLabel(value)
  const tokens = normalized
    .split(/[\/,-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  const ranks = tokens
    .map((token) => SIZE_ORDER[token])
    .filter((rank): rank is number => rank != null)

  if (ranks.length === 0) {
    return {
      primary: Number.MAX_SAFE_INTEGER,
      secondary: Number.MAX_SAFE_INTEGER,
      tokenCount: tokens.length || 1,
      normalized,
    }
  }

  return {
    primary: Math.min(...ranks),
    secondary: Math.max(...ranks),
    tokenCount: tokens.length,
    normalized,
  }
}

export function sortSizeLabels(sizes: string[]) {
  return [...sizes].sort((left, right) => {
    const leftKey = getSizeSortKey(left)
    const rightKey = getSizeSortKey(right)

    if (leftKey.primary !== rightKey.primary) return leftKey.primary - rightKey.primary
    if (leftKey.secondary !== rightKey.secondary) return leftKey.secondary - rightKey.secondary
    if (leftKey.tokenCount !== rightKey.tokenCount) return leftKey.tokenCount - rightKey.tokenCount
    return leftKey.normalized.localeCompare(rightKey.normalized)
  })
}

export function sortProductVariantsBySize<T extends Pick<ProductVariant, 'size' | 'sizeCode' | 'name' | 'sku' | 'color' | 'colorCode'>>(variants: T[]) {
  return [...variants].sort((left, right) => {
    const leftSizeKey = getSizeSortKey(left.size || left.sizeCode || left.name || '')
    const rightSizeKey = getSizeSortKey(right.size || right.sizeCode || right.name || '')

    if (leftSizeKey.primary !== rightSizeKey.primary) return leftSizeKey.primary - rightSizeKey.primary
    if (leftSizeKey.secondary !== rightSizeKey.secondary) return leftSizeKey.secondary - rightSizeKey.secondary
    if (leftSizeKey.tokenCount !== rightSizeKey.tokenCount) return leftSizeKey.tokenCount - rightSizeKey.tokenCount

    const leftColor = (left.color || left.colorCode || '').toLowerCase()
    const rightColor = (right.color || right.colorCode || '').toLowerCase()
    const colorCompare = leftColor.localeCompare(rightColor)
    if (colorCompare !== 0) return colorCompare

    const nameCompare = (left.name || '').localeCompare(right.name || '')
    if (nameCompare !== 0) return nameCompare

    return (left.sku || '').localeCompare(right.sku || '')
  })
}

export function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return '$0';
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQuantity(value: number | undefined | null) {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
