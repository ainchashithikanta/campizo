'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ConfessionDTO, CommentDTO, ModerationCaseDTO } from '../../lib/api-confessions';

export function AnonymousIdentity({ pseudonym }: { pseudonym: string }) {
  return (
    <span className="conf-pseudonym" aria-label={`Anonymous pseudonym: ${pseudonym}`}>
      👤 {pseudonym}
    </span>
  );
}

export function TrendingBadge() {
  return <span className="conf-badge conf-badge-trending">🔥 Trending</span>;
}

export function HotBadge() {
  return <span className="conf-badge conf-badge-hot">⚡ Hot</span>;
}

export function VoteBar({
  upvotesCount,
  userVoteType,
  onVote
}: {
  upvotesCount: number;
  userVoteType?: 'UPVOTE' | 'DOWNVOTE' | null;
  onVote: (voteType: 'UPVOTE' | 'DOWNVOTE' | 'REMOVE') => void;
}) {
  return (
    <div className="conf-vote-bar" role="group" aria-label="Voting bar">
      <button
        className={`conf-btn-vote ${userVoteType === 'UPVOTE' ? 'voted-up' : ''}`}
        onClick={() => onVote(userVoteType === 'UPVOTE' ? 'REMOVE' : 'UPVOTE')}
        aria-label="Upvote confession"
      >
        ▲ {upvotesCount + (userVoteType === 'UPVOTE' ? 1 : 0)}
      </button>
      <button
        className={`conf-btn-vote ${userVoteType === 'DOWNVOTE' ? 'voted-down' : ''}`}
        onClick={() => onVote(userVoteType === 'DOWNVOTE' ? 'REMOVE' : 'DOWNVOTE')}
        aria-label="Downvote confession"
      >
        ▼
      </button>
    </div>
  );
}

export function BookmarkButton({ isBookmarked, onToggle }: { isBookmarked: boolean; onToggle: () => void }) {
  return (
    <button
      className="conf-action-btn"
      onClick={onToggle}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark confession'}
    >
      {isBookmarked ? '🔖 Saved' : '🔖 Bookmark'}
    </button>
  );
}

export function ReportButton({ onReport }: { onReport: () => void }) {
  return (
    <button className="conf-action-btn" onClick={onReport} aria-label="Report confession">
      🚩 Report
    </button>
  );
}

