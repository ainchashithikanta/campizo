/**
 * Campus Connect — Student Profile Page
 * Route: /connect/profile
 * Academic-first design displaying courses, skills, interests, active intents & projects. NEVER exposes TrustScore.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ProfileHero } from '../../../components/connect/student-card';
import { LoadingSkeleton, ErrorState } from '../../../components/connect/state-components';
import { fetchMyProfile, type StudentProfile } from '../../../lib/api-campus-connect';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        setProfile(
          data || {
            id: 'usr_me',
            userId: 'usr_me',
            collegeId: 'college_campus_001',
            fullName: 'Alex Rivera',
            bio: 'CS & AI Senior passionate about distributed systems and machine learning.',
            major: 'Computer Science',
            classYear: 2026,
            skills: ['TypeScript', 'Python', 'PyTorch', 'Next.js', 'Fastify'],
            interests: ['Artificial Intelligence', 'Competitive Programming', 'Robotics'],
            courses: ['CS224N', 'CS246', 'CS106B'],
            clubs: ['TreeHacks Org', 'AI Society'],
            isGhostMode: false
          }
        );
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <main className="max-w-4xl mx-auto p-6">
        <LoadingSkeleton count={2} />
      </main>
    );
  if (error)
    return (
      <main className="max-w-4xl mx-auto p-6">
        <ErrorState message={error} />
      </main>
    );
  if (!profile) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <ProfileHero profile={profile} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Enrolled Courses</h2>
          <div className="flex flex-wrap gap-2">
            {profile.courses.map((c) => (
              <span
                key={c}
                className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              >
                {c}
              </span>
            ))}
          </div>
        </section>

        <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Skills & Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Interests & Academic Focus</h2>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                {i}
              </span>
            ))}
          </div>
        </section>

        <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Campus Clubs & Orgs</h2>
          <div className="flex flex-wrap gap-2">
            {profile.clubs.map((cl) => (
              <span
                key={cl}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400"
              >
                {cl}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
