import { NextRequest, NextResponse } from 'next/server';
import { verifyPurchase } from '@/lib/gumroad';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const verified = await verifyPurchase(email);
    return NextResponse.json({ verified });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
