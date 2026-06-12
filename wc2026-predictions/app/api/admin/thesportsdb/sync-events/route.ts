import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.THESPORTSDB_API_KEY || '3';
const LEAGUE_ID = '4429';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function mapStatus(status: string | null) {
  if (status === 'FT') return 'finished';
  if (status === 'Live' || status === '1H' || status === '2H' || status === 'HT') return 'live';
  return 'scheduled';
}

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local / Vercel' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsnextleague.php?id=${LEAGUE_ID}`,
      { cache: 'no-store' }
    );

    const data = await response.json();
    const events = data.events || [];

    const results = [];

    for (const event of events) {
      const homeName = event.strHomeTeam;
      const awayName = event.strAwayTeam;

      const { data: homeTeam } = await supabaseAdmin
        .from('teams')
        .select('id')
        .ilike('name', homeName)
        .maybeSingle();

      const { data: awayTeam } = await supabaseAdmin
        .from('teams')
        .select('id')
        .ilike('name', awayName)
        .maybeSingle();

      if (!homeTeam || !awayTeam) {
        results.push({
          event: event.strEvent,
          status: 'team_not_found',
          homeName,
          awayName,
        });
        continue;
      }

      const { data: match } = await supabaseAdmin
        .from('matches')
        .select('id, manually_overridden, api_sync_enabled')
        .eq('home_team_id', homeTeam.id)
        .eq('away_team_id', awayTeam.id)
        .eq('kickoff_at', event.strTimestamp)
        .maybeSingle();

      if (!match) {
        results.push({
          event: event.strEvent,
          status: 'match_not_found',
          kickoff: event.strTimestamp,
        });
        continue;
      }

      if (match.manually_overridden || match.api_sync_enabled === false) {
        results.push({
          event: event.strEvent,
          status: 'skipped_manual_or_disabled',
        });
        continue;
      }

      const { error } = await supabaseAdmin
        .from('matches')
        .update({
          api_football_fixture_id: Number(event.idEvent),
          home_score: event.intHomeScore === null ? null : Number(event.intHomeScore),
          away_score: event.intAwayScore === null ? null : Number(event.intAwayScore),
          status: mapStatus(event.strStatus),
          api_last_sync_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      results.push({
        event: event.strEvent,
        status: error ? 'error' : 'updated',
        error: error?.message || null,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur synchronisation TheSportsDB',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
