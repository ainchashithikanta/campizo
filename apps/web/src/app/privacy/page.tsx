import type { Metadata } from 'next';
import '@web/styles/legal.css';
import { LegalLayout } from '@web/components/ui/Legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — Campizo'
};

export default function PrivacyPage() {
  return (
    <LegalLayout kicker="Legal" title="Privacy Policy" updated="14 August 2026">
      <div className="legal-note">
        <strong>Our commitment.</strong> This Privacy Policy explains what data Campizo collects, why we collect
        it, how it is stored and protected, and the rights you have under the Digital Personal Data Protection
        Act, 2023 and other applicable law.
      </div>

      <section className="legal-section">
        <h2>1. Data Controller</h2>
        <p>
          Campizo is operated as a student community platform (contact details are listed on our{' '}
          <a href="/grievance">Grievance page</a>). We act as the data fiduciary for the personal data processed
          on this platform.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Personal Data We Collect</h2>
        <h3>2.1 Account data (via our authentication provider, Clerk)</h3>
        <ul>
          <li>Name, college email address (@nitk.edu.in or other participating college domain) and password credentials held by our authentication provider.</li>
          <li>College selected, and your public profile preferences (name visibility, gender where you provide it for connection features).</li>
        </ul>
        <h3>2.2 Content you create</h3>
        <ul>
          <li>Confessions, comments, votes and reports (stored anonymously);</li>
          <li>Marketplace listings, offers and conversations;</li>
          <li>Study materials you upload and resource bookmarks;</li>
          <li>Connect profile, messages and random-chat conversations;</li>
          <li>Placement experiences, questions and professor reviews you submit.</li>
        </ul>
        <h3>2.3 Technical data</h3>
        <ul>
          <li>IP address, browser type, device information, pages visited and timestamps (for security, rate limiting and analytics);</li>
          <li>Cookies and similar technologies (see section 6).</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Legal Basis &amp; Purposes</h2>
        <p>We process personal data on the basis of consent and performance of the terms of service, for:</p>
        <ul>
          <li>Providing, maintaining and securing the platform and its modules;</li>
          <li>Verifying your college affiliation via your institutional email domain;</li>
          <li>Moderating content and preventing abuse, spam and fraud;</li>
          <li>Complying with legal obligations, including orders under the IT Act, 2000 and the IT Rules, 2021.</li>
        </ul>
        <p>We do not sell personal data, and we do not use it for targeted advertising.</p>
      </section>

      <section className="legal-section">
        <h2>4. Anonymity &amp; Pseudonymity</h2>
        <p>
          Confessions and professor reviews are designed to be anonymous: your identity is not displayed with
          your post. However, our servers (and logs) associate posts with your account internally, and we will
          cooperate with lawful requests from courts and law enforcement as required by law.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. How We Share Data</h2>
        <ul>
          <li>
            <strong>Authentication provider (Clerk):</strong> account credentials and session data.
          </li>
          <li>
            <strong>Hosting &amp; infrastructure providers (e.g., Vercel, Render, Supabase):</strong> servers,
            databases and object storage.
          </li>
          <li>
            <strong>Law enforcement / courts:</strong> when legally compelled, in accordance with the IT Act,
            2000 and IT Rules, 2021.
          </li>
        </ul>
        <p>
          Personal data may be processed on servers located in India and abroad. By using the platform you
          consent to such processing, and we take contractual safeguards for any cross-border transfer as
          required under the DPDP Act, 2023.
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Cookies</h2>
        <p>
          We use essential cookies for authentication and security (e.g., your session and college selection)
          and, with your consent, functional cookies. You can control cookies through the consent banner and
          your browser settings. Blocking essential cookies may prevent the platform from working.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Data Retention</h2>
        <p>We retain data only as long as needed:</p>
        <ul>
          <li>Account data: until you delete your account;</li>
          <li>Confessions, listings and other content: until deleted or removed through moderation;</li>
          <li>Logs and security records: up to 12 months;</li>
          <li>Data required by law: for the legally mandated period.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>8. Security</h2>
        <p>
          We apply reasonable technical and organisational measures including encryption in transit (HTTPS),
          hashed credentials, access controls, rate limiting and regular security audits. No method of
          transmission is 100% secure; please contact us immediately if you believe your account has been
          compromised.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Your Rights</h2>
        <p>Under the DPDP Act, 2023 and applicable law, you have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal data we hold about you;</li>
          <li><strong>Correct</strong> inaccurate or incomplete data;</li>
          <li><strong>Erasure</strong> — request deletion of your personal data;</li>
          <li><strong>Withdraw consent</strong> at any time, subject to legal requirements;</li>
          <li>Lodge a <strong>grievance</strong> with us or with the Data Protection Board of India.</li>
        </ul>
        <p>
          To exercise any right, contact us via the <a href="/grievance">Grievance page</a>. We will respond
          within the timeframes required by law.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Minors</h2>
        <p>
          The platform is intended for college students who are at least 18 years of age. If you are under 18,
          you may only use the platform with verifiable consent of your parent or legal guardian, as required
          under Section 9 of the DPDP Act, 2023.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this policy as our practices or the law evolve. Material changes will be notified on the
          platform. The &quot;last updated&quot; date above reflects the latest revision.
        </p>
      </section>

      <section className="legal-section">
        <h2>12. Contact &amp; Grievances</h2>
        <p>
          For privacy queries or complaints, contact us via the <a href="/grievance">Grievance page</a>. You may
          also approach the Data Protection Board of India if you are not satisfied with our response.
        </p>
      </section>
    </LegalLayout>
  );
}