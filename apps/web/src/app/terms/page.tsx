import type { Metadata } from 'next';
import '@web/styles/legal.css';
import { LegalLayout } from '@web/components/ui/Legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service — Campizo'
};

export default function TermsPage() {
  return (
    <LegalLayout kicker="Legal" title="Terms of Service" updated="14 August 2026">
      <div className="legal-note">
        <strong>Please read these terms carefully.</strong> By accessing or using Campizo, you agree to be bound
        by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.
      </div>

      <section className="legal-section">
        <h2>1. About the Service</h2>
        <p>
          Campizo is a student community platform operated for the benefit of students of National Institute of
          Technology Karnataka, Surathkal (NITK) and other participating colleges. It provides modules including
          anonymous confessions, study materials, a campus marketplace, student connections, placement guidance
          and professor ratings. The platform is provided &quot;as is&quot; and is not an official service of
          NITK or any college.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years of age, or have obtained consent from your parent or legal guardian (as
          required by the Digital Personal Data Protection Act, 2023), to use Campizo. By creating an account you
          confirm that you meet this requirement. Access to the platform is restricted to your college&apos;s
          official email domain; you may not use another person&apos;s email address.
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Accounts &amp; Security</h2>
        <ul>
          <li>You are responsible for safeguarding your login credentials.</li>
          <li>You must provide accurate information and keep it up to date.</li>
          <li>You may not create accounts for others without authorization, or create multiple accounts to evade restrictions.</li>
          <li>We may suspend or terminate accounts that violate these Terms or applicable law.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. User Conduct</h2>
        <p>You agree not to use Campizo to:</p>
        <ul>
          <li>Post content that is unlawful, harassing, defamatory, hateful, or obscene;</li>
          <li>Doxx, impersonate, or reveal personal information about any person without consent;</li>
          <li>Upload content that infringes copyrights or other intellectual property rights;</li>
          <li>Send spam, phishing, or fraudulent communications;</li>
          <li>Attempt to gain unauthorized access to systems, accounts, or data;</li>
          <li>Interfere with the operation of the platform or with other users&apos; enjoyment of it.</li>
        </ul>
        <p>
          The full list of prohibited content is set out in our{' '}
          <a href="/guidelines">Community Guidelines</a>, which form part of these Terms.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. User-Generated Content</h2>
        <p>
          You retain ownership of content you post. By posting, you grant Campizo a non-exclusive, worldwide,
          royalty-free, sub-licensable licence to host, store, display and distribute your content solely to
          operate and improve the platform.
        </p>
        <p>
          Anonymous posts (e.g., confessions) are stored without your name; however, we may be required to
          disclose identifying information to law enforcement or courts when legally compelled, or to comply
          with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Content Moderation &amp; Takedowns</h2>
        <p>
          We moderate content and act on valid reports. You may report content or file a grievance through our{' '}
          <a href="/grievance">Grievance page</a>. We aim to resolve grievances within 15 days as required under
          Rule 3(2) of the IT (Intermediary Guidelines) Rules, 2021.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Marketplace</h2>
        <p>
          The marketplace connects buyers and sellers among students. Campizo is not a party to any transaction
          and does not handle payments, unless separately stated. You deal with other users at your own risk;
          verify goods and persons before transacting. If paid e-commerce activity is introduced, additional
          disclosures under the Consumer Protection (E-Commerce) Rules, 2020 will apply.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Intellectual Property</h2>
        <p>
          The Campizo name, logo, design and software are owned by Campizo. Study materials uploaded by users
          belong to their uploaders or rightful owners; we do not assert ownership and will remove infringing
          material on receipt of a valid complaint.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Disclaimer of Warranties</h2>
        <p>
          Campizo is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not warrant that
          the service will be uninterrupted, error-free, or that content (including placement data, listings,
          ratings or study materials) is accurate or complete. Content posted by users is the responsibility of
          the poster.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Campizo, its operators and contributors shall not be liable
          for any indirect, incidental, special or consequential damages arising from your use of the platform,
          including reliance on user-generated content or transactions with other users.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Termination</h2>
        <p>
          We may suspend or terminate your access for breach of these Terms, at any time and without notice.
          You may delete your account and request erasure of your personal data as described in our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>

      <section className="legal-section">
        <h2>12. Governing Law &amp; Disputes</h2>
        <p>
          These Terms are governed by the laws of the Republic of India. Disputes shall be subject to the
          exclusive jurisdiction of the courts at Mangaluru, Karnataka, India. Nothing in these Terms limits
          rights you may have under applicable consumer protection law.
        </p>
      </section>

      <section className="legal-section">
        <h2>13. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be notified on the platform.
          Continued use after changes constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="legal-section">
        <h2>14. Contact</h2>
        <p>
          Questions about these Terms may be sent to the contact details on our{' '}
          <a href="/grievance">Grievance page</a>.
        </p>
      </section>
    </LegalLayout>
  );
}