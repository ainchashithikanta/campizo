'use client';

import React, { useState } from 'react';
import '../../../styles/academic-resource-hub.css';
import { UploadProgressCard } from '../../../components/academic-resource-hub/AcademicComponents';

export default function ResourceUploadPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('dept-cse-001');
  const [subjectId, setSubjectId] = useState('subject-os-501');
  const [resourceTypeId, setResourceTypeId] = useState('type-notes');
  const [academicYear, setAcademicYear] = useState('2023-24');
  const [semesterNumber, setSemesterNumber] = useState(5);
  const [fileName, setFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState('IDLE');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setUploadStatus('UPLOADING');
      setStep(2);

      setTimeout(() => {
        setUploadStatus('VIRUS_SCANNING');
        setStep(3);
      }, 1000);

      setTimeout(() => {
        setUploadStatus('CLEAN');
        setStep(4);
      }, 2000);
    }
  };

  return (
    <div className="arh-container">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--ch-color-text)', marginBottom: '8px' }}>Upload Study Material</h1>
      <p style={{ color: 'var(--ch-color-text-muted)', marginBottom: '24px' }}>Help fellow students by sharing verified lecture notes, PYQs, and lab manuals.</p>

      <UploadProgressCard step={step} fileName={fileName} virusScanStatus={uploadStatus} />

      {step === 1 && (
        <form onSubmit={handleStep1} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS501 Operating Systems Complete Lecture Notes"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--ch-radius-md)', border: '1px solid var(--ch-color-border)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--ch-radius-md)', border: '1px solid var(--ch-color-border)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Semester Number</label>
              <input
                type="number"
                value={semesterNumber}
                onChange={(e) => setSemesterNumber(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--ch-radius-md)', border: '1px solid var(--ch-color-border)' }}
              />
            </div>
          </div>

          <button type="submit" style={{ padding: '12px 24px', backgroundColor: 'var(--ch-color-primary)', color: '#FFF', borderRadius: 'var(--ch-radius-md)', fontWeight: 600, alignSelf: 'flex-start' }}>
            Next: Select File →
          </button>
        </form>
      )}

      {step >= 2 && (
        <div style={{ marginTop: '24px', border: '2px dashed var(--ch-color-border)', borderRadius: 'var(--ch-radius-md)', padding: '48px', textAlign: 'center', backgroundColor: 'var(--ch-color-surface)' }}>
          {step === 2 && (
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>Choose PDF File to Upload</p>
              <input type="file" accept=".pdf" onChange={handleFileSelect} aria-label="Upload PDF" />
            </div>
          )}
          {step === 3 && <p style={{ fontWeight: 600, color: 'var(--ch-color-warning)' }}>Scanning file for malware and integrity verification...</p>}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ch-color-success)', marginBottom: '8px' }}>🎉 Upload Completed & Published Successfully!</h3>
              <p style={{ color: 'var(--ch-color-text-muted)' }}>Your file is now live for all students in your college.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
