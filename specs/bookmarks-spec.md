# Spec — Feature 1: Bookmark Questions for Later

**Status:** Ready for implementation · **Author:** agentic workflow (Stage 2) · **Related:** [bookmarks-plan.md](./bookmarks-plan.md)

## 1. Summary

A logged-in user can **save (bookmark)** any question and later **unsave** it. A bookmark control
(outline icon = not saved, filled icon = saved) appears on every question wherever questions are
shown — the feed (`QuestionCard`) and the single-question page (`QuestionContent`). Toggling updates
the icon instantly via Redux, with no page reload. All saved questions appear in a **"Saved
Questions"** section on the user's profile, rendered with the existing question-list UI, with a
friendly empty state. Saves are **per-user** and **persist** across page loads / re-login: on app
load with a valid session, the app fetches the user's saved set so bookmark icons render correctly
right away.

## 2. User-facing behaviour & acceptance criteria

Each is observable and testable.

1. **AC1 — Control is present everywhere questions render.** Every `QuestionCard` in the feed and the
   `QuestionContent` on `/question/:id` shows a bookmark control.
2. **AC2 — Visual saved/unsaved state.** The control renders an **outline** icon (`FaRegBookmark`)
   when the question is not saved by the current user, and a **filled** icon (`FaBookmark`) when it is.
3. **AC3 — Save toggles to unsave.** A logged-in user clicking the control on an unsaved question
   saves it (icon → filled) and clicking again unsaves it (icon → outline), **without a full page
   reload** (Redux state update).
4. **AC4 — Auth required.** An anonymous visitor who activates the control is **not** able to save;
   they get the same auth prompt used elsewhere (`alert("You must be logged in to save a question.")`),
   and no request is sent. (Consistent with voting/posting.)
5. **AC5 — Per-user isolation.** Saving a question as user A never changes user B's saved set. Two
   different users have independent bookmark lists.
6. **AC6 — Profile "Saved Questions" section.** The profile page shows a "Saved Questions" section
   listing the current user's saved questions using the **existing `QuestionList`** UI. From there the
   user can open a question (link) or unsave it (the same bookmark control).
7. **AC7 — Empty state.** When the user has saved nothing, the section shows a friendly empty state:
   **"No saved questions yet."**
8. **AC8 — Persistence + hydrate-on-load.** After saving questions, reloading the app (valid session)
   shows those questions' icons in the saved (filled) state and lists them on the profile — i.e. saved
   state is read from the server, not just local memory.
9. **AC9 — Unsave from profile updates feed.** Unsaving a question from the profile removes it from
   the Saved Questions list and, if that question is visible in the feed, its icon returns to outline.
10. **AC10 — Idempotent server toggle.** The server's toggle endpoint always leaves a consistent
    state: a question id appears in the user's `bookmarks` at most once; toggling adds if absent,
    removes if present.

## 3. Out of scope

- Bookmarking **answers** (only questions).
- Folders, tags, notes, sharing, or exporting of saved questions.
- Deleting questions/answers.
- A bookmark **count** on questions (bookmarks are private per-user; not a public metric).

## 4. API contract

New, dedicated bookmark resource (mirrors the per-resource router pattern in `routes/index.js`).
All endpoints require auth (`authenticate` middleware). Standard envelope `{ success, message, data }`.

### 4.1 `GET /api/bookmarks` — list the current user's saved questions (auth)
- **Request:** no body. `Authorization: Bearer <token>`.
- **200 success:**
  ```json
  { "success": true, "message": "Bookmarks fetched successfully",
    "data": [ { "_id": "...", "title": "...", "description": "...",
                "tags": [{ "_id": "...", "name": "react" }],
                "author": { "_id": "...", "name": "Alice" },
                "voteCount": 3, "answerCount": 2, "createdAt": "..." } ] }
  ```
  `data` is an array of **fully populated** questions shaped exactly like the feed expects (author
  `name`, populated `tags`, plus computed `answerCount`) so it renders with the existing `QuestionList`.
  Empty array `[]` when nothing is saved.
- **401:** `{ success:false, message:"No token provided, authorization denied." }` (from `authenticate`).

### 4.2 `POST /api/bookmarks/:questionId` — toggle bookmark (auth)
- **Request:** no body. `Authorization: Bearer <token>`.
- **200 success:**
  ```json
  { "success": true, "message": "Bookmark added successfully",
    "data": { "questionId": "<id>", "bookmarked": true } }
  ```
  `bookmarked` is `true` if the question is now saved, `false` if it was just removed
  (message `"Bookmark removed successfully"`).
- **404:** question id not found → `{ success:false, message:"Question not found" }`.
- **401:** missing/invalid token (from `authenticate`).

> **Design note — why a dedicated resource.** Bookmarks are a user-owned collection, so a `/bookmarks`
> router (controller + service) is cleaner than hanging a list endpoint off `/questions`. The toggle
> still mirrors the **vote toggle** logic (`services/voteService.js → handleVote`): load → if present
> `pull`, else `push` → `save`.

## 5. Data model changes

**`models/User.js`** — add one field (additive, back-compatible; existing users default to `[]`):
```js
bookmarks: {
  type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  default: [],
}
```
No change to Question/Answer/Tag. Bookmarks are stored on the user (per-user by construction → AC5).
No separate collection (matches the embedded-array style of `upvotes`/`downvotes`).

## 6. Backend changes (layered)

