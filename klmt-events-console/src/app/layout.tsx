import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Console de Gestion KLMT Events — Dashboard Financier',
  description: 'Application de gestion administrative, contractuelle et comptable pour KLMT Events.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
