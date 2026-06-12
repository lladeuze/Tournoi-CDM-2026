import { NextResponse } from 'next/server';

const BASE_URL = 'https://worldcupapi.com/api';

export async function GET() {
  try {
    const apiKey = process.env.WORLDCUP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'WORLDCUP_API_KEY manquante dans .env.local' },
        { status: 500 }
      );
    }

    const response = await fetch(`${BASE_URL}/fixtures?key=${apiKey}&lang=fr`, {
      cache: 'no-store',
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur WorldCupAPI',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
