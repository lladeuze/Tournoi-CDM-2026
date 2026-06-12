import { NextResponse } from 'next/server';

const API_KEY = process.env.THESPORTSDB_API_KEY || '3';
const LEAGUE_ID = '4429';

export async function GET() {
  const response = await fetch(
    `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsseason.php?id=${LEAGUE_ID}&s=2026`,
    { cache: 'no-store' }
  );

  const data = await response.json();

  const teams = new Map();

  for (const event of data.events || []) {
    teams.set(event.idHomeTeam, {
      id: event.idHomeTeam,
      name: event.strHomeTeam,
    });

    teams.set(event.idAwayTeam, {
      id: event.idAwayTeam,
      name: event.strAwayTeam,
    });
  }

  return NextResponse.json({
    count: teams.size,
    teams: Array.from(teams.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  });
}
