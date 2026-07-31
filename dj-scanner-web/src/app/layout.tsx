import React from 'react';
import './globals.css';
import { ApolloWrapper } from './ApolloWrapper';

export const metadata = {
  title: 'DJ FTP Music Suite - Doublons Flous',
  description: 'Application de détection intelligente de doublons flous sur serveur FTP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <ApolloWrapper>{children}</ApolloWrapper>
      </body>
    </html>
  );
}
