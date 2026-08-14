import type { Metadata } from 'next';
import '@web/styles/legal.css';
import { LegalLayout } from '@web/components/ui/Legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Grievance & Contact — Campizo'
};

export default function GrievancePage() {
  return (
    <LegalLayout kicker="Legal" title="Grievance, Contact & Legal Notices" updated="14 August 2026">
      <div className="legal-note">
        <strong>Complaint or grievance?</strong> Under the Information Technology (Intermediary Guidelines and
        Digital Media Ethics Code) Rules, 2021, we must resolve grievances within <strong>15 days</strong> of
        receipt. Please use the details below.
      </div>

      <section className="legal-section">
        <h2>1. Grievance Officer</h2>
        <p>
          For complaints about content, accounts, privacy or the platform generally, contact the Grievance
          Officer:
        </p>
        <ul>
          <li><strong>Name:</strong> [Grievance Officer Name — to be filled by the operator]</li>
          <li><strong>Email:</strong> <a href="mailto:grievance@campizo.app">grievance@campizo.app</a></li>
          <li><strong>Response time:</strong> within 15 days of receipt, as required by Rule 3(2) of the IT
          (Intermediary Guidelines) Rules, 2021.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>2. Nodal Contact Person</h2>
        <p>
          For coordination with law enforcement agencies and government authorities (Rule 3(2) of the IT Rules,
          2021):
        </p>
        <ul>
          <li><strong>Name:</strong> [Nodal Contact Name — to be filled by the operator]</li>
          <li><strong>Email:</strong> <a href="mailto:legal@campizo.app">legal@campizo.app</a></li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. How to File a Grievance</h2>
        <ol>
          <li>Send your complaint by email, including: your name, the specific content/URL, the issue, and why it violates our <a href="/guidelines">Community Guidelines</a> or the law.</li>
          <li>For takedown requests based on copyright, attach proof of ownership.</li>
          <li>We acknowledge receipt and respond within 15 days with our action taken.</li>
          <li>If you are dissatisfied with our response, you may approach the designated authority or courts in accordance with applicable law.</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>4. Copyright / DMCA-Style Takedown</h2>
        <p>
          If you believe content on Campizo infringes your copyright, please send a notice to the Grievance
          Officer with: identification of the infringing content (URL), identification of the copyrighted work,
          your contact details, and a statement of good faith belief. We act promptly on valid notices.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Law Enforcement &amp; Court Orders</h2>
        <p>
          We cooperate with lawful requests from law enforcement agencies, courts and the appropriate
          government authorities under the IT Act, 2000 and the IT Rules, 2021. Such requests should be
          directed to the Nodal Contact Person above.
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Privacy Inquiries</h2>
        <p>
          For data-protection matters (access, correction, erasure, consent withdrawal), see our{' '}
          <a href="/privacy">Privacy Policy</a> and contact the Grievance Officer above.
        </p>
      </section>
    </LegalLayout>
  );
}