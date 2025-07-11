import { NextResponse } from 'next/server'

export function middleware(request) {
  // Basic認証のチェック
  const basicAuth = request.headers.get('authorization')
  const url = request.nextUrl
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')
    
    if (user === process.env.BASIC_AUTH_USER && pwd === process.env.BASIC_AUTH_PASSWORD) {
      return NextResponse.next()
    }
  }
  
  url.pathname = '/api/auth'
  
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)'],
}