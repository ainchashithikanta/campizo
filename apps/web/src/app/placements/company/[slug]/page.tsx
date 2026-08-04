/**
 * Placement Guidance — Company Detail Page
 * Route: /placements/company/[slug]
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CompanyHeader, PlacementCard, CompanyAISummaryCard } from '../../../../components/placements/placement-components';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../../components/connect/state-components';
import { fetchCompanyBySlug, type Company, type PlacementExperience, type SalaryInsight, type CompanyAISummary } from '../../../../lib/api-placement-guidance';

export default function CompanyDetailPage() {
  const params = useParams();
  const slug = String(params?.slug || 'google');

  const [company, setCompany] = useState<Company | null>(null);
  const [experiences, setExperiences] = useState<PlacementExperience[]>([]);
  const [salaryInsights, setSalaryInsights] = useState<SalaryInsight[]>([]);
  const [aiSummary, setAiSummary] = useState<CompanyAISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyBySlug(slug)
      .then((res) => {
        setCompany(res.company);
        setExperiences(res.experiences || []);
        setSalaryInsights(res.salaryInsights || []);
        if (res.aiSummary) setAiSummary(res.aiSummary);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `Failed to load company '${slug}'`);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <main className="max-w-4xl mx-auto p-6"><LoadingSkeleton count={2} /></main>;
  if (error) return <main className="max-w-4xl mx-auto p-6"><ErrorState message={error} /></main>;
  if (!company) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <CompanyHeader company={company} salaryInsights={salaryInsights} />

      {aiSummary && <CompanyAISummaryCard summary={aiSummary} />}

      <section>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Interview Experiences at {company.name} ({experiences.length})
        </h2>

        {experiences.length === 0 ? (
          <EmptyState title="No Experiences Posted Yet" description={`Be the first student to share an interview experience for ${company.name}!`} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {experiences.map((exp) => (
              <PlacementCard key={exp.id} experience={exp} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
