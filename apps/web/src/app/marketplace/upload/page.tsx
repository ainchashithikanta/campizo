'use client';

import React, { useState } from 'react';
import '@web/styles/marketplace.css';

export type PipelineStage =
  'IDLE' | 'UPLOADING' | 'VIRUS_SCAN' | 'IMAGE_OPTIMIZATION' | 'METADATA_EXTRACTION' | 'READY';

export default function MarketplaceUploadPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('900');
  const [location, setLocation] = useState('Hostel Block 4');
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('IDLE');

  const handleNext = () => {
    if (step === 3) {
      setPipelineStage('UPLOADING');
      setTimeout(() => setPipelineStage('VIRUS_SCAN'), 500);
      setTimeout(() => setPipelineStage('IMAGE_OPTIMIZATION'), 1000);
      setTimeout(() => setPipelineStage('METADATA_EXTRACTION'), 1500);
      setTimeout(() => {
        setPipelineStage('READY');
        setStep(4);
      }, 2000);
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="mp-container" style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>+ Post Campus Listing</h1>
      <p style={{ color: 'var(--mp-color-slate-500)', marginBottom: '2rem' }}>
        Step {step} of 4 — Sell or giveaway gear to verified campus peers.
      </p>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Listing Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CASIO FX-991ES+ Scientific Calculator"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--mp-radius-md)',
                border: '1px solid var(--mp-color-slate-300)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Item Category</label>
            <select
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--mp-radius-md)',
                border: '1px solid var(--mp-color-slate-300)'
              }}
            >
              <option value="calculators">⚡ Scientific Calculators</option>
              <option value="textbooks">📚 Textbooks & Study Material</option>
              <option value="cycles">🚲 Bicycles & Helmets</option>
              <option value="hostel">🛏️ Hostel Essentials</option>
            </select>
          </div>

          <button onClick={handleNext} className="mp-btn mp-btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Next: Pricing & Condition ➔
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Asking Price (₹)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--mp-radius-md)',
                border: '1px solid var(--mp-color-slate-300)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Item Condition</label>
            <select
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--mp-radius-md)',
                border: '1px solid var(--mp-color-slate-300)'
              }}
            >
              <option value="LIKE_NEW">Like New (Flawless)</option>
              <option value="BRAND_NEW">Brand New (Unopened)</option>
              <option value="GOOD">Good (Minor wear)</option>
              <option value="FAIR">Fair (Functional)</option>
            </select>
          </div>

          <button onClick={handleNext} className="mp-btn mp-btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Next: Campus Location ➔
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Campus Pickup Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hostel Block 4 / Central Library Gate"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--mp-radius-md)',
                border: '1px solid var(--mp-color-slate-300)'
              }}
            />
          </div>

          {pipelineStage !== 'IDLE' && (
            <div
              className="mp-reservation-banner"
              style={{ backgroundColor: '#eff6ff', borderColor: '#3b82f6', color: '#1e40af' }}
            >
              <span>🔄</span>
              <div>
                <strong>Backend Processing Stage: {pipelineStage}</strong>
                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {pipelineStage === 'UPLOADING' && '1. Uploading media directly to S3 storage...'}
                  {pipelineStage === 'VIRUS_SCAN' && '2. VirusScanWorker inspecting file binaries...'}
                  {pipelineStage === 'IMAGE_OPTIMIZATION' &&
                    '3. Generating WebP variants (Thumbnail, Small, Medium, Large)...'}
                  {pipelineStage === 'METADATA_EXTRACTION' && '4. Extracting image dimensions & EXIF metadata...'}
                  {pipelineStage === 'READY' && '5. All workers cleared! Ready to publish live.'}
                </div>
              </div>
            </div>
          )}

          <button onClick={handleNext} className="mp-btn mp-btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {pipelineStage === 'IDLE' ? 'Submit & Process Listing 🚀' : 'Processing Pipeline...'}
          </button>
        </div>
      )}

      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <span style={{ fontSize: '3rem' }}>🎉</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0 0.5rem 0' }}>Listing Published Live!</h2>
          <p style={{ color: 'var(--mp-color-slate-500)', marginBottom: '1.5rem' }}>
            Your item is now discoverable by verified students across campus.
          </p>
          <a href="/marketplace" className="mp-btn mp-btn-primary">
            Return to Marketplace Feed
          </a>
        </div>
      )}
    </div>
  );
}
