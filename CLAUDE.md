# DevAnswers — Project Memory

A Stack Overflow–style Q&A app for developers. Two packages in this repo:

- `devanswers-backend/` — Express 5 + Mongoose 8 (MongoDB) REST API, JWT auth.
- `devanswers-frontend/` — React 19 + Redux Toolkit + Vite, React-Bootstrap UI, axios.

> **Golden rule:** Extend the existing architecture; never reinvent it. Before building anything,
> check whether the capability already exists (some backend endpoints already do). Build only what
> is genuinely missing, and match the surrounding code's naming, layering, and idioms exactly.

---

## Commands

| Task | Backend (`devanswers-backend/`) | Frontend (`devanswers-frontend/`) |
|------|-------------------------------|-----------------------------------|
| Install | `npm install` | `npm install` |
| Dev server | `npm run dev` (nodemon, port 3000) | `npm run dev` (Vite, port 5173) |
| Seed DB | `npm run populate` | — |
| Tests | `npm test` (Vitest run) | `npm test` (Vitest run) |
| Lint | — | `npm run lint` (ESLint) |

Backend needs a `.env` (copy `.env.example`). A `GEMINI_API_KEY` is only needed for the existing
AI features; it is **not** required for bookmarks or edit. Frontend axios base URL is hard-coded to
`http://localhost:3000/api` in `src/api/axiosInstance.js`.

---

## Backend architecture (`devanswers-backend/src/`)

**Layering — strictly one direction:** `routes/ → controllers/ → services/ → models/`
Routes are mounted under `/api` (`routes/index.js`): `/api/auth`, `/api/questions`, `/api/answers`, `/api/tags`.

- **Modules are ESM** (`"type": "module"`). Controllers/services use **named** exports;
  models use **default** exports. Import with explicit `.js` extensions.
- **Routes** (`routes/*.js`) wire a path + middleware to a controller method. Auth is opt-in per
  route via the `authenticate` middleware: `router.post("/", authenticate, createQuestion)`.
- **Controllers** (`controllers/*.js`) read `req.body` / `req.params` / `req.user`, call a service,
  and send the response envelope. They do **not** contain business logic and do **not** try/catch —
  thrown errors bubble to the error handler.
- **Services** (`services/*.js`) hold business logic + all DB access. They **throw**
  `createAppError(message, statusCode)` on failure; they never build HTTP responses.
- **Models** (`models/*.js`) are Mongoose schemas.

### Response envelope (every controller, constructed inline — there is no helper)
```js
res.status(200).json({ success: true, message: "…", data: <payload> });
```
On error, `middleware/errorHandler.js` (mounted last in `app.js`) emits:
```js
{ success: false, message: err.message }   // + stack only when NODE_ENV=development
```

### Errors — `utils/createAppError.js`
```js
export function createAppError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
```
Services `throw createAppError("Not found", 404)`. Never `res.status(...).json(...)` from a service.

### Auth — `middleware/authHandler.js`
JWT Bearer token in the `Authorization` header. On success it sets:
```js
req.user = { id: user._id, isAdmin: user.isAdmin };
```
Token payload is `{ id, isAdmin }`, signed with `process.env.JWT_SECRET`. Controllers read
`req.user.id`; **ownership checks live in the service** and use the author/admin pattern:
```js
if (doc.author.toString() !== loggedInUser.id.toString() && !loggedInUser.isAdmin) {
  throw createAppError("Not authorized to update this …", 403);
}
```
Controllers pass `req.user` to services that need the caller (`updateQuestionService(id, …, req.user)`).

### Models (all use `{ timestamps: true }` → `createdAt`, `updatedAt`)
- **User**: `name, email (unique), password, profileImage, isAdmin`. (No bookmarks field yet.)
- **Question**: `title, description, tags:[ref Tag], upvotes:[ref User], downvotes:[ref User], voteCount, views, author:(ref User, required)`.
- **Answer**: `questionId:(ref Question), answerText, author:(ref User), upvotes, downvotes, voteCount`.
- **Tag**: `name (unique)`, own `createdAt` (no `timestamps`).

> ⚠️ **`updatedAt` is not a reliable "edited" signal.** Voting (`.save()`) and view-counting also
> bump `updatedAt`. To mark a post as edited, use an **explicit flag set only in the update service**.

### Validation
Minimal, manual, in services (e.g. `if (!title || !description) throw createAppError("…", 400)`).
Mongoose `required: true` catches the rest. No joi/zod/yup.

### The vote feature is the canonical per-user toggle (`services/voteService.js`)
`handleVote(Model, id, userId, voteType)` loads the doc, toggles the user's id in the relevant
array, recomputes `voteCount`, and `.save()`s. **Use this as the model for the bookmark toggle.**

### Tests (`devanswers-backend/tests/`)
- **Integration** (`tests/integration/*.test.js`): Supertest against the real `app`, using an
  in-memory Mongo (`tests/setup.js`, `mongodb-memory-server`). Auth via real register+login to get a
  JWT (`createUserAndLogin()` helper). Assert on `response.status` and the `{success,message,data}` body.
