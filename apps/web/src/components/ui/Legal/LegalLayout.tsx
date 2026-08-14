import React from 'react';

interface LegalLayoutProps {
  kicker: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}

export function LegalLayout({ kicker, title, updated, children }: LegalLayoutProps) {
  return (
    <main className="legal-page">
      <span className="legal-kicker">{kicker}</span>
      <h1 className="legal-title">{title}</h1>
      <p className="legal-updated">Last updated: {updated}</p>
      {children}
    </main>
  );
}