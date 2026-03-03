/**
 * Cursor-based pagination utilities
 * Never use OFFSET-based pagination for performance reasons.
 */

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

/**
 * Build a cursor-based paginated response.
 * @param items - Array of items (fetch limit+1 to detect hasMore)
 * @param limit - Requested page size
 * @param getCursor - Function to extract cursor value from item
 */
export function buildPaginatedResponse<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string,
  total?: number,
): PaginationResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && data.length > 0 ? getCursor(data[data.length - 1]!) : null;

  return {
    data,
    meta: {
      total: total ?? data.length,
      limit,
      nextCursor,
      hasMore,
    },
  };
}

/**
 * Build Prisma cursor condition from cursor string.
 */
export function buildPrismaCursor(cursor?: string): { cursor?: { id: string }; skip?: number } {
  if (!cursor) return {};
  return {
    cursor: { id: cursor },
    skip: 1, // Skip the cursor item itself
  };
}