- **Unit** (`tests/unit/{controllers,services,middleware,utils}/*.test.js`): Vitest with
  `vi.fn()`/`vi.mock()` mocking the Mongoose query chain; Arrange-Act-Assert; errors via
  `.rejects.toThrow()`. New work should add unit (service) + integration (route) tests on-pattern.

---

## Frontend architecture (`devanswers-frontend/src/`)

**Pattern — one direction:** `config/config.js (endpoints) → services/*.js (axios) → reducers/*Slice.js (Redux thunks) → components & pages`.

- **`config/config.js`** — endpoint constants grouped per resource (`QUESTION_API`, `ANSWER_API`,
  `AUTH_API`, `USER_API`, `AI_API`, `TAG_API`). Static strings or `(id) => \`/path/${id}\`` functions.
- **`api/axiosInstance.js`** — `axios.create({ baseURL: "http://localhost:3000/api" })`. **No
  interceptors**; the auth token is attached **per-request** in the service layer.
- **`services/*.js`** — call the endpoint and **unwrap the envelope**: `return res.data.data`.
  Authenticated calls take a `token` arg and pass `{ headers: { Authorization: \`Bearer ${token}\` } }`.
- **`reducers/*Slice.js`** — Redux Toolkit `createSlice` + `createAsyncThunk`. Thunks read the token
  from state: `const { token } = getState().user.userInfo || {}`. Reducers handle
  `pending/fulfilled/rejected` and update both `questions` (feed) and `currentQuestion` (detail) where
  relevant. Errors via `rejectWithValue(error.response?.data?.message || "…")`.
- **`store.js`** — registers slices: `user`, `question`, `theme`.

### Auth state (`reducers/userSlice.js`)
`userInfo = { token, userId, name }` persisted in `localStorage` (key `"userInfo"`) and held in
`state.user.userInfo`. Logged-in check: `const isAuthenticated = !!userInfo` (or selector
`selectIsAuthenticated`). **Current-user / author check in components:**
`someAuthor?._id === userInfo?.userId`.

### UI conventions
- **React-Bootstrap** components (`Card, Button, Form, Row, Col, Badge, Spinner, Alert, Pagination`).
- **Icons: `react-icons`** (Font Awesome set), e.g. `FaArrowUp`, `FaUser`, `FaClock`, `FaEdit`,
  `FaPlus`. Use `FaRegBookmark` / `FaBookmark` (outline vs filled) for bookmarks and `FaEdit` (pencil)
  for edit. Component CSS lives next to the component (`Foo.jsx` + `Foo.css`).
- **Auth-gated affordances**: guard the click and `alert(...)` if not logged in (see
  `components/Shared/VoteButtons.jsx`). **Author-only affordances**: render conditionally with
  `author?._id === userInfo?.userId`.
- **`VoteButtons.jsx`** is the reusable per-user toggle control + auth/self guards — the closest
  pattern to a bookmark button.

### Key screens
- `pages/Question/Home.jsx` — the feed → `components/Question/QuestionList.jsx` →
  `QuestionCard.jsx` (one card per question). **List view: bookmark control OK, no edit affordance.**
- `pages/Question/QuestionDetail.jsx` (route `/question/:id`) → `QuestionContent.jsx` (the single
  question) + `AnswerList.jsx` + `AnswerForm.jsx`. **This is the only place edit affordances appear.**
- `pages/Profile/Profile.jsx` — avatar, editable profile form, Activity Stats. **"Saved Questions"
  section goes here**, rendered with the existing `QuestionList` UI + a friendly empty state.
- `components/Answer/AnswerForm.jsx` — the inline form pattern to mirror for inline edit forms.

### Tests (`devanswers-frontend/tests/`)
Vitest + React Testing Library + `@testing-library/user-event`; API mocked with **MSW**
(`tests/mocks/{server,handlers,mockData}.js`). Component/page tests render inside a real
`configureStore` + `<Provider>` (+ `<BrowserRouter>` where routing is used). Slice tests dispatch
`thunk.pending/fulfilled/rejected` against the reducer. Add MSW handlers for any new endpoint.

---

## Current capability status (verified) — build only what's missing

**Edit posts (Feature 2):**
- ✅ Backend `PUT /api/questions/:id` (`updateQuestion` → `updateQuestionService`) and
  `PUT /api/answers/:answerId` (`updateAnswer` → `updateAnswerService`) exist with author/admin auth.
- ✅ Frontend `config.js` already declares `QUESTION_API.UPDATE` and `ANSWER_API.UPDATE`.
- ❌ **Missing:** an "edited" flag on the models (and setting it in the update services); frontend
  service functions (`updateQuestion`, `updateAnswer`), Redux thunks, and all edit UI.

**Bookmarks (Feature 1):** ❌ Nothing exists — User model field, endpoints, service, slice, UI, and
the profile section are all to be built. Model the toggle on the vote feature.

**Out of scope:** deleting questions/answers; bookmarking answers; folders/tags/notes/sharing/export
of saved questions.

## Hard constraints
- Don't break existing question/answer/auth/vote/AI flows. **Both test suites must stay green.**
- Stay within the layering and the `{success,message,data}` envelope on the backend, and the
  config→service→slice→component pattern on the frontend.
- Toggle/edit must update the UI immediately (Redux), without a full page reload.
