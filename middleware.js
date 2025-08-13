// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  // APIルートは全て認証なしで通す
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // /adminのみBasic認証を適用
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const basicAuthUser = process.env.BASIC_AUTH_USER
    const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD

    if (!basicAuthUser || !basicAuthPassword) {
      return NextResponse.next()
    }

    const basicAuth = request.headers.get('authorization')

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')

      if (user === basicAuthUser && pwd === basicAuthPassword) {
        return NextResponse.next()
      }
    }

    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}