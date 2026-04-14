/**
 * Element Comment Store
 * Persistent comments on document elements, surviving element modifications
 * T-COL-005
 */

export interface ElementComment {
  id: string;
  elementId: string;
  authorId: string;
  text: string;
  timestamp: number;
  resolved: boolean;
  lastElementSnapshot?: Record<string, unknown>;
}

let _commentIdCounter = 0;

export class ElementCommentStore {
  private readonly _comments = new Map<string, ElementComment>();

  addComment(elementId: string, authorId: string, text: string): ElementComment {
    const id = `comment-${++_commentIdCounter}-${Date.now()}`;
    const comment: ElementComment = {
      id,
      elementId,
      authorId,
      text,
      timestamp: Date.now(),
      resolved: false,
    };
    this._comments.set(id, comment);
    return comment;
  }

  getComments(elementId: string): ElementComment[] {
    return Array.from(this._comments.values()).filter((c) => c.elementId === elementId);
  }

  getAllComments(): ElementComment[] {
    return Array.from(this._comments.values());
  }

  resolveComment(commentId: string): void {
    const c = this._comments.get(commentId);
    if (c) c.resolved = true;
  }

  deleteComment(commentId: string): void {
    this._comments.delete(commentId);
  }

  /**
   * Called when an element is modified. Updates the lastElementSnapshot on all
   * unresolved comments for that element so reviewers can see what changed.
   */
  onElementModified(elementId: string, snapshot: Record<string, unknown>): void {
    for (const comment of this._comments.values()) {
      if (comment.elementId === elementId && !comment.resolved) {
        comment.lastElementSnapshot = { ...snapshot };
      }
    }
  }
}
