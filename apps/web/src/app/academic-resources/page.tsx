'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '../../styles/academic-resource-hub.css';
import {
  ResourceHero,
  ResourceGrid,
  ContributorCard,
  StudyCollectionCard
} from '../../components/academic-resource-hub/AcademicComponents';
import type { AcademicResourceDTO } from '../../lib/api-academic-resource-hub';

export default function AcademicResourceHubHomePage() {
  const [resources, setResources] = useState<AcademicResourceDTO[]>([
    {
      id: 'res-sample-101',
      collegeId: 'college-nitk-003',
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
      collegeId: 'college-nitk-003',
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
        title="Study Materials"
        subtitle="Verified lecture notes, previous year question papers, lab manuals and syllabus copies — ready in under 10 seconds."
      />

      <div className="arh-toolbar">
        <Link href="/academic-resources/upload" className="arh-btn arh-btn-primary">
          + Upload Resource
        </Link>
        <Link href="/academic-resources/collections" className="arh-btn">
          📚 Study Collections
        </Link>
        <Link href="/academic-resources/bookmarks" className="arh-btn">
          ⭐ Saved Bookmarks
        </Link>
      </div>

      <section className="arh-section">
        <div className="arh-section-head">
          <h2>Trending Resources</h2>
          <span className="arh-section-meta">1.8k verified resources this semester</span>
        </div>
        <ResourceGrid resources={resources} />
      </section>
    </div>
  );
}
