// Gumroad API client for purchase verification
// Uses Gumroad's /v2/sales endpoint to check if a customer has purchased a product

const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN || '';
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || '';

export function getProductUrl(): string {
  if (!GUMROAD_PRODUCT_ID) throw new Error('GUMROAD_PRODUCT_ID not configured');
  return `https://app.gumroad.com/l/${GUMROAD_PRODUCT_ID}`;
}

export async function verifyPurchase(email: string): Promise<boolean> {
  if (!GUMROAD_ACCESS_TOKEN) {
    console.warn('[gumroad] GUMROAD_ACCESS_TOKEN not set, skipping verification');
    return false;
  }

  try {
    const res = await fetch('https://api.gumroad.com/v2/sales', {
      headers: {
        Authorization: `Bearer ${GUMROAD_ACCESS_TOKEN}`,
      },
    });

    if (!res.ok) {
      console.error('[gumroad] API error:', res.status);
      return false;
    }

    const data = await res.json();
    const sales = data.sales || [];

    // Check if any sale matches both the product and the customer email
    return sales.some(
      (sale: any) =>
        sale.product_id === GUMROAD_PRODUCT_ID &&
        sale.email?.toLowerCase() === email.toLowerCase() &&
        !sale.refunded
    );
  } catch (err: any) {
    console.error('[gumroad] verifyPurchase error:', err.message);
    return false;
  }
}
