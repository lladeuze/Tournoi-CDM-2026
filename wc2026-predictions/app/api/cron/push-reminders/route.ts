import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in55 = new Date(now.getTime() + 55 * 60 * 1000).toISOString();
  const in65 = new Date(now.getTime() + 65 * 60 * 1000).toISOString();

  const { data: matches, error: matchesError } = await supabaseAdmin
    .from('matches')
    .select('id, home_team, away_team, kickoff_at')
    .eq('status', 'scheduled')
    .gte('kickoff_at', in55)
    .lte('kickoff_at', in65);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  let sent = 0;

  for (const match of matches || []) {
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscription')
      .select('user_id, endpoint, p256dh, auth');

    if (subError) continue;

    for (const sub of subscriptions || []) {
      const { data: prediction } = await supabaseAdmin
        .from('predictions')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('match_id', match.id)
        .maybeSingle();

      if (prediction) continue;

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
            title: '⏰ Prono manquant',
            body: `${match.home_team} - ${match.away_team} commence dans 1 heure. Tu n’as pas encore enregistré ton pronostic.`,
            url: '/predictions',
          })
        );

        sent++;
      } catch (error: any) {
        console.error('Erreur push:', error);

        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscription')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    matchesChecked: matches?.length || 0,
    sent,
  });
}
