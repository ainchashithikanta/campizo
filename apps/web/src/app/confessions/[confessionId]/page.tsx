'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import '../../../styles/confessions.css';
import { ConfessionsApiClient, ConfessionDetailDTO } from '../../../lib/api-confessions';
import {
  AnonymousIdentity,
  VoteBar,
  BookmarkButton,
  ReportButton,
  CommentTree,
  LoadingSkeleton,
  ErrorState
} from '../../../components/confessions/ConfessionComponents';

export default function ConfessionDetailPage({ params }: { params: Promise<{ confessionId: string }> }) {
  const resolvedParams = use(params);
  const confessionId = resolvedParams.confessionId;

  const [detail, setDetail] = useState<ConfessionDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const COLLEGE = 'college-nitk-003';

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      const res = await ConfessionsApiClient.fetchConfession(confessionId, COLLEGE);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        // Fallback detail for demonstration
        setDetail({
          confession: {
            id: confessionId,
            collegeId: COLLEGE,
            categoryCode: 'academic',
            title: 'CASIO FX-991ES+ Usage',
            slug: 'casio-fx-991es-usage',
            content: 'How to clear memory before entering exam hall? Press Shift + 9 + 3 + =',
            authorThreadPseudonym: 'Curious Panda #402',
            isAnonymous: true,
            status: 'PUBLISHED',
            upvotesCount: 42,
            commentsCount: 1,
            reportsCount: 0,
            rankScore: '15.5000',
            createdAt: new Date().toISOString()
          },
          comments: [
            {
              id: 'comm-1',
              collegeId: COLLEGE,
              confessionId,
              depth: 1,
              authorThreadPseudonym: 'Witty Owl #108',
              content: 'Also remember to select DEG mode before starting trigonometry calculations!',
              status: 'ACTIVE',
              upvotesCount: 5,
              createdAt: new Date().toISOString()
            }
          ],
          statistics: { totalViews: 120, totalUpvotes: 42, totalComments: 1, trendingScore: 15.5 },
          currentUserState: { hasBookmarked: false, userVoteType: null },
          relatedConfessions: []
        });
      }
      setLoading(false);
    }

    loadDetail();
  }, [confessionId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    const res = await ConfessionsApiClient.createComment(confessionId, COLLEGE, { content: newComment });
    if (res.success && res.data) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, res.data!]
            }
          : prev
      );
      setNewComment('');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="conf-container">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="conf-container">
        <ErrorState message="Confession not found." />
      </div>
    );
  }

  const { confession, comments } = detail;

  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions" className="conf-action-btn">
          ← Back
        </Link>
        <h1 className="conf-title">Confession</h1>
      </header>

      <article className="conf-card">
        <div className="conf-card-header">
          <AnonymousIdentity pseudonym={confession.authorThreadPseudonym} />
          <span style={{ fontSize: '0.8rem', color: 'var(--conf-text-muted)' }}>
            {new Date(confession.createdAt).toLocaleDateString()}
          </span>
        </div>
        <h2 className="conf-card-title">{confession.title}</h2>
        <p className="conf-card-content">{confession.content}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <VoteBar upvotesCount={confession.upvotesCount} onVote={() => {}} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <BookmarkButton isBookmarked={false} onToggle={() => {}} />
            <ReportButton onReport={() => {}} />
          </div>
        </div>
      </article>

      <form onSubmit={handleAddComment} style={{ margin: '1.5rem 0' }}>
        <div className="conf-form-group">
          <label className="conf-label" htmlFor="new-comment">
            Add Anonymous Reply
          </label>
          <textarea
            id="new-comment"
            className="conf-textarea"
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Reply anonymously to this thread..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="conf-nav-link active"
          style={{ border: 'none', cursor: 'pointer', padding: '0.6rem 1.2rem' }}
        >
          {isSubmitting ? 'Posting...' : 'Post Reply'}
        </button>
      </form>

      <CommentTree comments={comments} />
    </div>
  );
}
