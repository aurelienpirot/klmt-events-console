import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface LoginPageProps {
  searchParams: { error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const isError = searchParams?.error === '1';

  async function handleLogin(formData: FormData) {
    'use server';

    const password = formData.get('password');
    const adminPassword = process.env.ADMIN_PASSWORD || 'klmt2026'; // fallback si non défini

    if (password === adminPassword) {
      cookies().set('klmt_auth_session', 'klmt-authenticated-session-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 semaine de session active
        path: '/'
      });
      redirect('/');
    } else {
      redirect('/login?error=1');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#ffffff',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '12px',
        padding: '35px 40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#a855f7', margin: '0 0 10px 0', fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          💼 Console KLMT Events
        </h2>
        <p style={{ color: '#8b949e', fontSize: '0.85rem', margin: '0 0 25px 0', lineHeight: '1.4' }}>
          Veuillez saisir le mot de passe de sécurité pour accéder au tableau de bord opérationnel.
        </p>

        <form action={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', color: '#8b949e' }}>Mot de passe d'accès :</label>
            <input
              type="password"
              name="password"
              placeholder="Saisir le mot de passe..."
              required
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          {isError && (
            <div style={{
              color: '#ff4d4f',
              backgroundColor: 'rgba(255, 77, 79, 0.1)',
              border: '1px solid rgba(255, 77, 79, 0.2)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              textAlign: 'left',
              marginTop: '5px'
            }}>
              ❌ Mot de passe incorrect. Veuillez réessayer.
            </div>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: '#a855f7',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
              marginTop: '10px',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.15)'
            }}
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
