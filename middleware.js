// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  // APIルートは全て認証なしで通す
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}