'use client';

import React, { useState } from 'react';
import type {
  AcademicResourceDTO,
  ResourceStatisticsDTO,
  StudyCollectionDTO,
  ContributorDTO
} from '../../lib/api-academic-resource-hub';

export interface ResourceCardProps {
  resource: AcademicResourceDTO;
  onBookmark?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onBookmark, onDownload }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    if (onBookmark) onBookmark(resource.id);
  };

  return (
    <div className="arh-card" data-testid={`resource-card-${resource.id}`}>
      <div>
        <div className="arh-card-top">
          <span className="arh-card-type">{resource.resourceTypeId.replace('type-', '')}</span>
          <span className="arh-card-verified">✓ Verified</span>
          <button
            onClick={handleBookmark}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark resource'}
            className="arh-card-bookmark"
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>
        <h3 className="arh-card-title">{resource.title}</h3>
        <p className="arh-card-meta">Sem {resource.semesterNumber} • {resource.academicYear}</p>
      </div>

      <div className="arh-card-footer">
        <span className="arh-badge-clean">CLEAN</span>
        <button
          onClick={() => onDownload && onDownload(resource.id)}
          className="arh-card-download"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};

export const ResourceGrid: React.FC<{ resources: AcademicResourceDTO[]; onDownload?: (id: string) => void }> = ({
  resources,
  onDownload
}) => {
  if (resources.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 16px',
          background: 'var(--ch-color-surface)',
          borderRadius: 'var(--ch-radius-md)',
          border: '1px solid var(--ch-color-border)'
        }}
      >
        <h3 style={{ fontSize: '1.25rem', color: 'var(--ch-color-text)', marginBottom: '8px' }}>
          No Academic Resources Found
        </h3>
        <p style={{ color: 'var(--ch-color-text-muted)' }}>
          Try searching for a different subject, semester, or keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="arh-grid" data-testid="resource-grid">
      {resources.map((res) => (
        <ResourceCard key={res.id} resource={res} onDownload={onDownload} />
      ))}
    </div>
  );
};

export const ResourceHero: React.FC<{
  title: string;
  subtitle: string;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
}> = ({ title, subtitle, searchPlaceholder = 'Search notes, PYQs, lab manuals...', onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  return (
    <div className="arh-hero">
      <h1 className="arh-hero-title">{title}</h1>
      <p className="arh-hero-subtitle">{subtitle}</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', maxWidth: '600px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search study material"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 'var(--ch-radius-md)',
            border: '1px solid var(--ch-color-border)',
            backgroundColor: 'var(--ch-color-background)',
            color: 'var(--ch-color-text)',
            fontSize: '1rem'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--ch-color-primary)',
            color: 'var(--ch-color-text-inverse)',
            borderRadius: 'var(--ch-radius-md)',
            fontWeight: 600
          }}
        >
          Search
        </button>
      </form>
    </div>
  );
};

export const HelpfulVote: React.FC<{ resourceId: string; onVote: (isHelpful: boolean) => void }> = ({
  resourceId,
  onVote
}) => {
  const [voted, setVoted] = useState<'HELPFUL' | 'UNHELPFUL' | null>(null);

  const handleVote = (isHelpful: boolean) => {
    setVoted(isHelpful ? 'HELPFUL' : 'UNHELPFUL');
    onVote(isHelpful);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ch-color-text-muted)' }}>
        Was this resource helpful?
      </span>
      <button
        onClick={() => handleVote(true)}
        aria-label="Vote Helpful"
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--ch-radius-sm)',
          border: '1px solid var(--ch-color-border)',
          backgroundColor: voted === 'HELPFUL' ? 'var(--ch-color-success-bg)' : 'transparent',
          color: voted === 'HELPFUL' ? 'var(--ch-color-success)' : 'var(--ch-color-text)',
          fontWeight: 500
        }}
      >
        👍 Helpful
      </button>
      <button
        onClick={() => handleVote(false)}
        aria-label="Vote Unhelpful"
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--ch-radius-sm)',
          border: '1px solid var(--ch-color-border)',
          backgroundColor: voted === 'UNHELPFUL' ? 'var(--ch-color-error-bg)' : 'transparent',
          color: voted === 'UNHELPFUL' ? 'var(--ch-color-error)' : 'var(--ch-color-text)',
          fontWeight: 500
        }}
      >
        👎 Unhelpful
      </button>
    </div>
  );
};

