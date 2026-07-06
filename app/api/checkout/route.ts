import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { chartId } = await request.json();
    if (!chartId) {
      return NextResponse.json({ error: 'Missing chartId' }, { status: 400 });
    }

    const productUrl = process.env.GUMROAD_PRODUCT_URL;
    if (!productUrl) {
      return NextResponse.json({ error: 'GUMROAD_PRODUCT_URL not configured' }, { status: 503 });
    }

    const origin = request.nextUrl.origin;
    const returnUrl = `${origin}/result/${chartId}?paid=combined`;

    // Gumroad respects ?wanted=true to skip the landing page
    // We pass our return URL as a query param (Gumroad shows a back-link
    // on the thank-you page, but we also have a manual "I've paid" button
    // on the result page as fallback)
    const checkoutUrl = `${productUrl}?wanted=true`;

    return NextResponse.json({ url: checkoutUrl, returnUrl });
  } catch (err: any) {
    console.error('[checkout] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
