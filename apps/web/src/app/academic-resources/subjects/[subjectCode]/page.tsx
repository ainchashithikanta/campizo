'use client';

import React, { useState } from 'react';
import '../../../../styles/academic-resource-hub.css';
import { ResourceGrid } from '../../../../components/academic-resource-hub/AcademicComponents';
import type { AcademicResourceDTO } from '../../../../lib/api-academic-resource-hub';

export default function SubjectDashboardPage({ params }: { params: { subjectCode: string } }) {
  const [resources, setResources] = useState<AcademicResourceDTO[]>([
    {
      id: 'res-subj-101',
      collegeId: 'college-nitk-003',
      departmentId: 'dept-cse-001',
      subjectId: params.subjectCode,
      resourceTypeId: 'type-notes',
      uploaderUserId: 'user-student-101',
      title: `${params.subjectCode.toUpperCase()} Comprehensive Exam Revision Notes`,
      slug: `${params.subjectCode}-revision-notes`,
      academicYear: '2023-24',
      semesterNumber: 5,
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    },
    {
      id: 'res-subj-102',
      collegeId: 'college-nitk-003',
      departmentId: 'dept-cse-001',
      subjectId: params.subjectCode,
      resourceTypeId: 'type-pyq',
      uploaderUserId: 'user-cr-102',
      title: `${params.subjectCode.toUpperCase()} Mid-Sem & End-Sem Solved PYQs (2020-2023)`,
      slug: `${params.subjectCode}-solved-pyqs`,
      academicYear: '2023-24',
      semesterNumber: 5,
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    }
  ]);

  return (
    <div className="arh-container">
      <div style={{ marginBottom: '24px' }}>
        <span className="arh-badge-clean" style={{ marginBottom: '8px', display: 'inline-block' }}>
          SUBJECT DASHBOARD
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ch-color-text)', marginBottom: '8px' }}>
          {params.subjectCode.toUpperCase()} — Operating Systems
        </h1>
        <p style={{ color: 'var(--ch-color-text-muted)' }}>
          Curated study materials, past question papers, and lab code for {params.subjectCode.toUpperCase()}.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div
          style={{
            padding: '16px',
            border: '1px solid var(--ch-color-border)',
            borderRadius: 'var(--ch-radius-md)',
            backgroundColor: 'var(--ch-color-surface)'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--ch-color-text-muted)', fontWeight: 600 }}>
            TOTAL MATERIALS
          </span>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ch-color-primary)' }}>{resources.length}</p>
        </div>
        <div
          style={{
            padding: '16px',
            border: '1px solid var(--ch-color-border)',
            borderRadius: 'var(--ch-radius-md)',
            backgroundColor: 'var(--ch-color-surface)'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--ch-color-text-muted)', fontWeight: 600 }}>
            TOTAL DOWNLOADS
          </span>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ch-color-success)' }}>1,482</p>
        </div>
        <div
          style={{
            padding: '16px',
            border: '1px solid var(--ch-color-border)',
            borderRadius: 'var(--ch-radius-md)',
            backgroundColor: 'var(--ch-color-surface)'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--ch-color-text-muted)', fontWeight: 600 }}>
            AVG QUALITY SCORE
          </span>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ch-color-warning)' }}>⭐ 4.9</p>
        </div>
        <div
          style={{
            padding: '16px',
            border: '1px solid var(--ch-color-border)',
            borderRadius: 'var(--ch-radius-md)',
            backgroundColor: 'var(--ch-color-surface)'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--ch-color-text-muted)', fontWeight: 600 }}>
            TOP CONTRIBUTOR
          </span>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ch-color-text)' }}>Class Representative</p>
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Subject Study Materials</h2>
        <ResourceGrid resources={resources} />
      </section>
    </div>
  );
}
