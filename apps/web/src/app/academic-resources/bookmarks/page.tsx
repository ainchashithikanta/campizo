'use client';

import React from 'react';
import '../../../styles/academic-resource-hub.css';
import { ResourceGrid } from '../../../components/academic-resource-hub/AcademicComponents';

export default function BookmarksPage() {
  return (
    <div className="arh-container">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '8px' }}>Saved Bookmarks</h1>
      <p style={{ color: 'var(--ch-color-text-muted)', marginBottom: '24px' }}>Quick offline access to your saved study materials.</p>
      <ResourceGrid resources={[]} />
    </div>
  );
}
