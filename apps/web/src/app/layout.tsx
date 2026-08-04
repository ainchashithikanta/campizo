import type { Metadata } from 'next';
import '@web/styles/globals.css';
import '@web/styles/rate-my-professor.css';
import { Navbar } from '@web/components/ui/Navbar/Navbar';

export const metadata: Metadata = {
  title: 'College Hub — Rate My Professor Module',
  description:
    'Enterprise production-grade academic evaluations, professor ratings, and verified student feedback for multi-college platforms.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <Navbar />
        <main id="main-content" className="rmp-page">
          {children}
        </main>
      </body>
    </html>
  );
}
