import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const checks = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasVapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    hasVapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
    hasVapidSubject: !!process.env.VAPID_SUBJECT,
  };

  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .limit(1);

  return NextResponse.json({
    checks,
    tableReadOk: !error,
    tableError: error?.message || null,
    rowCountVisible: data?.length ?? 0,
  });
}
