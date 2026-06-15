import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();

    if (!userId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Erreur Supabase push_subscriptions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur subscribe push:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur abonnement push' },
      { status: 500 }
    );
  }
}
