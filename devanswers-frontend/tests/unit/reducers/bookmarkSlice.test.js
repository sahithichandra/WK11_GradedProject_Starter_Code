import { describe, it, expect } from 'vitest';
import bookmarkReducer, {
  fetchBookmarks,
  toggleBookmark,
} from '../../../src/reducers/bookmarkSlice.js';
import { logout } from '../../../src/reducers/userSlice.js';

const initialState = { ids: [], items: [], loading: false, error: null };

const question = { _id: 'q1', title: 'Saved one' };

describe('bookmarkSlice', () => {
  describe('fetchBookmarks', () => {
    it('sets loading on pending', () => {
      const state = bookmarkReducer(initialState, fetchBookmarks.pending());
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('populates items and ids on fulfilled', () => {
      const payload = [
        { _id: 'q1', title: 'A' },
        { _id: 'q2', title: 'B' },
      ];
      const state = bookmarkReducer(
        initialState,
        fetchBookmarks.fulfilled(payload, ''),
      );
      expect(state.loading).toBe(false);
      expect(state.items).toEqual(payload);
      expect(state.ids).toEqual(['q1', 'q2']);
    });

    it('sets error on rejected', () => {
      const state = bookmarkReducer(
        initialState,
        fetchBookmarks.rejected(null, '', undefined, 'boom'),
      );
      expect(state.error).toBe('boom');
    });
  });

  describe('toggleBookmark.fulfilled', () => {
    it('adds the id and item when bookmarked', () => {
      const state = bookmarkReducer(
        initialState,
        toggleBookmark.fulfilled(
          { questionId: 'q1', bookmarked: true, question },
          '',
          { question },
        ),
      );
      expect(state.ids).toContain('q1');
      expect(state.items).toContainEqual(question);
    });

    it('removes the id and item when unbookmarked', () => {
      const saved = { ids: ['q1'], items: [question], loading: false, error: null };
      const state = bookmarkReducer(
        saved,
        toggleBookmark.fulfilled(
          { questionId: 'q1', bookmarked: false, question },
          '',
          { question },
        ),
      );
      expect(state.ids).not.toContain('q1');
      expect(state.items).toHaveLength(0);
    });

    it('does not duplicate an already-saved id', () => {
      const saved = { ids: ['q1'], items: [question], loading: false, error: null };
      const state = bookmarkReducer(
        saved,
        toggleBookmark.fulfilled(
          { questionId: 'q1', bookmarked: true, question },
          '',
          { question },
        ),
      );
      expect(state.ids).toEqual(['q1']);
      expect(state.items).toHaveLength(1);
    });
  });

  describe('logout', () => {
    it('clears saved state', () => {
      const saved = { ids: ['q1'], items: [question], loading: false, error: null };
      const state = bookmarkReducer(saved, logout());
      expect(state.ids).toEqual([]);
      expect(state.items).toEqual([]);
    });
  });
});
