import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BookmarkButton from '../../../src/components/Shared/BookmarkButton';
import bookmarkReducer from '../../../src/reducers/bookmarkSlice';

const question = { _id: 'q1', title: 'Test question' };

const createMockStore = ({
  userInfo = { userId: 'user-1', token: 'tok' },
  ids = [],
} = {}) => {
  return configureStore({
    reducer: {
      user: () => ({ userInfo, loading: false, error: null }),
      bookmark: bookmarkReducer,
    },
    preloadedState: {
      bookmark: { ids, items: [], loading: false, error: null },
    },
  });
};

const renderButton = (storeOptions = {}) => {
  const store = createMockStore(storeOptions);
  return render(
    <Provider store={store}>
      <BookmarkButton question={question} />
    </Provider>,
  );
};

describe('BookmarkButton', () => {
  it('renders the unsaved (outline) state when the question is not in the saved set', () => {
    renderButton({ ids: [] });
    expect(
      screen.getByRole('button', { name: /save question/i }),
    ).toBeInTheDocument();
  });

  it('renders the saved (filled) state when the question is in the saved set', () => {
    renderButton({ ids: ['q1'] });
    expect(
      screen.getByRole('button', { name: /remove bookmark/i }),
    ).toBeInTheDocument();
  });

  it('alerts and does not dispatch when an unauthenticated user clicks', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const store = createMockStore({ userInfo: null });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    render(
      <Provider store={store}>
        <BookmarkButton question={question} />
      </Provider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /save question/i }));

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringMatching(/logged in/i),
    );
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('dispatches a toggle when an authenticated user clicks', async () => {
    const store = createMockStore({ userInfo: { userId: 'user-1', token: 'tok' } });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    render(
      <Provider store={store}>
        <BookmarkButton question={question} />
      </Provider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /save question/i }));

    expect(dispatchSpy).toHaveBeenCalled();
  });
});
