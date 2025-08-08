// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  // Basic認証を適用するパスを指定
  const protectedPaths = ['/admin']
  
  // 現在のパスがprotectedPathsに含まれるかチェック
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    // Basic認証の設定を環境変数から取得
    const basicAuthUser = process.env.BASIC_AUTH_USER
    const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD

    // 環境変数が設定されていない場合はスキップ
    if (!basicAuthUser || !basicAuthPassword) {
      console.warn('Basic Auth credentials not found in environment variables')
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}