| Layer | File | Change |
|------|------|--------|
| Model | `src/models/User.js` | Add `bookmarks` array field (above). |
| Service | `src/services/bookmarkService.js` **(new)** | `toggleBookmarkService(userId, questionId)` — verify question exists (else 404); if `user.bookmarks` includes id → `pull` (bookmarked=false) else `push` (bookmarked=true); `user.save()`; return `{ questionId, bookmarked }`. `getBookmarksService(userId)` — load user, `populate` bookmarks with `author:name` + `tags`, then map each to add `answerCount` via `Answer.countDocuments({ questionId })` (mirror `getAllQuestionsService`). |
| Controller | `src/controllers/bookmarkController.js` **(new)** | `toggleBookmark` (reads `req.params.questionId`, `req.user.id`; message reflects added/removed) and `getBookmarks` (reads `req.user.id`). Standard envelope. No try/catch. |
| Route | `src/routes/bookmarks.js` **(new)** | `router.get("/", authenticate, getBookmarks); router.post("/:questionId", authenticate, toggleBookmark);` |
| Route index | `src/routes/index.js` | `router.use("/bookmarks", bookmarksRouter);` |

Errors via `createAppError(msg, status)` thrown from the service (matches convention).

## 7. Frontend changes (config → service → slice → component)

| Layer | File | Change |
|------|------|--------|
| Config | `src/config/config.js` | Add `BOOKMARK_API = { LIST: "/bookmarks", TOGGLE: (questionId) => \`/bookmarks/${questionId}\` }`. |
| Service | `src/services/bookmarkService.js` **(new)** | `getBookmarks(token)` → GET, returns `res.data.data \|\| []`. `toggleBookmark(questionId, token)` → POST with `{}` body + Bearer header, returns `res.data.data`. (Mirror `questionService.upvoteQuestion`.) |
| Slice | `src/reducers/bookmarkSlice.js` **(new)** | State `{ ids: [], items: [], loading, error }`. Thunks: `fetchBookmarks()` (token from `getState().user.userInfo`) → sets `items` + derives `ids = items.map(q=>q._id)`; `toggleBookmark({ question })` → calls service, returns `{ questionId, bookmarked }`. Reducers: on `toggleBookmark.fulfilled`, if `bookmarked` add `questionId` to `ids` and `question` to `items`, else remove from both; clear `ids/items` on `logout`. |
| Store | `src/store.js` | Register `bookmark: bookmarkReducer`. |
| Component | `src/components/Shared/BookmarkButton.jsx` **(new)** (+ `.css`) | Props: `{ question }`. Reads `userInfo` and `bookmark.ids`. `isSaved = ids.includes(question._id)`. Renders `FaBookmark` (filled) if saved else `FaRegBookmark`. onClick: `e.preventDefault/stopPropagation`; if `!userInfo` → `alert("You must be logged in to save a question.")` and return; else `dispatch(toggleBookmark({ question }))`. Mirror `VoteButtons.jsx` guard structure. |
| Integrate | `src/components/Question/QuestionCard.jsx` | Render `<BookmarkButton question={question} />` in the card (feed). |
| Integrate | `src/components/Question/QuestionContent.jsx` | Render `<BookmarkButton question={question} />` on the detail page. |
| App load | `src/App.jsx` | On mount / when `userInfo` becomes truthy, `dispatch(fetchBookmarks())` (hydrate AC8). Clear handled by `logout` reducer. |
| Profile | `src/pages/Profile/Profile.jsx` | `dispatch(fetchBookmarks())` on mount; add a "Saved Questions" section: if `items.length` → `<QuestionList questions={items} />`, else the empty state text "No saved questions yet." |

**Logout interaction:** `userSlice` `logout` clears `userInfo`; `bookmarkSlice` resets `ids/items` on
the same `logout` action so a new user never sees the previous user's saved icons (supports AC5).

## 8. Test plan

**Backend — `tests/unit/services/bookmarkService.test.js`** (Vitest, mock Mongoose): toggle adds id
when absent (`bookmarked:true`); removes when present (`bookmarked:false`); throws 404 when question
missing → AC10, AC4-server. **`tests/integration/bookmarks.test.js`** (Supertest + in-memory Mongo,
`createUserAndLogin`): POST toggles on/off (200, correct `bookmarked` + message) → AC3/AC10;
GET returns saved questions populated with `answerCount` → AC6/AC8; GET/POST without token → 401 → AC4;
two users' lists are independent → AC5.

**Frontend — `tests/unit/reducers/bookmarkSlice.test.js`:** `toggleBookmark.fulfilled` add/remove
updates `ids`+`items`; `fetchBookmarks.fulfilled` sets both; `logout` clears → AC3/AC5/AC8.
**`tests/unit/components/BookmarkButton.test.jsx`:** outline when not in `ids`, filled when in `ids`
→ AC2; click while unauthenticated alerts + no dispatch → AC4; click while authed dispatches → AC3.
**`tests/unit/pages/profile.test.jsx`** (extend): shows saved questions when present (AC6) and the
empty-state text when none (AC7). Add **MSW handlers** for `GET /api/bookmarks` and
`POST /api/bookmarks/:id` in `tests/mocks/handlers.js` + fixtures in `mockData.js`.

All existing tests (backend 234, frontend 167) must remain green.

## 9. Decisions & resolved questions

- **Storage:** embedded `bookmarks` array on `User` (not a separate collection) — simplest, gives
  per-user isolation for free, matches `upvotes`/`downvotes` style. ✔
- **Hydrate strategy:** one `GET /api/bookmarks` on app load returns full populated questions; the
  slice derives the id set (for feed icons) and keeps the items (for the profile) from the same call —
  one request serves both AC6 and AC8. ✔
- **No bookmark count on questions** (private metric) — out of scope. ✔
- **Toggle vs separate add/delete:** a single idempotent `POST /:questionId` toggle keeps the client
  simple and mirrors the vote toggle. ✔
