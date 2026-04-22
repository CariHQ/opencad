import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
  replies: CommentReply[];
  elementId?: string;
}

interface CommentsPanelProps {
  initialComments?: Comment[];
  onAdd?: (comment: Omit<Comment, 'id' | 'replies' | 'resolved'>) => void;
  onResolve?: (commentId: string) => void;
  onReply?: (commentId: string, reply: Omit<CommentReply, 'id'>) => void;
  currentUser?: string;
}

export function CommentsPanel({
  initialComments = [],
  onAdd,
  onResolve,
  onReply,
  currentUser = 'You',
}: CommentsPanelProps = {}) {
  const { t } = useTranslation('panels');
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newText, setNewText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleAddComment = () => {
    const text = newText.trim();
    if (!text) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      author: currentUser,
      text,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };
    setComments((prev) => [...prev, comment]);
    onAdd?.({ author: currentUser, text, createdAt: comment.createdAt });
    setNewText('');
  };

  const handleResolve = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c))
    );
    onResolve?.(commentId);
  };

  const handleReply = (commentId: string) => {
    const text = (replyText[commentId] ?? '').trim();
    if (!text) return;
    const reply: CommentReply = {
      id: `r-${Date.now()}`,
      author: currentUser,
      text,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
      )
    );
    onReply?.(commentId, { author: currentUser, text, createdAt: reply.createdAt });
    setReplyText((prev) => ({ ...prev, [commentId]: '' }));
  };

  return (
    <div className="comments-panel">
      <div className="panel-header">
        <span className="panel-title">{t('comments.title')}</span>
        <span className="comment-count">{comments.length}</span>
      </div>

      {comments.length === 0 ? (
        <div className="comments-empty">{t('comments.emptyDetail', { defaultValue: 'No comments yet. Add one below.' })}</div>
      ) : (
        <div className="comments-list">
          {comments.map((c) => (
            <div key={c.id} className={`comment-item ${c.resolved ? 'resolved' : ''}`}>
              <div className="comment-header">
                <span className="comment-author">{c.author}</span>
                <span className="comment-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                {c.resolved && <span className="comment-badge resolved">{t('comments.resolved', { defaultValue: 'Resolved' })}</span>}
              </div>
              <p className="comment-text">{c.text}</p>
              <div className="comment-actions">
                {!c.resolved && (
                  <button
                    aria-label={t('comments.resolveAria', { id: c.id, defaultValue: 'Resolve comment {{id}}' })}
                    className="btn-resolve"
                    onClick={() => handleResolve(c.id)}
                  >
                    {t('comments.resolve', { defaultValue: 'Resolve' })}
                  </button>
                )}
              </div>
              {c.replies.length > 0 && (
                <div className="comment-replies">
                  {c.replies.map((r) => (
                    <div key={r.id} className="reply-item">
                      <span className="reply-author">{r.author}</span>
                      <span className="reply-text">{r.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="reply-input-row">
                <input
                  type="text"
                  placeholder={t('comments.replyPlaceholder', { defaultValue: 'Reply…' })}
                  value={replyText[c.id] ?? ''}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  className="reply-input"
                />
                <button onClick={() => handleReply(c.id)} className="btn-reply">{t('comments.reply', { defaultValue: 'Reply' })}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="new-comment-row">
        <input
          type="text"
          placeholder={t('comments.placeholder')}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="new-comment-input"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
        />
        <button
          aria-label={t('comments.addComment', { defaultValue: 'Add comment' })}
          className="btn-add-comment"
          onClick={handleAddComment}
        >
          {t('comments.post')}
        </button>
      </div>
    </div>
  );
}
