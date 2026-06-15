import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET() {
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions?.length) {
    return NextResponse.json(
      { error: 'Aucun abonnement trouvé dans push_subscriptions' },
      { status: 404 }
    );
  }

  let sent = 0;
  const errors = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify({
          title: '🧪 Test notifications',
          body: 'Si tu vois ce message, les notifications fonctionnent !',
          url: '/profile',
        })
      );

      sent++;
    } catch (error: any) {
      errors.push({
        user_id: sub.user_id,
        message: error.message,
        statusCode: error.statusCode,
      });
    }
  }

  return NextResponse.json({
    success: true,
    totalSubscriptions: subscriptions.length,
    sent,
    errors,
  });
}
