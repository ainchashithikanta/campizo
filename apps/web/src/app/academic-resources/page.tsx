'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '../../styles/academic-resource-hub.css';
import { ResourceHero, ResourceGrid, ContributorCard, StudyCollectionCard } from '../../components/academic-resource-hub/AcademicComponents';
import type { AcademicResourceDTO } from '../../lib/api-academic-resource-hub';

export default function AcademicResourceHubHomePage() {
  const [resources, setResources] = useState<AcademicResourceDTO[]>([
    {
      id: 'res-sample-101',
      collegeId: 'college-stanford-001',
      departmentId: 'dept-cse-001',
      subjectId: 'subject-os-501',
      resourceTypeId: 'type-notes',
      uploaderUserId: 'user-student-101',
      title: 'CS501 Operating Systems Complete Lecture Notes',
      slug: 'cs501-os-notes',
      academicYear: '2023-24',
      semesterNumber: 5,
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    },
    {
      id: 'res-sample-102',
      collegeId: 'college-stanford-001',
      departmentId: 'dept-cse-001',
      subjectId: 'subject-algo-301',
      resourceTypeId: 'type-pyq',
      uploaderUserId: 'user-cr-102',
      title: 'Design & Analysis of Algorithms 2023 End-Sem PYQ',
      slug: 'daa-2023-pyq',
      academicYear: '2023-24',
      semesterNumber: 4,
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    }
  ]);

  return (
    <div className="arh-container">
      <ResourceHero
        title="Academic Resource Hub"
        subtitle="Find verified lecture notes, previous year question papers, lab manuals, and syllabus copies in under 10 seconds."
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link href="/academic-resources/upload" style={{ padding: '12px 20px', backgroundColor: 'var(--ch-color-primary)', color: '#FFF', borderRadius: 'var(--ch-radius-md)', fontWeight: 600 }}>
          + Upload Resource
        </Link>
        <Link href="/academic-resources/collections" style={{ padding: '12px 20px', backgroundColor: 'var(--ch-color-surface)', color: 'var(--ch-color-text)', border: '1px solid var(--ch-color-border)', borderRadius: 'var(--ch-radius-md)', fontWeight: 600 }}>
          📚 Study Collections
        </Link>
        <Link href="/academic-resources/bookmarks" style={{ padding: '12px 20px', backgroundColor: 'var(--ch-color-surface)', color: 'var(--ch-color-text)', border: '1px solid var(--ch-color-border)', borderRadius: 'var(--ch-radius-md)', fontWeight: 600 }}>
          ⭐ Saved Bookmarks
        </Link>
      </div>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ch-color-text)', marginBottom: '16px' }}>Trending Resources</h2>
        <ResourceGrid resources={resources} />
      </section>
    </div>
  );
}
