# Implementation Plan — Feature 1: Bookmarks

**Spec:** [bookmarks-spec.md](./bookmarks-spec.md) · **Branch:** `feature/bookmarks` (git worktree)

## Prerequisites
- Both packages `npm install`ed; DB seeded (`npm run populate`); both test suites green at baseline
  (backend 234, frontend 167+2 skipped).

## Build-order rationale
Strictly bottom-up so nothing depends on code not yet written: **backend model → service → controller
→ route → backend tests**, then **frontend config → service → slice → store → component → integrations
→ app-load hydrate → profile → frontend tests**. The frontend is built against the finished, tested
backend.

## Capabilities reused (not rebuilt)
- The **vote toggle** (`services/voteService.js → handleVote`) — pattern for the array add/remove toggle.
- `getAllQuestionsService` — pattern for populating `author`+`tags` and attaching `answerCount`.
- `VoteButtons.jsx` — pattern for the auth-guarded per-user control.
- `QuestionList.jsx` — reused as-is to render the profile's Saved Questions.
- `createUserAndLogin()` test helper; MSW handler/mockData patterns.

---

## BACKEND

### B1 — Model: add `bookmarks` to User
- **File:** `devanswers-backend/src/models/User.js`
- **Change:** add field inside the schema:
  ```js
  bookmarks: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }], default: [] },
  ```
- **Pattern:** mirrors the `[{ type: ObjectId, ref: "User" }]` arrays on `Question.upvotes`.
- **Done-when:** a saved User can hold an array of Question ids; existing user tests still pass.

### B2 — Service: `bookmarkService.js` (TEST FIRST)
- **Test file:** `tests/unit/services/bookmarkService.test.js` — mock Mongoose like
  `questionService.test.js`. Cases: toggle **adds** id when absent → `{bookmarked:true}`; toggle
  **removes** when present → `{bookmarked:false}`; **404** when `Question.findById` returns null.
  (AC10, AC4-server.)
- **File:** `devanswers-backend/src/services/bookmarkService.js` (new). Imports `User`, `Question`,
  `Answer`, `createAppError`.
  ```js
  export const toggleBookmarkService = async (userId, questionId) => {
    const question = await Question.findById(questionId);
    if (!question) throw createAppError("Question not found", 404);
    const user = await User.findById(userId);
    if (!user) throw createAppError("User not found", 404);
    const already = user.bookmarks.some((id) => id.toString() === questionId.toString());
    if (already) user.bookmarks.pull(questionId);
    else user.bookmarks.push(questionId);
    await user.save();
    return { questionId, bookmarked: !already };
  };

  export const getBookmarksService = async (userId) => {
    const user = await User.findById(userId).populate({
      path: "bookmarks",
      populate: [{ path: "author", select: "name" }, { path: "tags" }],
    });
    if (!user) throw createAppError("User not found", 404);
    return Promise.all(
      user.bookmarks.map(async (q) => {
        const answerCount = await Answer.countDocuments({ questionId: q._id });
        return { ...(q.toObject?.() ?? q), answerCount };
      }),
    );
  };
  ```
- **Pattern:** toggle mirrors `handleVote`; `getBookmarksService` mirrors `getAllQuestionsService`'s
  `answerCount` map.
- **Done-when:** the new unit tests pass.

### B3 — Controller: `bookmarkController.js`
- **File:** `devanswers-backend/src/controllers/bookmarkController.js` (new).
  ```js
  export const toggleBookmark = async (req, res) => {
    const { questionId } = req.params;
    const { bookmarked } = await toggleBookmarkService(req.user.id, questionId);
    res.status(200).json({
      success: true,
      message: bookmarked ? "Bookmark added successfully" : "Bookmark removed successfully",
      data: { questionId, bookmarked },
    });
  };
  export const getBookmarks = async (req, res) => {
    const data = await getBookmarksService(req.user.id);
    res.status(200).json({ success: true, message: "Bookmarks fetched successfully", data });
  };
  ```
- **Pattern:** `questionController` (envelope, no try/catch, reads `req.user.id`).
- **Done-when:** controller compiles; wired by B4.

### B4 — Route + mount
- **File:** `devanswers-backend/src/routes/bookmarks.js` (new):
  ```js
  router.get("/", authenticate, getBookmarks);
  router.post("/:questionId", authenticate, toggleBookmark);
  ```
- **File:** `devanswers-backend/src/routes/index.js` — `import bookmarksRouter` and
  `router.use("/bookmarks", bookmarksRouter);`.
- **Pattern:** `routes/questions.js` + the mounts in `routes/index.js`.
- **Done-when:** `GET/POST /api/bookmarks` reachable.

### B5 — Backend integration tests (TEST FIRST where practical)
- **File:** `tests/integration/bookmarks.test.js` (new), using `createUserAndLogin()` + a seeded
  question. Cases:
  1. `POST /api/bookmarks/:id` → 200 `{bookmarked:true,...}` then again → `{bookmarked:false}` (AC3/AC10).
  2. `GET /api/bookmarks` after saving → array incl. the question, populated, with `answerCount` (AC6/AC8).
  3. `GET` and `POST` without token → 401 (AC4).
  4. `POST` unknown question id → 404.
  5. Per-user: user A saves; user B's `GET` is empty (AC5).
- **Done-when:** `npm test` (backend) green, including these.

---

## FRONTEND

### F1 — Config
- **File:** `devanswers-frontend/src/config/config.js` — add:
  ```js
  export const BOOKMARK_API = { LIST: "/bookmarks", TOGGLE: (questionId) => `/bookmarks/${questionId}` };
  ```

