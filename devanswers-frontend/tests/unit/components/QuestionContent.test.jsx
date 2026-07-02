import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import QuestionContent from '../../../src/components/Question/QuestionContent';
import questionReducer from '../../../src/reducers/questionSlice';

const createMockStore = () => {
  return configureStore({
    reducer: {
      question: questionReducer,
      user: () => ({
        userInfo: { userId: 'user-1' },
        loading: false,
        error: null,
      }),
    },
  });
};

// A question authored by the logged-in user (user-1).
const ownedQuestion = {
  _id: 'q9',
  title: 'My own question',
  description: 'My description',
  voteCount: 1,
  tags: [{ _id: 't1', name: 'react' }],
  author: { _id: 'user-1', name: 'Me' },
  createdAt: '2026-01-15T00:00:00.000Z',
};

const mockQuestion = {
  _id: 'q1',
  title: 'How do I use the useEffect hook?',
  description: 'I have trouble with the dependency array.',
  voteCount: 8,
  tags: [
    { _id: 't1', name: 'react' },
    { _id: 't2', name: 'hooks' },
  ],
  author: { _id: 'user-2', name: 'Alice' },
  createdAt: '2026-01-15T00:00:00.000Z',
};

const renderQuestionContent = (question = mockQuestion) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <QuestionContent question={question} />
    </Provider>
  );
};

describe('QuestionContent Component', () => {
  it('renders the question title', () => {
    renderQuestionContent();
    expect(screen.getByText('How do I use the useEffect hook?')).toBeInTheDocument();
  });

  it('renders the question description', () => {
    renderQuestionContent();
    expect(screen.getByText('I have trouble with the dependency array.')).toBeInTheDocument();
  });

  it('renders the vote count', () => {
    renderQuestionContent();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders tags as badges', () => {
    renderQuestionContent();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('hooks')).toBeInTheDocument();
  });

  it('renders the author name', () => {
    renderQuestionContent();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders upvote and downvote buttons', () => {
    renderQuestionContent();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the "Asked" date text', () => {
    renderQuestionContent();
    expect(screen.getByText(/Asked/i)).toBeInTheDocument();
  });

  it('renders "Posted by" label for the author', () => {
    renderQuestionContent();
    expect(screen.getByText(/Posted by/i)).toBeInTheDocument();
  });

  // ── Edit affordance ─────────────────────────────────────────────
  it('does not show the edit affordance for a non-author', () => {
    renderQuestionContent(); // author is user-2, current user is user-1
    expect(
      screen.queryByRole('button', { name: /edit question/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the edit affordance for the author', () => {
    renderQuestionContent(ownedQuestion);
    expect(
      screen.getByRole('button', { name: /edit question/i }),
    ).toBeInTheDocument();
  });

  it('pre-fills the edit form with the current content', async () => {
    renderQuestionContent(ownedQuestion);
    await userEvent.click(
      screen.getByRole('button', { name: /edit question/i }),
    );
    expect(screen.getByLabelText('Edit title')).toHaveValue('My own question');
    expect(screen.getByLabelText('Edit description')).toHaveValue(
      'My description',
    );
    expect(screen.getByLabelText('Edit tags')).toHaveValue('react');
  });

  it('blocks saving when the title is emptied', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderQuestionContent(ownedQuestion);
    await userEvent.click(
      screen.getByRole('button', { name: /edit question/i }),
    );
    await userEvent.clear(screen.getByLabelText('Edit title'));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringMatching(/cannot be empty/i),
    );
  });

  it('shows the (edited) indicator only when the question has been edited', () => {
    const { unmount } = renderQuestionContent(ownedQuestion);
    expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    unmount();

    renderQuestionContent({ ...ownedQuestion, isEdited: true });
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });
});
