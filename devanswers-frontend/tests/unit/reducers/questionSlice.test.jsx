// Unit tests for questionSlice.js using Vitest. The tests should verify:
// - The initial state is correctly defined.
// - Reducer state transitions for fetchQuestions (pending, fulfilled, rejected).
// - Creating a new question adds it to the state (postQuestion fulfilled, rejected).
//
// Uses the direct reducer + action creator pattern (same as MLS reducer tests):
// questionReducer(state, thunkAction.fulfilled(payload)) — no service mocking needed.

import { describe, it, expect } from 'vitest';
import questionReducer, {
  fetchQuestions,
  postQuestion,
  updateQuestion,
  updateAnswer,
} from '../../../src/reducers/questionSlice.js';

describe('questionSlice', () => {
  const initialState = {
    questions: [],
    currentQuestion: null,
    loading: false,
    error: null,
  };

  describe('initial state', () => {
    it('should return initial state', () => {
      const state = questionReducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('fetchQuestions async thunk', () => {
    it('should handle pending state', () => {
      const state = questionReducer(initialState, fetchQuestions.pending());

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state and populate questions', () => {
      const mockQuestions = [
        { _id: 'q1', title: 'First Question' },
        { _id: 'q2', title: 'Second Question' },
      ];

      const state = questionReducer(
        initialState,
        fetchQuestions.fulfilled(mockQuestions, '')
      );

      expect(state.loading).toBe(false);
      expect(state.questions).toEqual(mockQuestions);
      expect(state.questions).toHaveLength(2);
      expect(state.error).toBeNull();
    });

    it('should handle rejected state', () => {
      const errorMessage = 'Failed to fetch questions';
      const state = questionReducer(
        initialState,
        fetchQuestions.rejected(null, '', null, errorMessage)
      );

      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('postQuestion async thunk', () => {
    it('should add new question to list on fulfilled', () => {
      const existingState = {
        ...initialState,
        questions: [{ _id: 'q1', title: 'Existing Question' }],
      };

      const newQuestion = {
        _id: 'q3',
        title: 'New Question',
        description: 'Description',
        tags: ['redux'],
      };

      const state = questionReducer(
        existingState,
        postQuestion.fulfilled(newQuestion, '', {})
      );

      expect(state.questions).toHaveLength(2);
      expect(state.questions).toContainEqual(newQuestion);
      expect(state.currentQuestion).toEqual(newQuestion);
      expect(state.loading).toBe(false);
    });

    it('should set error on rejected', () => {
      const errorMessage = 'Failed to post question';
      const state = questionReducer(
        initialState,
        postQuestion.rejected(null, '', {}, errorMessage)
      );

      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('updateQuestion async thunk', () => {
    it('replaces currentQuestion (preserving answers) and the questions entry', () => {
      const existingState = {
        ...initialState,
        currentQuestion: {
          _id: 'q1',
          title: 'Old',
          description: 'Old desc',
          tags: [],
          isEdited: false,
          answers: [{ _id: 'a1', answerText: 'keep' }],
        },
        questions: [{ _id: 'q1', title: 'Old' }],
      };
      const updated = {
        _id: 'q1',
        title: 'New title',
        description: 'New desc',
        tags: [{ _id: 't1', name: 'js' }],
        isEdited: true,
      };

      const state = questionReducer(
        existingState,
        updateQuestion.fulfilled(updated, '', {})
      );

      expect(state.currentQuestion.title).toBe('New title');
      expect(state.currentQuestion.isEdited).toBe(true);
      // The loaded answers must be preserved (payload has no answers).
      expect(state.currentQuestion.answers).toHaveLength(1);
      expect(state.questions[0].title).toBe('New title');
    });
  });

  describe('updateAnswer async thunk', () => {
    it('replaces the matching answer inside currentQuestion.answers', () => {
      const existingState = {
        ...initialState,
        currentQuestion: {
          _id: 'q1',
          answers: [
            { _id: 'a1', answerText: 'Old', isEdited: false },
            { _id: 'a2', answerText: 'Keep' },
          ],
        },
      };
      const updated = { _id: 'a1', answerText: 'New', isEdited: true };

      const state = questionReducer(
        existingState,
        updateAnswer.fulfilled(updated, '', {})
      );

      expect(state.currentQuestion.answers[0].answerText).toBe('New');
      expect(state.currentQuestion.answers[0].isEdited).toBe(true);
      expect(state.currentQuestion.answers[1].answerText).toBe('Keep');
    });
  });
});
