import type { Metadata } from 'next';
import '@web/styles/globals.css';
import '@web/styles/home.css';
import '@web/styles/confessions.css';
import '@web/styles/marketplace.css';
import '@web/styles/academic-resource-hub.css';
import { Navbar } from '@web/components/ui/Navbar/Navbar';
import { Footer } from '@web/components/ui/Footer/Footer';

export const metadata: Metadata = {
  title: 'Campizo — Your Campus, All in One Place',
  description:
    'Campus confessions, study materials, marketplace deals, connections and placements — built by students, for students.'
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
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
