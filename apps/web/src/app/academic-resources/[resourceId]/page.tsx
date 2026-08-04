'use client';

import React, { useState } from 'react';
import '../../../styles/academic-resource-hub.css';
import { ResourcePreview, HelpfulVote } from '../../../components/academic-resource-hub/AcademicComponents';

export default function ResourceDetailPage({ params }: { params: { resourceId: string } }) {
  const [downloadCount, setDownloadCount] = useState(142);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleDownload = () => {
    setDownloadCount(downloadCount + 1);
    alert('Pre-signed download link generated. Download starting...');
  };

  const handleVote = (isHelpful: boolean) => {
    alert(isHelpful ? 'Vote recorded! Thank you for feedback.' : 'Feedback recorded.');
  };

  return (
    <div className="arh-container">
      <div style={{ marginBottom: '24px' }}>
        <span className="arh-badge-clean" style={{ marginBottom: '8px', display: 'inline-block' }}>VERIFIED RESOURCE</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ch-color-text)', marginBottom: '8px' }}>
          CS501 Operating Systems Complete Lecture Notes
        </h1>
        <p style={{ color: 'var(--ch-color-text-muted)' }}>Semester 5 • Academic Year 2023-24 • Computer Science & Engineering</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div>
          <ResourcePreview title="CS501 Operating Systems Complete Lecture Notes" pageCount={12} />
          <div style={{ marginTop: '16px' }}>
            <HelpfulVote resourceId={params.resourceId} onVote={handleVote} />
          </div>
        </div>

        <div style={{ border: '1px solid var(--ch-color-border)', borderRadius: 'var(--ch-radius-md)', padding: '24px', backgroundColor: 'var(--ch-color-surface)', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Resource Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', fontSize: '0.875rem' }}>
            <div><strong>File Size:</strong> 2.4 MB</div>
            <div><strong>Format:</strong> PDF Document</div>
            <div><strong>Total Downloads:</strong> {downloadCount}</div>
            <div><strong>Quality Score:</strong> ⭐ 4.8 / 5.0</div>
            <div><strong>Uploaded By:</strong> Verified Student</div>
          </div>

          <button
            onClick={handleDownload}
            style={{ width: '100%', padding: '14px', backgroundColor: 'var(--ch-color-primary)', color: '#FFF', borderRadius: 'var(--ch-radius-md)', fontWeight: 600, marginBottom: '12px' }}
          >
            Download Full PDF
          </button>

          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', border: '1px solid var(--ch-color-border)', color: 'var(--ch-color-text)', borderRadius: 'var(--ch-radius-md)', fontWeight: 600 }}
          >
            {isBookmarked ? '★ Saved in Bookmarks' : '☆ Save to Bookmarks'}
          </button>
        </div>
      </div>
    </div>
  );
}
