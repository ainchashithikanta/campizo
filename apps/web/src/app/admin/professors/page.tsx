'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

interface Department {
  id: string;
  name: string;
  shortName: string;
}

interface Professor {
  id: string;
  collegeId: string;
  departmentId: string;
  fullName: string;
  slug: string;
  designation: string;
  status: string;
  biography?: string;
  officialEmail?: string;
}

interface ProfessorForm {
  departmentId: string;
  fullName: string;
  slug: string;
  designation: string;
  biography: string;
  officialEmail: string;
}

const EMPTY_FORM: ProfessorForm = {
  departmentId: '',
  fullName: '',
  slug: '',
  designation: 'Assistant Professor',
  biography: '',
  officialEmail: ''
};

export default function AdminProfessorsPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [form, setForm] = useState<ProfessorForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/departments', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setDepartments(data.data);
      }
    } catch {
      // non-fatal: department filter stays empty
    }
  }, []);

  const loadProfessors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (departmentFilter) params.set('departmentId', departmentFilter);
      const res = await fetch(`/admin/api/professors?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setProfessors(data.data);
      } else {
        setError(data?.error?.message || 'Failed to load professors.');
      }
    } catch {
      setError('Network error loading professors.');
    } finally {
      setLoading(false);
    }
  }, [query, departmentFilter]);

  useEffect(() => {
    loadDepartments();
    loadProfessors();
  }, [loadDepartments, loadProfessors]);

  function slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, departmentId: departmentFilter || departments[0]?.id || '' });
    setShowForm(true);
  }

  function startEdit(p: Professor) {
    setEditingId(p.id);
    setForm({
      departmentId: p.departmentId,
      fullName: p.fullName,
      slug: p.slug,
      designation: p.designation,
      biography: p.biography || '',
      officialEmail: p.officialEmail || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const url = editingId ? `/admin/api/professors/${editingId}` : '/admin/api/professors';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(editingId ? 'Professor updated.' : `Professor "${form.fullName}" created.`);
        setShowForm(false);
        setForm(EMPTY_FORM);
        setEditingId(null);
        await loadProfessors();
      } else {
        setError(data?.error?.message || 'Failed to save professor.');
      }
    } catch {
      setError('Network error saving professor.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProfessor(id: string, name: string) {
    if (!window.confirm(`Delete professor "${name}"? This cannot be undone.`)) return;
    setActing(id);
    setNotice(null);
    try {
      const res = await fetch(`/admin/api/professors/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Professor "${name}" deleted.`);
        await loadProfessors();
      } else {
        setNotice(`Failed: ${data?.error?.message || 'Unknown error'}`);
      }
    } catch {
      setNotice('Network error deleting professor.');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="adx-page">
      <header className="adx-header">
        <div>
          <Link href="/admin/moderation" className="adx-back">
            ← Admin Console
          </Link>
          <p className="adx-kicker">NITK Faculty Directory · Department-wise</p>
          <h1 className="adx-title">👩‍🏫 Professor Management</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={loadProfessors} className="adx-logout" disabled={loading}>
            {loading ? 'Loading…' : '⟳ Refresh'}
          </button>
          <button onClick={startCreate} className="adx-btn">
            + Add Professor
          </button>
        </div>
      </header>

      {notice && <p className="adx-note">{notice}</p>}
      {error && (
        <p className="adl-error" role="alert">
          ⛔ {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={submitForm}
          className="adx-card"
          style={{ padding: '1.25rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}
        >
          <h3 style={{ margin: 0 }}>{editingId ? '✏️ Edit Professor' : '➕ Add Professor'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label>
              Full name *
              <input
                type="text"
                required
                value={form.fullName}
                placeholder="Dr. Alwyn Roshan Pais"
                onChange={(e) => {
                  const fullName = e.target.value;
                  setForm((f) => ({ ...f, fullName, slug: editingId ? f.slug : slugify(fullName) }));
                }}
                className="adx-input"
              />
            </label>
            <label>
              Designation *
              <select
                required
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className="adx-input"
              >
                <option>Professor</option>
                <option>Associate Professor</option>
                <option>Assistant Professor</option>
              </select>
            </label>
            <label>
              Department *
              <select
                required
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                className="adx-input"
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Slug
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="adx-input"
              />
            </label>
            <label>
              Official email
              <input
                type="email"
                value={form.officialEmail}
                placeholder="faculty@nitk.edu.in"
                onChange={(e) => setForm((f) => ({ ...f, officialEmail: e.target.value }))}
                className="adx-input"
              />
            </label>
          </div>
          <label>
            Biography
            <textarea
              rows={3}
              value={form.biography}
              onChange={(e) => setForm((f) => ({ ...f, biography: e.target.value }))}
              className="adx-input"
            />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="adx-btn" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create professor'}
            </button>
            <button
              type="button"
              className="adx-btn"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="adx-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            value={query}
            placeholder="Search by name…"
            onChange={(e) => setQuery(e.target.value)}
            className="adx-input"
            style={{ flex: 1, minWidth: '220px' }}
          />
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="adx-input">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="adx-card-kicker" style={{ alignSelf: 'center' }}>
            {professors.length} professors
          </span>
        </div>
      </div>

      {loading ? (
        <div className="adx-note">Loading professors…</div>
      ) : professors.length === 0 ? (
        <p className="adx-note">No professors found. Add the first one above.</p>
      ) : (
        <div className="adx-list">
          {professors.map((p) => {
            const dept = departments.find((d) => d.id === p.departmentId);
            return (
              <div className="adx-card" key={p.id} style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {p.fullName}{' '}
                      <span className="adx-card-kicker">{p.status === 'ACTIVE' ? '🟢 ACTIVE' : `🔴 ${p.status}`}</span>
                    </h3>
                    <p style={{ margin: '0.25rem 0', color: 'var(--adx-text-dim, #888)' }}>
                      {p.designation} · {dept ? dept.name : p.departmentId} · <code>{p.slug}</code>
                      {p.officialEmail ? ` · ${p.officialEmail}` : ''}
                    </p>
                    {p.biography && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>{p.biography}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startEdit(p)} className="adx-btn">
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteProfessor(p.id, p.fullName)}
                      disabled={acting === p.id}
                      className="adx-btn"
                    >
                      {acting === p.id ? 'Working…' : '🗑️ Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
