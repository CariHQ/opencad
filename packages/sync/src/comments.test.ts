/**
 * ElementCommentStore Tests
 * T-COL-005: Comments persist after element modification
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ElementCommentStore } from './comments';

describe('T-COL-005: ElementCommentStore', () => {
  let store: ElementCommentStore;

  beforeEach(() => {
    store = new ElementCommentStore();
  });

  it('adds a comment with correct fields', () => {
    const comment = store.addComment('el-1', 'user-1', 'Check this wall');
    expect(comment.elementId).toBe('el-1');
    expect(comment.authorId).toBe('user-1');
    expect(comment.text).toBe('Check this wall');
    expect(comment.resolved).toBe(false);
    expect(comment.id).toBeTruthy();
    expect(comment.timestamp).toBeGreaterThan(0);
  });

  it('returns an empty array for elements with no comments', () => {
    expect(store.getComments('el-no-comments')).toEqual([]);
  });

  it('getComments returns only comments for specified element', () => {
    store.addComment('el-1', 'user-1', 'Comment on el-1');
    store.addComment('el-2', 'user-1', 'Comment on el-2');
    const el1Comments = store.getComments('el-1');
    expect(el1Comments).toHaveLength(1);
    expect(el1Comments[0].text).toBe('Comment on el-1');
  });

  it('getAllComments returns all comments', () => {
    store.addComment('el-1', 'user-1', 'C1');
    store.addComment('el-2', 'user-1', 'C2');
    store.addComment('el-1', 'user-2', 'C3');
    expect(store.getAllComments()).toHaveLength(3);
  });

  it('resolveComment marks comment as resolved', () => {
    const comment = store.addComment('el-1', 'user-1', 'Issue');
    store.resolveComment(comment.id);
    const comments = store.getComments('el-1');
    expect(comments[0].resolved).toBe(true);
  });

  it('deleteComment removes the comment', () => {
    const c = store.addComment('el-1', 'user-1', 'To delete');
    store.deleteComment(c.id);
    expect(store.getComments('el-1')).toHaveLength(0);
  });

  it('deleteComment for unknown ID is a no-op', () => {
    store.addComment('el-1', 'user-1', 'Keep');
    store.deleteComment('non-existent-id');
    expect(store.getComments('el-1')).toHaveLength(1);
  });

  it('onElementModified updates snapshot on unresolved comments', () => {
    store.addComment('el-1', 'user-1', 'Review');
    store.onElementModified('el-1', { type: 'wall', width: 200 });
    const comments = store.getComments('el-1');
    expect(comments[0].lastElementSnapshot).toEqual({ type: 'wall', width: 200 });
  });

  it('onElementModified does not update resolved comments', () => {
    const c = store.addComment('el-1', 'user-1', 'Resolved issue');
    store.resolveComment(c.id);
    store.onElementModified('el-1', { type: 'wall', width: 200 });
    const comments = store.getComments('el-1');
    expect(comments[0].lastElementSnapshot).toBeUndefined();
  });

  it('onElementModified only affects comments for the specified element', () => {
    store.addComment('el-1', 'user-1', 'C1');
    store.addComment('el-2', 'user-1', 'C2');
    store.onElementModified('el-1', { changed: true });
    expect(store.getComments('el-1')[0].lastElementSnapshot).toBeDefined();
    expect(store.getComments('el-2')[0].lastElementSnapshot).toBeUndefined();
  });

  it('multiple comments on same element all get snapshot on modification', () => {
    store.addComment('el-1', 'user-1', 'C1');
    store.addComment('el-1', 'user-2', 'C2');
    store.onElementModified('el-1', { updated: true });
    const comments = store.getComments('el-1');
    expect(comments[0].lastElementSnapshot).toBeDefined();
    expect(comments[1].lastElementSnapshot).toBeDefined();
  });

  it('comments survive modification (not deleted)', () => {
    store.addComment('el-1', 'user-1', 'Persistent');
    store.onElementModified('el-1', { val: 1 });
    expect(store.getComments('el-1')).toHaveLength(1);
  });

  it('each comment has a unique ID', () => {
    const c1 = store.addComment('el-1', 'u1', 'C1');
    const c2 = store.addComment('el-1', 'u1', 'C2');
    expect(c1.id).not.toBe(c2.id);
  });
});
