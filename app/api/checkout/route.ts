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
    const { chartId } = await request.json();
    if (!chartId) {
      return NextResponse.json({ error: 'Missing chartId' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 503 });
    }

    const stripe = getStripe();
    const origin = request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Bazi & Ziwei Destiny Chart',
            description: 'Full Chinese astrology reading with shareable poster',
          },
          unit_amount: 199, // $1.99
        },
        quantity: 1,
      }],
      success_url: `${origin}/result/${chartId}?paid=true`,
      cancel_url: `${origin}/?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
