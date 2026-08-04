'use client';

import React from 'react';
import '../../../styles/academic-resource-hub.css';
import { StudyCollectionCard } from '../../../components/academic-resource-hub/AcademicComponents';

export default function StudyCollectionsPage() {
  const sampleCollections = [
    {
      id: 'col-1',
      collegeId: 'c1',
      ownerUserId: 'u1',
      title: 'OS Exam Revision Kit',
      description: 'Handwritten notes + solved end-sem PYQs',
      isPublic: true
    },
    {
      id: 'col-2',
      collegeId: 'c1',
      ownerUserId: 'u1',
      title: 'Data Structures Lab Prep',
      description: 'Lab manual + C++ sample solutions',
      isPublic: true
    }
  ];

  return (
    <div className="arh-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Study Collections</h1>
          <p style={{ color: 'var(--ch-color-text-muted)' }}>
            Curated exam preparation packages built by Class Representatives.
          </p>
        </div>
        <button
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--ch-color-primary)',
            color: '#FFF',
            borderRadius: 'var(--ch-radius-md)',
            fontWeight: 600
          }}
        >
          + New Collection
        </button>
      </div>

      <div className="arh-grid">
        {sampleCollections.map((col) => (
          <StudyCollectionCard key={col.id} collection={col} />
        ))}
      </div>
    </div>
  );
}
