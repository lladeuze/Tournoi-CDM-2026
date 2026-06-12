import { NextResponse } from 'next/server';

const API_KEY = process.env.THESPORTSDB_API_KEY || '3';
const LEAGUE_ID = '4429';

export async function GET() {
  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsnextleague.php?id=${LEAGUE_ID}`,
      {
        cache: 'no-store',
      }
    );

    const text = await response.text();

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json(
        {
          error: 'La réponse TheSportsDB n’est pas du JSON',
          status: response.status,
          contentType: response.headers.get('content-type'),
          preview: text.slice(0, 500),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur TheSportsDB',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
