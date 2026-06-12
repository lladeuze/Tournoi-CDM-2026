import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.worldcupapi.com';

export async function GET() {
  try {
    const apiKey = process.env.WORLDCUP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'WORLDCUP_API_KEY manquante' },
        { status: 500 }
      );
    }

    const response = await fetch(`${BASE_URL}/fixtures?key=${apiKey}&lang=fr`, {
      cache: 'no-store',
    });

    const text = await response.text();

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json(
        {
          error: 'La réponse WorldCupAPI n’est pas du JSON',
          status: response.status,
          contentType: response.headers.get('content-type'),
          preview: text.slice(0, 500),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur WorldCupAPI', details: String(error) },
      { status: 500 }
    );
  }
}
