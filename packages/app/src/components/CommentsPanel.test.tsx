import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CommentsPanel, type Comment } from './CommentsPanel';

describe('T-COL-011: CommentsPanel', () => {
  const onAdd = vi.fn();
  const onResolve = vi.fn();
  const onReply = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const comments: Comment[] = [
    {
      id: 'c1',
      author: 'Alice',
      text: 'Check this wall thickness',
      createdAt: new Date('2024-01-15').toISOString(),
      resolved: false,
      replies: [],
      elementId: 'el-1',
    },
    {
      id: 'c2',
      author: 'Bob',
      text: 'Window needs updating',
      createdAt: new Date('2024-01-16').toISOString(),
      resolved: true,
      replies: [
        { id: 'r1', author: 'Alice', text: 'Fixed!', createdAt: new Date('2024-01-17').toISOString() },
      ],
      elementId: 'el-2',
    },
  ];

  it('renders Comments header', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getByText(/comments/i)).toBeInTheDocument();
  });

  it('shows comment text', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getByText('Check this wall thickness')).toBeInTheDocument();
  });

  it('shows author name', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows resolved badge for resolved comments', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
  });

  it('shows Resolve button for unresolved comments', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });

  it('calls onResolve when Resolve clicked', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    expect(onResolve).toHaveBeenCalledWith('c1');
  });

  it('shows replies under a comment', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getByText('Fixed!')).toBeInTheDocument();
  });

  it('has a text input for new comment', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
  });

  it('calls onAdd when submitting new comment', () => {
    render(<CommentsPanel initialComments={comments} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    const input = screen.getByPlaceholderText(/add a comment/i);
    fireEvent.change(input, { target: { value: 'New comment' } });
    fireEvent.click(screen.getByRole('button', { name: /post|submit|add comment/i }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ text: 'New comment' }));
  });

  it('shows empty state when no comments', () => {
    render(<CommentsPanel initialComments={[]} onAdd={onAdd} onResolve={onResolve} onReply={onReply} />);
    expect(screen.getByText(/no comments/i)).toBeInTheDocument();
  });
});
