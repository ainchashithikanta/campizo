import type { Metadata } from 'next';
import '@web/styles/legal.css';
import { LegalLayout } from '@web/components/ui/Legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Community Guidelines — Campizo'
};

export default function GuidelinesPage() {
  return (
    <LegalLayout kicker="Community" title="Community Guidelines" updated="14 August 2026">
      <div className="legal-note">
        <strong>Be kind. Be safe. Be real.</strong> These guidelines keep Campizo a safe, respectful space for
        every student. They form part of our <a href="/terms">Terms of Service</a> and reflect the content
        norms required under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code)
        Rules, 2021.
      </div>

      <section className="legal-section">
        <h2>1. What Is Welcome</h2>
        <ul>
          <li>Honest confessions, experiences and advice — shared anonymously;</li>
          <li>Study materials and resources that you have permission to share;</li>
          <li>Marketplace listings for your own genuine items;</li>
          <li>Constructive, respectful discussion.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>2. Prohibited Content</h2>
        <p>Content is not allowed if it:</p>
        <ul>
          <li>Is unlawful, harassing, threatening, defamatory, or promotes violence;</li>
          <li>Contains hate speech based on religion, caste, race, gender, sexual orientation or disability;</li>
          <li>Reveals personal or private information about others without consent (&quot;doxxing&quot;), including phone numbers, addresses, photos of others, or academic/medical records;</li>
          <li>Depicts or promotes sexual violence, non-consensual sexual content, or explicit sexual content involving minors;</li>
          <li>Impersonates a student, faculty member, or college authority;</li>
          <li>Infringes copyrights, trademarks or other intellectual property (including pirated textbooks, papers or software);</li>
          <li>Constitutes spam, phishing, fraud, or deceptive commercial activity;</li>
          <li>Promotes illegal activity, including drugs, weapons or academic malpractice;</li>
          <li>Misuses anonymity to harass, stalk or threaten others.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Anonymity &amp; Accountability</h2>
        <p>
          Anonymity exists to protect speakers, not to shield abuse. We can and will identify anonymous authors
          to law enforcement when legally required, and we will remove anonymous content used to harass or
          threaten anyone.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Moderation &amp; Enforcement</h2>
        <ul>
          <li>Moderators review reported content and may remove or hide it;</li>
          <li>Repeat or serious violations lead to account suspension or termination;</li>
          <li>We may pre-emptively remove content that clearly violates these guidelines;</li>
          <li>Reported content that may constitute a crime (e.g., threats, child sexual abuse material) will be reported to the appropriate authorities.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>5. How to Report</h2>
        <p>
          Use the in-app report button on any post, or write to us via the{' '}
          <a href="/grievance">Grievance page</a>. We review reports and aim to respond within 15 days as
          required under Rule 3(2) of the IT Rules, 2021.
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Appeals</h2>
        <p>
          If you believe content was removed in error, or your account was suspended unfairly, you may appeal by
          contacting us via the <a href="/grievance">Grievance page</a> with the relevant details.
        </p>
      </section>
    </LegalLayout>
  );
}