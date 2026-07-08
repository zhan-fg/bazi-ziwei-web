import { NextRequest, NextResponse } from 'next/server';
import { getProductUrl } from '@/lib/gumroad';

export async function POST(request: NextRequest) {
  try {
    const { chartId } = await request.json();
    if (!chartId) {
      return NextResponse.json({ error: 'Missing chartId' }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const productUrl = getProductUrl();

    // Redirect user to Gumroad, then Gumroad redirects back to our result page
    const checkoutUrl = `${productUrl}?wanted=true&url=${encodeURIComponent(`${origin}/result/${chartId}?paid=1`)}`;

    return NextResponse.json({ url: checkoutUrl });
  } catch (err: any) {
    console.error('[checkout] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
