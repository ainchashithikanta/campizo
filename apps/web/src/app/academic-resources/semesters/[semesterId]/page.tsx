'use client';

import React, { useState } from 'react';
import '../../../../styles/academic-resource-hub.css';
import { ResourceGrid } from '../../../../components/academic-resource-hub/AcademicComponents';
import type { AcademicResourceDTO } from '../../../../lib/api-academic-resource-hub';

export default function SemesterDashboardPage({ params }: { params: { semesterId: string } }) {
  const semNum = params.semesterId.replace(/[^0-9]/g, '') || '5';
  const [resources, setResources] = useState<AcademicResourceDTO[]>([
    {
      id: `res-sem-${semNum}-101`,
      collegeId: 'college-stanford-001',
      departmentId: 'dept-cse-001',
      subjectId: 'subject-os-501',
      resourceTypeId: 'type-notes',
      uploaderUserId: 'user-student-101',
      title: `Semester ${semNum} Operating Systems Notes`,
      slug: `sem-${semNum}-os-notes`,
      academicYear: '2023-24',
      semesterNumber: Number(semNum),
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    },
    {
      id: `res-sem-${semNum}-102`,
      collegeId: 'college-stanford-001',
      departmentId: 'dept-cse-001',
      subjectId: 'subject-algo-502',
      resourceTypeId: 'type-pyq',
      uploaderUserId: 'user-cr-102',
      title: `Semester ${semNum} Advanced Algorithms Solved PYQs`,
      slug: `sem-${semNum}-algo-pyqs`,
      academicYear: '2023-24',
      semesterNumber: Number(semNum),
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    }
  ]);

  return (
    <div className="arh-container">
      <div style={{ marginBottom: '24px' }}>
        <span className="arh-badge-clean" style={{ marginBottom: '8px', display: 'inline-block' }}>SEMESTER DASHBOARD</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ch-color-text)', marginBottom: '8px' }}>
          Semester {semNum} Exam Hub
        </h1>
        <p style={{ color: 'var(--ch-color-text-muted)' }}>
          All enrolled subjects, notes, PYQs, and revision kits for Semester {semNum}.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', border: '1px solid var(--ch-color-border)', borderRadius: 'var(--ch-radius-md)', backgroundColor: 'var(--ch-color-surface)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--ch-color-text-muted)', marginBottom: '4px' }}>Enrolled Subjects</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ch-color-primary)' }}>6 Subjects</p>
        </div>
        <div style={{ padding: '20px', border: '1px solid var(--ch-color-border)', borderRadius: 'var(--ch-radius-md)', backgroundColor: 'var(--ch-color-surface)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--ch-color-text-muted)', marginBottom: '4px' }}>Available Materials</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ch-color-success)' }}>28 Files</p>
        </div>
        <div style={{ padding: '20px', border: '1px solid var(--ch-color-border)', borderRadius: 'var(--ch-radius-md)', backgroundColor: 'var(--ch-color-surface)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--ch-color-text-muted)', marginBottom: '4px' }}>Exam Kit Status</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ch-color-warning)' }}>Ready</p>
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Semester {semNum} Materials</h2>
        <ResourceGrid resources={resources} />
      </section>
    </div>
  );
}
