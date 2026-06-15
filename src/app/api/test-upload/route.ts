import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, length: body.data.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
