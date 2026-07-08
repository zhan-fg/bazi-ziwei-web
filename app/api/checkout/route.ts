import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { chartId } = await request.json();
    if (!chartId) {
      return NextResponse.json({ error: 'Missing chartId' }, { status: 400 });
    }

    const productId = process.env.GUMROAD_PRODUCT_ID;
    if (!productId) {
      return NextResponse.json({ error: 'GUMROAD_PRODUCT_ID not configured' }, { status: 503 });
    }

    const origin = request.nextUrl.origin;
    const checkoutUrl = `https://app.gumroad.com/l/${productId}?wanted=true`;

    return NextResponse.json({ url: checkoutUrl });
  } catch (err: any) {
    console.error('[checkout] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