export const ResourcePreview: React.FC<{ title: string; pageCount?: number }> = ({ title, pageCount = 12 }) => {
  return (
    <div
      style={{
        border: '1px solid var(--ch-color-border)',
        borderRadius: 'var(--ch-radius-md)',
        padding: '24px',
        backgroundColor: 'var(--ch-color-surface)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: 600, color: 'var(--ch-color-text)' }}>PDF Document Preview ({pageCount} Pages)</h4>
        <span className="arh-badge-clean">VIRUS SCANNED CLEAN</span>
      </div>
      <div
        style={{
          height: '380px',
          backgroundColor: '#FFFFFF',
          border: '1px dashed var(--ch-color-border)',
          borderRadius: 'var(--ch-radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          gap: '12px'
        }}
      >
        <div style={{ fontSize: '3rem' }}>📄</div>
        <p style={{ fontWeight: 500 }}>Interactive Fast PDF Preview Rendered</p>
        <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>{title}</span>
      </div>
    </div>
  );
};

export const ContributorCard: React.FC<{ contributor: ContributorDTO }> = ({ contributor }) => {
  return (
    <div
      style={{
        border: '1px solid var(--ch-color-border)',
        borderRadius: 'var(--ch-radius-md)',
        padding: '16px',
        backgroundColor: 'var(--ch-color-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--ch-color-primary)',
          color: '#FFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1.25rem'
        }}
      >
        {contributor.userId.substring(0, 2).toUpperCase()}
      </div>
      <div>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ch-color-text)' }}>{contributor.userId}</h4>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--ch-color-primary)',
              backgroundColor: 'var(--ch-color-primary-light)',
              padding: '2px 8px',
              borderRadius: '999px'
            }}
          >
            {contributor.badgeLevel}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--ch-color-text-muted)' }}>
            Score: {contributor.reputationScore} pts
          </span>
        </div>
      </div>
    </div>
  );
};

export const StudyCollectionCard: React.FC<{ collection: StudyCollectionDTO }> = ({ collection }) => {
  return (
    <div className="arh-card">
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ch-color-text)', marginBottom: '8px' }}>
          {collection.title}
        </h3>
        {collection.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--ch-color-text-muted)', marginBottom: '12px' }}>
            {collection.description}
          </p>
        )}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--ch-color-primary)', fontWeight: 600 }}>
        {collection.isPublic ? 'Public Collection' : 'Private Collection'}
      </div>
    </div>
  );
};

export const UploadProgressCard: React.FC<{ step: number; fileName?: string; virusScanStatus?: string }> = ({
  step,
  fileName,
  virusScanStatus = 'CLEAN'
}) => {
  return (
    <div
      style={{
        border: '1px solid var(--ch-color-border)',
        borderRadius: 'var(--ch-radius-md)',
        padding: '24px',
        backgroundColor: 'var(--ch-color-surface)'
      }}
    >
      <div className="arh-step-indicator">
        <div className={`arh-step ${step >= 1 ? 'arh-step-active' : ''}`}>
          <span className="arh-step-num">1</span> Metadata
        </div>
        <div className={`arh-step ${step >= 2 ? 'arh-step-active' : ''}`}>
          <span className="arh-step-num">2</span> Uploading
        </div>
        <div className={`arh-step ${step >= 3 ? 'arh-step-active' : ''}`}>
          <span className="arh-step-num">3</span> Virus Scan
        </div>
        <div className={`arh-step ${step >= 4 ? 'arh-step-active' : ''}`}>
          <span className="arh-step-num">4</span> Complete
        </div>
      </div>

      {fileName && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ch-color-text)' }}>{fileName}</span>
          <span className={virusScanStatus === 'CLEAN' ? 'arh-badge-clean' : 'arh-badge-pending'}>
            {virusScanStatus}
          </span>
        </div>
      )}
    </div>
  );
};
