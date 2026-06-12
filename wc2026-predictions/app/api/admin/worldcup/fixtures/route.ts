import { NextResponse } from 'next/server';

const BASE_URL = 'https://worldcupapi.com';

export async function GET() {
  try {
    const apiKey = process.env.WORLDCUP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'WORLDCUP_API_KEY manquante' },
        { status: 500 }
      );
    }

    const url = `${BASE_URL}/fixtures?key=${apiKey}&lang=fr`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
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
      {
        error: 'Erreur WorldCupAPI',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
