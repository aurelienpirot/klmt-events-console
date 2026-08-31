import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const dbMode = process.env.DB_MODE || 'local';
  
  // En local, pas d'authentification pour coder tranquille !
  if (dbMode === 'local') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Autoriser l'accès aux fichiers statiques, à la page de connexion et aux routes d'API d'authentification (si existantes, mais on gère tout sur /login)
  if (
    pathname.startsWith('/_next') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Vérifier la présence du cookie de session
  const authCookie = request.cookies.get('klmt_auth_session');
  
  if (!authCookie || authCookie.value !== 'klmt-authenticated-session-token') {
    // Si c'est un appel d'API, renvoyer une erreur 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Non autorisé. Veuillez vous connecter.' }, { status: 401 });
    }
    // Sinon, rediriger vers la page de login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
