/**
 * Gumroad integration helpers.
 *
 * For the webhook-based flow (recommended):
 *   - Set up Gumroad Ping webhook to POST to /api/gumroad-webhook
 *   - The webhook is the source of truth for purchases
 *
 * For polling-based verification (fallback):
 *   - Use verifyPurchase() to check if an email has purchased
 *   - Requires GUMROAD_PRODUCT_ID and GUMROAD_ACCESS_TOKEN env vars
 */

export const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || "";
const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN || "";

/**
 * Verify a Gumroad purchase by polling the Gumroad API.
 * This is a fallback — prefer the webhook-based flow.
 */
export async function verifyPurchase(email: string): Promise<boolean> {
  if (!GUMROAD_ACCESS_TOKEN || !GUMROAD_PRODUCT_ID) return false;

  try {
    const res = await fetch("https://api.gumroad.com/v2/sales", {
      headers: { Authorization: `Bearer ${GUMROAD_ACCESS_TOKEN}` },
    });
    if (!res.ok) return false;

    const data = await res.json();
    return (data.sales || []).some(
      (s: any) =>
        s.product_id === GUMROAD_PRODUCT_ID &&
        s.email?.toLowerCase() === email.toLowerCase() &&
        !s.refunded
    );
  } catch {
    return false;
  }
}
