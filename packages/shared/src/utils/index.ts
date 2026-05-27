/**
 * Format a number as BDT currency
 */
export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generate a human-readable ID with prefix
 * e.g., generateId('ISP', 1) => 'ISP-00001'
 */
export function generateId(prefix: string, sequence: number, padding = 5): string {
  return `${prefix}-${String(sequence).padStart(padding, '0')}`;
}

/**
 * Generate invoice number
 * e.g., generateInvoiceNumber(2026, 1) => 'INV-2026-000001'
 */
export function generateInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Format a date as 'DD MMM YYYY'
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date as 'DD MMM YYYY, hh:mm A'
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get the billing month label
 * e.g., getBillingMonth(new Date('2026-05-01')) => 'May 2026'
 */
export function getBillingMonth(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Calculate days between two dates
 */
export function daysBetween(start: Date | string, end: Date | string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Truncate a string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Slugify a string (e.g., for URL-friendly names)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Standard pagination meta
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standard paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Calculate pagination meta from query results
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Standard API success response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
}
