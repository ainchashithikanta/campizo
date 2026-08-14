import type { Metadata } from 'next';
import '@web/styles/legal.css';
import { LegalLayout } from '@web/components/ui/Legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Disclaimer — Campizo'
};

export default function DisclaimerPage() {
  return (
    <LegalLayout kicker="Legal" title="Disclaimer" updated="14 August 2026">
      <div className="legal-note">
        <strong>Read this before relying on anything on Campizo.</strong> This disclaimer limits the
        responsibility of Campizo and its operators for user-generated content and third-party information.
      </div>

      <section className="legal-section">
        <h2>1. User-Generated Content</h2>
        <p>
          Confessions, comments, marketplace listings, study materials, placement experiences, professor
          ratings and other content are posted by users. Views expressed are those of the individual users and
          do not reflect the views of Campizo, its operators, or any college. Campizo does not endorse
          user-generated content and is not responsible for its accuracy, completeness or legality.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Anonymity</h2>
        <p>
          While confessions and reviews are displayed anonymously, anonymity is not a guarantee of absolute
          privacy. As explained in our <a href="/privacy">Privacy Policy</a>, we may disclose identifying
          information when legally required.
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Placement &amp; Career Information</h2>
        <p>
          Placement experiences, salary figures and company information shared by users are anecdotal and may be
          outdated or inaccurate. They are not official placement statistics. Consult official placement cell
          communications before making decisions.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Study Materials</h2>
        <p>
          Study materials are shared by students and may contain errors. Users are responsible for ensuring
          they have the right to share uploaded material. Campizo does not warrant the accuracy of materials
          and will remove infringing or inaccurate content on notification.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Marketplace Transactions</h2>
        <p>
          Campizo only provides a listing platform. All transactions are between the buyer and seller, and
          Campizo is not a party to them. We do not guarantee the condition, authenticity or availability of
          listed items, and are not responsible for any loss arising from transactions between users.
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Professor Ratings</h2>
        <p>
          Professor ratings are subjective student opinions. They are not official evaluations and should not be
          treated as definitive statements of fact. Faculty members may request removal or correction of
          inaccurate reviews via the <a href="/grievance">Grievance page</a>.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. No Professional Advice</h2>
        <p>
          Nothing on Campizo constitutes legal, financial, medical or professional advice. Always seek the
          advice of qualified professionals where appropriate.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. External Links</h2>
        <p>
          Campizo may link to external websites. We have no control over their content and accept no
          responsibility for them.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Liability</h2>
        <p>
          To the maximum extent permitted by law, Campizo, its operators and contributors disclaim all
          liability for any loss or damage arising from use of the platform or reliance on its content. See
          also the <a href="/terms">Terms of Service</a>.
        </p>
      </section>
    </LegalLayout>
  );
}