### F2 — Service
- **File:** `devanswers-frontend/src/services/bookmarkService.js` (new):
  ```js
  export const getBookmarks = async (token) => {
    const res = await axiosInstance.get(BOOKMARK_API.LIST, { headers: { Authorization: `Bearer ${token}` } });
    return res.data.data || [];
  };
  export const toggleBookmark = async (questionId, token) => {
    const res = await axiosInstance.post(BOOKMARK_API.TOGGLE(questionId), {}, { headers: { Authorization: `Bearer ${token}` } });
    return res.data.data;
  };
  ```
- **Pattern:** `questionService.upvoteQuestion`.

### F3 — Slice (TEST FIRST)
- **Test:** `tests/unit/reducers/bookmarkSlice.test.js` — `toggleBookmark.fulfilled` with
  `{bookmarked:true}` adds id+item; with `{bookmarked:false}` removes; `fetchBookmarks.fulfilled`
  sets `items` and `ids`; `logout` clears. (AC3/AC5/AC8.)
- **File:** `devanswers-frontend/src/reducers/bookmarkSlice.js` (new). State
  `{ ids: [], items: [], loading: false, error: null }`.
  - `fetchBookmarks` thunk: `const { token } = getState().user.userInfo || {}; return await getBookmarks(token);`
    `fulfilled` → `items = payload; ids = payload.map(q => q._id)`.
  - `toggleBookmark` thunk: arg `{ question }`; `const { token } = getState().user.userInfo || {};`
    `const data = await toggleBookmark(question._id, token); return { ...data, question };`
    `fulfilled` → if `data.bookmarked`: push `question._id`→`ids`, push `question`→`items` (guard dupes);
    else remove from both by id.
  - `extraReducers` also handle `logout` (import the action from `userSlice`) → reset to initial.
- **Pattern:** `questionSlice` thunks (token-from-state, rejectWithValue).
- **Done-when:** slice tests pass.

### F4 — Store
- **File:** `devanswers-frontend/src/store.js` — register `bookmark: bookmarkReducer`.

### F5 — BookmarkButton component (TEST FIRST)
- **Test:** `tests/unit/components/BookmarkButton.test.jsx` — outline icon when id not in store
  `ids`; filled when present (AC2); unauthenticated click → `alert` + no dispatch (AC4); authed click
  dispatches (AC3). Mirror `VoteButtons.test.jsx` store mocking.
- **File:** `devanswers-frontend/src/components/Shared/BookmarkButton.jsx` (+ `BookmarkButton.css`).
  Reads `userInfo` and `bookmark.ids`; `isSaved = ids.includes(question._id)`; renders
  `FaBookmark`/`FaRegBookmark` in a `Button`; `onClick` guards auth then
  `dispatch(toggleBookmark({ question }))`. Use `e.preventDefault();e.stopPropagation();` (it sits
  inside the clickable card).
- **Pattern:** `VoteButtons.jsx`.

### F6 — Integrate into feed + detail
- **File:** `src/components/Question/QuestionCard.jsx` — render `<BookmarkButton question={question}/>`
  (e.g. top-right of the card). (AC1 feed.)
- **File:** `src/components/Question/QuestionContent.jsx` — render `<BookmarkButton question={question}/>`
  in the header/body. (AC1 detail.)
- **Done-when:** icon visible in both places and reflects saved state.

### F7 — Hydrate on app load
- **File:** `src/App.jsx` — `const { userInfo } = useSelector(s => s.user);` +
  `useEffect(() => { if (userInfo) dispatch(fetchBookmarks()); }, [userInfo, dispatch]);` (AC8).
- **Pattern:** existing dispatch-on-mount in `Home.jsx`.

### F8 — Profile "Saved Questions" section
- **File:** `src/pages/Profile/Profile.jsx` — read `const { items } = useSelector(s => s.bookmark);`
  dispatch `fetchBookmarks()` on mount; add a section: heading "Saved Questions"; if `items.length`
  → `<QuestionList questions={items} />`, else `<p>No saved questions yet.</p>`. (AC6/AC7/AC9.)
- **Pattern:** the existing Activity-Stats section block.

### F9 — Frontend tests: MSW + profile
- **Files:** `tests/mocks/handlers.js` (+ `mockData.js`) — add `GET /api/bookmarks` (returns a saved
  fixture array) and `POST /api/bookmarks/:id` (returns toggled `{questionId,bookmarked}`).
  Extend `tests/unit/pages/profile.test.jsx` for the saved list (AC6) and the empty state (AC7).
- **Done-when:** `npm test` (frontend) green.

---

## Verification
- `cd devanswers-backend && npm test` → all green incl. `bookmarks.test.js` + `bookmarkService.test.js`.
- `cd devanswers-frontend && npm test` → all green incl. new slice/component/profile tests.
- **Manual** (both servers running, two browser sessions / users):
  - Feed + detail show the bookmark icon (AC1); logged-out click → prompt, no save (AC4).
  - Save toggles outline→filled instantly; unsave reverses (AC2/AC3).
  - Reload page → saved icons still filled; Profile lists saved questions (AC8/AC6).
  - Empty profile shows "No saved questions yet." (AC7).
  - User B's saved set is independent of user A's (AC5).
  - Unsave from profile removes it from the list (AC9).

## Risks / regressions to watch
- Adding `bookmarks` to `User` is additive — confirm `user.test.js` / `authController` still pass.
- Don't let `BookmarkButton`'s click bubble to the card's `<Link>` (use `stopPropagation`).
- Resetting bookmark state on `logout` is essential for per-user correctness (AC5).
- Keep `getBookmarksService`'s populate shape identical to the feed's, or `QuestionList` rendering breaks.
- Both suites must remain green (no changes to existing question/answer/vote/auth/AI behaviour).
