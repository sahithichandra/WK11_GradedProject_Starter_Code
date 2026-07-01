import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getBookmarks,
  toggleBookmark as toggleBookmarkApi,
} from "../services/bookmarkService.js";
import { logout } from "./userSlice.js";

const initialState = {
  ids: [], // ids of the current user's saved questions (for fast icon state)
  items: [], // full saved-question objects (for the profile list)
  loading: false,
  error: null,
};

// Hydrate the user's saved set on app load / profile visit.
export const fetchBookmarks = createAsyncThunk(
  "bookmark/fetchBookmarks",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user.userInfo || {};
      return await getBookmarks(token);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch bookmarks",
      );
    }
  },
);

// Toggle a question's saved state. The question object is passed through so the
// reducer can add it to `items` without an extra fetch.
export const toggleBookmark = createAsyncThunk(
  "bookmark/toggleBookmark",
  async ({ question }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user.userInfo || {};
      const data = await toggleBookmarkApi(question._id, token);
      return { ...data, question };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to update bookmark",
      );
    }
  },
);

const bookmarkSlice = createSlice({
  name: "bookmark",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookmarks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.ids = action.payload.map((q) => q._id);
      })
      .addCase(fetchBookmarks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        const { questionId, bookmarked, question } = action.payload;
        if (bookmarked) {
          if (!state.ids.includes(questionId)) state.ids.push(questionId);
          if (!state.items.some((q) => q._id === questionId))
            state.items.push(question);
        } else {
          state.ids = state.ids.filter((id) => id !== questionId);
          state.items = state.items.filter((q) => q._id !== questionId);
        }
      })
      .addCase(toggleBookmark.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      // Clear saved state on logout so a new user never inherits it.
      .addCase(logout, (state) => {
        state.ids = [];
        state.items = [];
        state.error = null;
      });
  },
});

export default bookmarkSlice.reducer;
