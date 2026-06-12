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

function normalizeTeamName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchEvents(endpoint: string) {
  const response = await fetch(
    `https://www.thesportsdb.com/api/v1/json/${API_KEY}/${endpoint}.php?id=${LEAGUE_ID}`,
    { cache: 'no-store' }
  );

  const data = await response.json();
  return data.events || [];
}

async function findOrAutoMapTeam(apiTeamId: string, apiTeamName: string) {
  const apiId = String(apiTeamId);

  const { data: mappedTeam } = await supabaseAdmin
    .from('teams')
    .select('id, name, code, thesportsdb_team_id')
    .eq('thesportsdb_team_id', apiId)
    .maybeSingle();

  if (mappedTeam) {
    return {
      team: mappedTeam,
      autoMapped: false,
      reason: 'already_mapped',
      candidates: [],
    };
  }

  const { data: exactNameTeam } = await supabaseAdmin
    .from('teams')
    .select('id, name, code, thesportsdb_team_id')
    .ilike('name', apiTeamName)
    .maybeSingle();

  if (exactNameTeam) {
    await supabaseAdmin
      .from('teams')
      .update({ thesportsdb_team_id: apiId })
      .eq('id', exactNameTeam.id);

    return {
      team: exactNameTeam,
      autoMapped: true,
      reason: 'exact_name',
      candidates: [],
    };
  }

  const normalizedApiName = normalizeTeamName(apiTeamName);

  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('id, name, code, thesportsdb_team_id');

  const candidates = (teams || []).filter((team) => {
    const normalizedDbName = normalizeTeamName(team.name);

    return (
      normalizedDbName === normalizedApiName ||
      normalizedDbName.includes(normalizedApiName) ||
      normalizedApiName.includes(normalizedDbName)
    );
  });

  if (candidates.length === 1) {
    await supabaseAdmin
      .from('teams')
      .update({ thesportsdb_team_id: apiId })
      .eq('id', candidates[0].id);

    return {
      team: candidates[0],
      autoMapped: true,
      reason: 'normalized_name',
      candidates: [],
    };
  }

  return {
    team: null,
    autoMapped: false,
    reason: candidates.length > 1 ? 'multiple_candidates' : 'not_found',
    candidates,
  };
}

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY manquante' },
        { status: 500 }
      );
    }

    const [nextEvents, pastEvents] = await Promise.all([
      fetchEvents('eventsnextleague'),
      fetchEvents('eventspastleague'),
    ]);

    const events = [...pastEvents, ...nextEvents];
    const results = [];

    for (const event of events) {
      const homeTeamResult = await findOrAutoMapTeam(
        String(event.idHomeTeam),
        event.strHomeTeam
      );

      const awayTeamResult = await findOrAutoMapTeam(
        String(event.idAwayTeam),
        event.strAwayTeam
      );

      const homeTeam = homeTeamResult.team;
      const awayTeam = awayTeamResult.team;

      if (!homeTeam || !awayTeam) {
        results.push({
          event: event.strEvent,
          status: 'team_not_found',
          homeName: event.strHomeTeam,
          awayName: event.strAwayTeam,
          idHomeTeam: event.idHomeTeam,
          idAwayTeam: event.idAwayTeam,
          homeReason: homeTeamResult.reason,
          awayReason: awayTeamResult.reason,
          homeCandidates: homeTeamResult.candidates,
          awayCandidates: awayTeamResult.candidates,
        });
        continue;
      }

      const { data: match } = await supabaseAdmin
        .from('matches')
        .select('id, manually_overridden, api_sync_enabled')
        .eq('home_team_id', homeTeam.id)
        .eq('away_team_id', awayTeam.id)
        .maybeSingle();

      if (!match) {
        results.push({
          event: event.strEvent,
          status: 'match_not_found',
          kickoff: event.strTimestamp,
          homeTeam: event.strHomeTeam,
          awayTeam: event.strAwayTeam,
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
        homeAutoMapped: homeTeamResult.autoMapped,
        awayAutoMapped: awayTeamResult.autoMapped,
        homeMapReason: homeTeamResult.reason,
        awayMapReason: awayTeamResult.reason,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      updated: results.filter((r) => r.status === 'updated').length,
      autoMapped: results.filter(
        (r) => r.homeAutoMapped || r.awayAutoMapped
      ).length,
      teamNotFound: results.filter((r) => r.status === 'team_not_found'),
      matchNotFound: results.filter((r) => r.status === 'match_not_found'),
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
