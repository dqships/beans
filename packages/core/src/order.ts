/** Fractional ordering helpers. Lower `order` sorts first. */

export function orderBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

export function orderAtTop(orders: number[]): number {
  return orders.length ? Math.min(...orders) - 1 : 0;
}

export function orderAtBottom(orders: number[]): number {
  return orders.length ? Math.max(...orders) + 1 : 0;
}

/** Order for inserting at `index` in an already-sorted list of orders. */
export function orderAtIndex(sortedOrders: number[], index: number): number {
  return orderBetween(sortedOrders[index - 1], sortedOrders[index]);
}
