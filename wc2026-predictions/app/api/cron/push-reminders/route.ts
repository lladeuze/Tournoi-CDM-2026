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

type ReminderConfig = {
  type: 'missing_prediction_1h' | 'missing_prediction_15m';
  fromMinutes: number;
  toMinutes: number;
  title: string;
  getBody: (homeTeam: string, awayTeam: string) => string;
};

const reminders: ReminderConfig[] = [
  {
    type: 'missing_prediction_1h',
    fromMinutes: 55,
    toMinutes: 65,
    title: '⏰ Prono manquant',
    getBody: (homeTeam, awayTeam) =>
      `${homeTeam} - ${awayTeam} commence dans 1 heure. Tu n’as pas encore enregistré ton pronostic.`,
  },
  {
    type: 'missing_prediction_15m',
    fromMinutes: 10,
    toMinutes: 20,
    title: '🚨 Dernier rappel prono',
    getBody: (homeTeam, awayTeam) =>
      `Urgent : ${homeTeam} - ${awayTeam} commence dans 15 minutes. Dernière chance pour encoder ton prono !`,
  },
];

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let sent = 0;
  const details: any[] = [];

  for (const reminder of reminders) {
    const now = new Date();

    const from = new Date(
      now.getTime() + reminder.fromMinutes * 60 * 1000
    ).toISOString();

    const to = new Date(
      now.getTime() + reminder.toMinutes * 60 * 1000
    ).toISOString();

    const { data: matches, error: matchesError } = await supabaseAdmin
      .from('matches')
      .select('id, home_team, away_team, kickoff_at')
      .eq('status', 'scheduled')
      .gte('kickoff_at', from)
      .lte('kickoff_at', to);

    if (matchesError) {
      details.push({
        reminder: reminder.type,
        error: matchesError.message,
      });
      continue;
    }

    for (const match of matches || []) {
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, endpoint, p256dh, auth');

      if (subError) {
        details.push({
          reminder: reminder.type,
          match_id: match.id,
          error: subError.message,
        });
        continue;
      }

      for (const sub of subscriptions || []) {
        const { data: prediction } = await supabaseAdmin
          .from('predictions')
          .select('id')
          .eq('user_id', sub.user_id)
          .eq('match_id', match.id)
          .maybeSingle();

        if (prediction) continue;

        const { error: logError } = await supabaseAdmin
          .from('push_notification_log')
          .insert({
            user_id: sub.user_id,
            match_id: match.id,
            notification_type: reminder.type,
          });

        if (logError) continue;

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
              title: reminder.title,
              body: reminder.getBody(match.home_team, match.away_team),
              url: '/predictions',
            })
          );

          sent++;
        } catch (error: any) {
          details.push({
            reminder: reminder.type,
            user_id: sub.user_id,
            error: error.message,
            statusCode: error.statusCode,
          });

          if (error.statusCode === 404 || error.statusCode === 410) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    details,
  });
}
