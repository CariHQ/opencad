import React, { useState } from 'react';

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
  comments: Comment[];
  onAdd: (comment: Omit<Comment, 'id' | 'replies' | 'resolved'>) => void;
  onResolve: (commentId: string) => void;
  onReply: (commentId: string, reply: Omit<CommentReply, 'id'>) => void;
  currentUser?: string;
}

export function CommentsPanel({ comments, onAdd, onResolve, onReply, currentUser = 'You' }: CommentsPanelProps) {
  const [newText, setNewText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleAddComment = () => {
    const text = newText.trim();
    if (!text) return;
    onAdd({ author: currentUser, text, createdAt: new Date().toISOString() });
    setNewText('');
  };

  const handleReply = (commentId: string) => {
    const text = (replyText[commentId] ?? '').trim();
    if (!text) return;
    onReply(commentId, { author: currentUser, text, createdAt: new Date().toISOString() });
    setReplyText((prev) => ({ ...prev, [commentId]: '' }));
  };

  return (
    <div className="comments-panel">
      <div className="panel-header">
        <span className="panel-title">Comments</span>
        <span className="comment-count">{comments.length}</span>
      </div>

      {comments.length === 0 ? (
        <div className="comments-empty">No comments yet. Add one below.</div>
      ) : (
        <div className="comments-list">
          {comments.map((c) => (
            <div key={c.id} className={`comment-item ${c.resolved ? 'resolved' : ''}`}>
              <div className="comment-header">
                <span className="comment-author">{c.author}</span>
                <span className="comment-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                {c.resolved && <span className="comment-badge resolved">Resolved</span>}
              </div>
              <p className="comment-text">{c.text}</p>
              <div className="comment-actions">
                {!c.resolved && (
                  <button
                    aria-label={`Resolve comment ${c.id}`}
                    className="btn-resolve"
                    onClick={() => onResolve(c.id)}
                  >
                    Resolve
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
                  placeholder="Reply…"
                  value={replyText[c.id] ?? ''}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  className="reply-input"
                />
                <button onClick={() => handleReply(c.id)} className="btn-reply">Reply</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="new-comment-row">
        <input
          type="text"
          placeholder="Add a comment…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="new-comment-input"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
        />
        <button
          aria-label="Add comment"
          className="btn-add-comment"
          onClick={handleAddComment}
        >
          Post
        </button>
      </div>
    </div>
  );
}
