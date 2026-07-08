export const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || '';
const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN || '';

export async function verifyPurchase(email: string): Promise<boolean> {
  if (!GUMROAD_ACCESS_TOKEN || !GUMROAD_PRODUCT_ID) return false;

  try {
    const res = await fetch('https://api.gumroad.com/v2/sales', {
      headers: { Authorization: `Bearer ${GUMROAD_ACCESS_TOKEN}` },
    });
    if (!res.ok) return false;

    const data = await res.json();
    return (data.sales || []).some(
      (s: any) => s.product_id === GUMROAD_PRODUCT_ID &&
        s.email?.toLowerCase() === email.toLowerCase() &&
        !s.refunded
    );
  } catch {
    return false;
  }
}
