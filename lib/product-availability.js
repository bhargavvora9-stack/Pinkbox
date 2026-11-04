/**
 * Keep public product listings consistent with the inventory rules used by checkout.
 *
 * A product is publicly available when it is active, has a selling price, and either:
 * - inventory tracking is disabled;
 * - backorders are explicitly allowed;
 * - at least one active variant has stock; or
 * - a product without active variants has stock.
 */
export function filterAvailableProducts(products = [], variants = []) {
  const variantsByProductId = new Map();

  for (const variant of variants) {
    if (!variant?.product_id || variant.is_active === false) continue;
    const productVariants = variantsByProductId.get(variant.product_id) || [];
    productVariants.push(variant);
    variantsByProductId.set(variant.product_id, productVariants);
  }

  return products.filter((product) => {
    if (product?.is_active !== true || Number(product?.price || 0) <= 0) return false;

    // Match ProductPurchasePanel: untracked items and allowed backorders remain purchasable.
    if (product.track_inventory === false || product.allow_backorder === true) return true;

    const activeVariants = variantsByProductId.get(product.id) || [];
    if (activeVariants.length > 0) {
      return activeVariants.some((variant) => Number(variant.stock_quantity || 0) > 0);
    }

    return Number(product.stock_quantity || 0) > 0;
  });
}
