/**
 * Campus Connect — Main Landing & Overview Hub Page
 * Route: /connect
 */

import React from 'react';
import Link from 'next/link';

export default function ConnectHubPage() {
  const navLinks = [
    {
      title: 'Discover Students',
      href: '/connect/discover',
      desc: 'Find study pods and project collaborators',
      icon: '🔍'
    },
    {
      title: 'Recommendations',
      href: '/connect/recommendations',
      desc: 'AI-matched compatibility profiles',
      icon: '✨'
    },
    { title: 'My Network', href: '/connect/network', desc: 'Manage your campus connections and requests', icon: '👥' },
    { title: 'Messages', href: '/connect/messages', desc: 'Chat with contextual study pods and mentors', icon: '💬' },
    { title: 'Study Pods', href: '/connect/study', desc: 'Join or create course-based study groups', icon: '📚' },
    { title: 'Project Teams', href: '/connect/projects', desc: 'Build hackathon and course teams', icon: '🚀' },
    { title: 'Mentorship', href: '/connect/mentorship', desc: 'Peer-to-peer student mentorship', icon: '🎓' },
    { title: 'Activity Feed', href: '/connect/activity', desc: 'View campus activity log', icon: '⚡' },
    { title: 'Privacy Center', href: '/connect/privacy', desc: 'Manage ghost mode and incognito settings', icon: '🔒' }
  ];

  return (
    <main className="max-w-6xl mx-auto p-6 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Campus Connect Hub</h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect with student peers for study pods, hackathons, projects, and mentorship.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="text-3xl mb-3 block">{item.icon}</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                {item.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
            <div className="mt-4 pt-3 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Open Section →
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
