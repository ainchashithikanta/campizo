import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ResourceCard,
  ResourceGrid,
  ResourceHero,
  HelpfulVote,
  ResourcePreview,
  UploadProgressCard
} from '../components/academic-resource-hub/AcademicComponents';

describe('Academic Resource Hub Frontend Components', () => {
  it('ResourceCard - should render resource title, type badge, and trigger download', () => {
    let downloadedId = '';
    const sample = {
      id: 'res-test-1',
      collegeId: 'c1',
      departmentId: 'd1',
      subjectId: 's1',
      resourceTypeId: 'type-pyq',
      uploaderUserId: 'u1',
      title: 'CS301 Data Structures PYQ 2023',
      slug: 'cs301-ds-pyq',
      academicYear: '2023-24',
      semesterNumber: 3,
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    };

    render(<ResourceCard resource={sample} onDownload={(id) => (downloadedId = id)} />);

    expect(screen.getByText('CS301 Data Structures PYQ 2023')).toBeDefined();
    expect(screen.getByText('pyq')).toBeDefined();

    const downloadBtn = screen.getByText('Download PDF');
    fireEvent.click(downloadBtn);
    expect(downloadedId).toBe('res-test-1');
  });

  it('ResourceGrid - should render empty state when resource array is empty', () => {
    render(<ResourceGrid resources={[]} />);
    expect(screen.getByText('No Academic Resources Found')).toBeDefined();
  });

  it('HelpfulVote - should render vote buttons and handle user click', () => {
    let votedState = false;
    render(<HelpfulVote resourceId="res-1" onVote={(isHelpful) => (votedState = isHelpful)} />);

    const helpfulBtn = screen.getByLabelText('Vote Helpful');
    fireEvent.click(helpfulBtn);
    expect(votedState).toBe(true);
  });

  it('ResourcePreview - should render document preview container and page count', () => {
    render(<ResourcePreview title="OS Notes" pageCount={15} />);
    expect(screen.getByText(/PDF Document Preview \(15 Pages\)/i)).toBeDefined();
  });

  it('UploadProgressCard - should render multi-step indicator', () => {
    render(<UploadProgressCard step={2} fileName="OS_Notes.pdf" virusScanStatus="CLEAN" />);
    expect(screen.getByText('OS_Notes.pdf')).toBeDefined();
    expect(screen.getByText('CLEAN')).toBeDefined();
  });
});
