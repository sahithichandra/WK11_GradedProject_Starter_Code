import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Profile from '../../../src/pages/Profile/Profile';
import bookmarkReducer from '../../../src/reducers/bookmarkSlice';
import { server } from '../../mocks/server';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createMockStore = ({
  userInfo = { userId: 'u1', name: 'TestUser', token: 'tok' },
} = {}) => {
  return configureStore({
    reducer: {
      user: () => ({ userInfo, loading: false, error: null }),
    },
  });
};

const renderProfile = (storeOptions = {}) => {
  const store = createMockStore(storeOptions);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    </Provider>
  );
};

// Store with a real bookmark reducer so fetchBookmarks populates the saved list.
const renderProfileWithBookmarks = () => {
  const store = configureStore({
    reducer: {
      user: () => ({
        userInfo: { userId: 'u1', name: 'TestUser', token: 'tok' },
        loading: false,
        error: null,
      }),
      bookmark: bookmarkReducer,
    },
  });
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    </Provider>
  );
};

describe('Profile Page', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the profile heading when authenticated', () => {
    renderProfile();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });

  it('shows Edit Profile button when not in edit mode', () => {
    renderProfile();
    expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderProfile({ userInfo: null });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows activity stats section when authenticated', () => {
    renderProfile();
    expect(screen.getByText('Activity Stats')).toBeInTheDocument();
    expect(screen.getByText('Questions')).toBeInTheDocument();
    expect(screen.getByText('Answers')).toBeInTheDocument();
  });

  it('enters edit mode when Edit Profile button is clicked', async () => {
    renderProfile();
    await userEvent.click(screen.getByText(/edit profile/i));

    expect(screen.getByText(/save changes/i)).toBeInTheDocument();
    expect(screen.getByText(/cancel/i)).toBeInTheDocument();
  });

  it('exits edit mode when Cancel button is clicked', async () => {
    renderProfile();
    await userEvent.click(screen.getByText(/edit profile/i));
    await userEvent.click(screen.getByText(/cancel/i));

    expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
  });

  it('shows form inputs in edit mode', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByText(/edit profile/i));

    // Full Name and Email inputs should now be enabled
    expect(screen.getByPlaceholderText(/enter your name/i)).not.toBeDisabled();
    expect(screen.getByPlaceholderText(/enter your email/i)).not.toBeDisabled();
  });

  it('renders a Saved Questions section', () => {
    renderProfile();
    expect(screen.getByText('Saved Questions')).toBeInTheDocument();
  });

  it('lists the saved questions fetched from the server', async () => {
    renderProfileWithBookmarks();
    expect(
      await screen.findByText('How do I manage state in React?'),
    ).toBeInTheDocument();
  });

  it('shows a friendly empty state when nothing is saved', async () => {
    server.use(
      http.get('http://localhost:3000/api/bookmarks', () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    );
    renderProfileWithBookmarks();
    expect(
      await screen.findByText(/no saved questions yet/i),
    ).toBeInTheDocument();
  });
});
