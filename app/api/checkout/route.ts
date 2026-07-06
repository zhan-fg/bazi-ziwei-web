import { NextRequest, NextResponse } from 'next/server';

let _stripe: any = null;
function getStripe() {
  if (!_stripe) {
    const Stripe = require('stripe');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }
  return _stripe;
}

export async function POST(request: NextRequest) {
  try {
    const { chartId, type } = await request.json();
    if (!chartId) {
      return NextResponse.json({ error: 'Missing chartId' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 503 });
    }

    const analysisLabel = type === 'bazi' ? 'Bazi Reading'
      : type === 'ziwei' ? 'Ziwei Reading'
      : type === 'combined' ? 'Combined Synthesis'
      : 'Full Reading';

    const stripe = getStripe();
    const origin = request.nextUrl.origin;
    const typeParam = type || 'bazi';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${analysisLabel} — AI Destiny Analysis`,
            description: 'Deep AI-powered Chinese astrology reading with personalized insights',
          },
          unit_amount: 199,
        },
        quantity: 1,
      }],
      success_url: `${origin}/result/${chartId}?paid=${typeParam}`,
      cancel_url: `${origin}/result/${chartId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
