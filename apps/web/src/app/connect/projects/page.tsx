/**
 * Campus Connect — Project Teams Page
 * Route: /connect/projects
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ProjectCard } from '../../../components/connect/group-cards';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchProjectTeams, createProjectTeam, type ProjectTeamItem } from '../../../lib/api-campus-connect';

export default function ProjectTeamsPage() {
  const [projects, setProjects] = useState<ProjectTeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = () => {
    fetchProjectTeams()
      .then((res) => {
        setProjects(
          res || [
            {
              id: 'proj_101',
              title: 'TreeHacks AI Assistant Team',
              description: 'Seeking PyTorch & Next.js developers for 36-hour hackathon',
              status: 'OPEN'
            }
          ]
        );
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load projects');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      await createProjectTeam({ title, description });
      setShowModal(false);
      setTitle('');
      setDescription('');
      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Project & Hackathon Teams</h1>
          <p className="text-xs text-slate-500 mt-1">Form project teams with complementary technical skills.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          + Create Project Team
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Project Team</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description & Requirements
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white"
              >
                Publish Team
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <LoadingSkeleton count={2} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && projects.length === 0 && (
        <EmptyState title="No Project Teams Found" description="Create a project team to recruit teammates!" />
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onJoin={(id) => alert(`Applied to project ${id}`)} />
          ))}
        </div>
      )}
    </main>
  );
}
