import { NextResponse } from 'next/server'

/** Personal invitation links: /i/ABCD-1234 -> /?code=ABCD-1234 (the site then signs the guest in). */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return NextResponse.redirect(new URL(`/?code=${encodeURIComponent(code)}`, req.url))
}
