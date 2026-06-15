import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint manquant' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('push_subscription')
      .delete()
      .eq('endpoint', endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur unsubscribe push:', error);
    return NextResponse.json(
      { error: 'Erreur désactivation notifications' },
      { status: 500 }
    );
  }
}
