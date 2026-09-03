import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Autoriser l'accès aux fichiers statiques, à la page de connexion et au favicon
  if (
    pathname.startsWith('/_next') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    console.error("CRITICAL SECURITY ERROR: SESSION_SECRET is not configured.");
    // Fail-closed : On bloque l'accès aux API avec une 500 et on redirige vers le login avec un code d'erreur
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Configuration de sécurité manquante sur le serveur.' }, { status: 500 });
    }
    const loginUrl = new URL('/login?error=env', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Vérifier la présence du cookie de session
  const authCookie = request.cookies.get('klmt_auth_session');
  const isValid = authCookie ? await verifySession(authCookie.value, sessionSecret) : false;
  
  if (!isValid) {
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