export function ConfessionCard({ confession }: { confession: ConfessionDTO }) {
  const isTrending = parseFloat(confession.rankScore) > 10;
  const isHot = confession.upvotesCount > 20;
  const [reaction, setReaction] = useState<string | null>(null);

  const reactions = [
    { emoji: '😂', label: 'Funny' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '🥺', label: 'Sad' },
    { emoji: '🔥', label: 'Hot' }
  ];

  const reactionCount = (index: number) =>
    (confession.upvotesCount + index * 7 + confession.commentsCount) % 19;

  return (
    <article className="conf-card">
      <div className="conf-card-header">
        <AnonymousIdentity pseudonym={confession.authorThreadPseudonym} />
        <div className="conf-badges">
          {isTrending && <TrendingBadge />}
          {isHot && <HotBadge />}
        </div>
      </div>
      <h3 className="conf-card-title">
        <Link href={`/confessions/${confession.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {confession.title}
        </Link>
      </h3>
      <p className="conf-card-content">{confession.content}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <VoteBar upvotesCount={confession.upvotesCount} onVote={(v) => console.log('Vote:', v)} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/confessions/${confession.id}`} className="conf-action-btn">
            💬 {confession.commentsCount}
          </Link>
          <BookmarkButton isBookmarked={false} onToggle={() => {}} />
        </div>
      </div>
      <div className="conf-reactions" role="group" aria-label="Reactions">
        {reactions.map((r, i) => (
          <button
            key={r.emoji}
            className={`conf-reaction-chip ${reaction === r.emoji ? 'conf-reaction-chip-active' : ''}`}
            onClick={() => setReaction(reaction === r.emoji ? null : r.emoji)}
            aria-label={`React with ${r.label}`}
          >
            <span aria-hidden="true">{r.emoji}</span>
            <span>{reactionCount(i) + (reaction === r.emoji ? 1 : 0)}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

export function FeedList({ confessions }: { confessions: ConfessionDTO[] }) {
  if (confessions.length === 0) {
    return <EmptyState message="No confessions found in this feed yet." />;
  }

  return (
    <div>
      {confessions.map((c) => (
        <ConfessionCard key={c.id} confession={c} />
      ))}
    </div>
  );
}

export function CharacterCounter({ current, max }: { current: number; max: number }) {
  const isWarning = current > max * 0.8;
  return (
    <div
      className="conf-char-counter"
      style={{ color: isWarning ? 'var(--conf-accent-warning)' : 'var(--conf-text-muted)' }}
    >
      {current} / {max} characters
    </div>
  );
}

export function PiiWarning({ detected }: { detected: boolean }) {
  if (!detected) return null;
  return (
    <div className="conf-pii-warning" role="alert">
      ⚠️ <strong>PII Warning:</strong> Phone numbers, email addresses, or social handles detected. Posting PII will
      trigger automated quarantine.
    </div>
  );
}

export function PublishProgress({ step }: { step: 'EDIT' | 'SCAN' | 'PUBLISHING' | 'COMPLETE' }) {
  return (
    <div style={{ margin: '1rem 0', color: 'var(--conf-text-secondary)', fontSize: '0.85rem' }}>
      Step: <strong>{step}</strong>
    </div>
  );
}

export function CreateWizard({
  onSubmit
}: {
  onSubmit: (title: string, content: string, category: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('confession');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasPii = /(?:\+91[\s-]?)?[6-9]\d{9}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|@[a-zA-Z0-9_]{3,}/.test(
    `${title} ${content}`
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setIsSubmitting(true);
    await onSubmit(title, content, category);
    setIsSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--conf-card-bg)',
        padding: '1.5rem',
        borderRadius: 'var(--conf-radius-md)',
        border: '1px solid var(--conf-border)'
      }}
    >
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Create Campus Confession</h2>

      <div className="conf-form-group">
        <label className="conf-label" htmlFor="conf-category">
          Category
        </label>
        <select
          id="conf-category"
          className="conf-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="confession">💭 Confession</option>
          <option value="crush">❤️ Crush</option>
          <option value="academic">🎓 Academic</option>
          <option value="funny">😂 Funny</option>
          <option value="rant">😤 Rant</option>
        </select>
      </div>

      <div className="conf-form-group">
        <label className="conf-label" htmlFor="conf-title">
          Title
        </label>
        <input
          id="conf-title"
          className="conf-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title (min 5 chars)"
          maxLength={256}
          required
        />
        <CharacterCounter current={title.length} max={256} />
      </div>

      <div className="conf-form-group">
        <label className="conf-label" htmlFor="conf-content">
          Confession Content
        </label>
        <textarea
          id="conf-content"
          className="conf-textarea"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts anonymously..."
          maxLength={1000}
          required
        />
        <CharacterCounter current={content.length} max={1000} />
      </div>

      <PiiWarning detected={hasPii} />

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '0.8rem',
          borderRadius: 'var(--conf-radius-sm)',
          background: 'var(--conf-accent-primary)',
          color: '#fff',
          border: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isSubmitting ? 'not-allowed' : 'pointer'
        }}
      >
        {isSubmitting ? 'Publishing...' : 'Publish Confession'}
      </button>
    </form>
  );
}

export function CommentItem({ comment }: { comment: CommentDTO }) {
  const depthClass = comment.depth <= 4 ? `depth-${comment.depth}` : 'depth-4';
  return (
    <div className={`conf-comment-item ${depthClass}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span className="conf-comment-pseudonym">{comment.authorThreadPseudonym}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--conf-text-muted)' }}>
          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="conf-comment-content">{comment.content}</p>
    </div>
  );
}

export function CommentTree({ comments }: { comments: CommentDTO[] }) {
  if (comments.length === 0) {
    return (
      <div style={{ color: 'var(--conf-text-muted)', fontSize: '0.9rem' }}>No replies yet. Be the first to reply!</div>
    );
  }

  return (
    <div className="conf-comment-tree">
      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--conf-text-secondary)' }}>Replies ({comments.length})</h4>
      {comments.map((c) => (
        <CommentItem key={c.id} comment={c} />
      ))}
    </div>
  );
}

export function ModerationCaseCard({ modCase }: { modCase: ModerationCaseDTO }) {
  return (
    <div className="conf-card">
      <div className="conf-card-header">
        <span className="conf-badge conf-badge-hot">Severity Level {modCase.severityLevel}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--conf-text-muted)' }}>Reports: {modCase.totalReports}</span>
      </div>
      <h4 style={{ margin: '0.5rem 0' }}>Case #{modCase.id.slice(0, 8)}</h4>
      <p style={{ color: 'var(--conf-text-secondary)', fontSize: '0.9rem' }}>Confession ID: {modCase.confessionId}</p>
      <p style={{ color: 'var(--conf-accent-info)', fontSize: '0.85rem' }}>Identity: 🔒 {modCase.authorIdentity}</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <Link href={`/confessions/moderation/${modCase.id}`} className="conf-nav-link active">
          Review Case
        </Link>
      </div>
    </div>
  );
}

export function NotificationCard({ title, body, date }: { title: string; body: string; date: string }) {
  return (
    <div className="conf-card">
      <h4 style={{ margin: '0 0 0.3rem 0', color: 'var(--conf-accent-primary)' }}>{title}</h4>
      <p style={{ margin: 0, color: 'var(--conf-text-secondary)', fontSize: '0.9rem' }}>{body}</p>
      <span style={{ fontSize: '0.75rem', color: 'var(--conf-text-muted)', marginTop: '0.5rem', display: 'block' }}>
        {date}
      </span>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div>
      <div className="conf-skeleton" style={{ width: '40%' }} />
      <div className="conf-skeleton" style={{ width: '100%', height: '80px' }} />
      <div className="conf-skeleton" style={{ width: '60%' }} />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="conf-empty-state">
      <div className="conf-empty-icon">💭</div>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="conf-pii-warning"
      style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--conf-accent-danger)', color: '#f87171' }}
    >
      🚨 <strong>Error:</strong> {message}
    </div>
  );
}

export function OfflineState() {
  return (
    <div
      className="conf-pii-warning"
      style={{
        background: 'rgba(100, 116, 139, 0.2)',
        borderColor: 'var(--conf-text-muted)',
        color: 'var(--conf-text-secondary)'
      }}
    >
      📡 <strong>Offline Mode:</strong> Showing cached campus confessions.
    </div>
  );
}
