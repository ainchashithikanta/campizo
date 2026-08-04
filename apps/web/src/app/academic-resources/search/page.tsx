'use client';

import React, { useState } from 'react';
import '../../../styles/academic-resource-hub.css';
import { ResourceGrid } from '../../../components/academic-resource-hub/AcademicComponents';

export default function ResourceSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  return (
    <div className="arh-container">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '16px' }}>Search Study Materials</h1>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by subject, course, or title..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--ch-radius-md)', border: '1px solid var(--ch-color-border)' }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: 'var(--ch-radius-md)', border: '1px solid var(--ch-color-border)' }}
        >
          <option value="ALL">All Material Types</option>
          <option value="NOTES">Lecture Notes</option>
          <option value="PYQ">Question Papers</option>
          <option value="LAB">Lab Manuals</option>
        </select>
      </div>

      <ResourceGrid resources={[]} />
    </div>
  );
}
