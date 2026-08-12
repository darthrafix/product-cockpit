import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.COWORK_PASSWORD;

  if (!expected || password === expected) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('cowork_session', expected ?? 'open', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return res;
  }
  return NextResponse.json({ ok: false, error: 'Senha incorreta' }, { status: 401 });
}
