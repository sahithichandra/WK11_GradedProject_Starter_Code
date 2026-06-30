# Spec — Feature 2: Edit Your Own Questions and Answers

**Status:** Ready for implementation · **Author:** agentic workflow (Stage 2) · **Related:** [edit-posts-plan.md](./edit-posts-plan.md)

## 1. Summary

On the **individual question page** (`/question/:id`) only, the author of a question can edit its
**title, description, and tags**, and the author of an answer can edit its **text**. Edit is triggered
by a small **pencil icon** (`FaEdit`) shown only to the author, which reveals an inline form pre-filled
with the current content. Saving persists via the existing `PUT` endpoints and shows the updated
content **immediately** (Redux), with no page reload; Cancel discards. Blank/invalid content is
rejected both client- and server-side. After any successful edit the post shows an **"(edited)"**
indicator; a never-edited post does not. The server already restricts editing to the author/admin
(403 otherwise) — that is preserved and the UI hides the affordance from non-authors.

## 2. Existing capability (reuse — do NOT rebuild)

- ✅ `PUT /api/questions/:id` → `updateQuestion` → `updateQuestionService` (author/admin check, 403).
- ✅ `PUT /api/answers/:answerId` → `updateAnswer` → `updateAnswerService` (author/admin check, 403).
- ✅ `config.js` already declares `QUESTION_API.UPDATE(id)` and `ANSWER_API.UPDATE(answerId)`.

**Genuinely missing:** an "edited" flag on the models (set only on edit); server-side empty-content
validation on update; populated update response for questions; frontend service functions, Redux
thunks, and all edit UI + the "edited" indicator.

## 3. User-facing behaviour & acceptance criteria

1. **AC1 — Edit only on the detail page.** The edit pencil appears on `QuestionContent` and on each
   answer in `AnswerList` (both rendered by `/question/:id`). It appears **nowhere** in the feed
   (`QuestionCard`/`Home`) or other list views.
2. **AC2 — Author-only affordance (question).** The question's pencil shows **only** when
   `question.author._id === userInfo.userId`. A non-author / anonymous visitor never sees it.
3. **AC3 — Author-only affordance (answer).** Each answer's pencil shows **only** when
   `answer.author._id === userInfo.userId`.
4. **AC4 — Edit question fields.** Activating the question pencil reveals an inline form pre-filled
   with the current **title**, **description**, and **tags** (tags as the comma-separated names).
   Saving updates all three.
5. **AC5 — Edit answer text.** Activating an answer's pencil reveals an inline textarea pre-filled
   with the current answer text. Saving updates it.
6. **AC6 — Immediate update, no reload.** After a successful save the new content (incl. updated tag
   names for a question) renders in place via Redux state — no full page reload.
7. **AC7 — Cancel discards.** Cancelling closes the form and leaves the original content unchanged;
   re-opening the form again shows the (still-current) content.
8. **AC8 — Blank/invalid prevented (client).** With an empty title or empty description (question), or
   empty text (answer), Save is blocked client-side (disabled/early-return with a message) — no
   request sent.
9. **AC9 — Blank/invalid prevented (server).** The server rejects an update with empty/whitespace
   title or description (question) or empty text (answer) with **400** and a clear message, even if
   the client check is bypassed.
10. **AC10 — Server authorization.** `PUT` by a non-author non-admin returns **403** and does not
    modify the post (already implemented — must remain true and be covered by a test).
11. **AC11 — "edited" indicator accuracy.** After a successful edit, the post shows an **"(edited)"**
    marker (near the timestamp). A post never edited shows **no** marker.
12. **AC12 — Voting/viewing must not flip "edited".** Up/down-voting or viewing a question or answer
    must **not** cause it to display "(edited)". (The indicator is driven by an explicit flag, not
    `updatedAt`.)

## 4. Out of scope

- Deleting questions/answers. · Editing tags on answers (answers have only text). · Edit history /
  diff / "edited at" timestamp display (a boolean flag is sufficient). · Editing from the feed.

## 5. Data model changes

Add an explicit edited flag to **both** content models (additive; existing/seeded docs default to
`false` → no false "(edited)"):

- **`models/Question.js`**: `isEdited: { type: Boolean, default: false }`
- **`models/Answer.js`**: `isEdited: { type: Boolean, default: false }`

> **Why a flag, not `updatedAt`.** Both models use `{ timestamps: true }`, but voting (`handleVote`
> `.save()`) and view-counting (`getQuestionByIdService` `$inc: { views }`) bump `updatedAt`. So
> `updatedAt > createdAt` would falsely mark voted/viewed posts as edited (violates AC12). The flag
> is set **only** inside the update services. (Supports AC11/AC12.)

## 6. API contract (mostly existing — changes are additive)

### 6.1 `PUT /api/questions/:id` (auth) — existing, enhanced
- **Request body:** `{ title, description, tags }` (`tags` = comma-separated string, as today).
- **200:** `{ success:true, message:"Question updated successfully", data: <question> }` where `data`
  is now **populated** (`author:{_id,name}`, `tags:[{_id,name}]`) and includes `isEdited:true` — same
  shape as `GET /api/questions/:id` so the client can drop it straight into `currentQuestion`.
- **400 (new):** empty/whitespace `title` or `description` → `{ success:false, message:"Title and description are required" }`.
- **403:** non-author/non-admin (existing). · **404:** unknown id (existing). · **401:** no token.

### 6.2 `PUT /api/answers/:answerId` (auth) — existing, enhanced
- **Request body:** `{ answerText }`.
- **200:** `{ success:true, message:"Answer updated successfully", data: <answer> }` with
  `author:{_id?,name}` populated (existing) and `isEdited:true`.
- **400 (new):** empty/whitespace `answerText` → `{ success:false, message:"Answer text is required" }`.
- **403 / 404 / 401:** as existing.

## 7. Backend changes (layered)

| Layer | File | Change |
|------|------|--------|
| Model | `src/models/Question.js` | Add `isEdited` boolean (default false). |
| Model | `src/models/Answer.js` | Add `isEdited` boolean (default false). |
| Service | `src/services/questionService.js` `updateQuestionService` | (a) After the auth check, validate non-empty title/description → `createAppError("Title and description are required", 400)`. (b) Add `isEdited: true` to the `findByIdAndUpdate` update object. (c) **Populate** the returned doc (`.populate({path:"author",select:"name"}).populate("tags")`) so the response matches `getQuestionByIdService`. |
| Service | `src/services/answerService.js` `updateAnswerService` | (a) Validate non-empty `answerText` → `createAppError("Answer text is required", 400)`. (b) Set `answer.isEdited = true` before `answer.save()`. (Return already populates `author`.) |

No controller/route changes (already wired). Authorization is unchanged.

## 8. Frontend changes (config → service → slice → component)

| Layer | File | Change |
|------|------|--------|
| Config | `src/config/config.js` | Already has `QUESTION_API.UPDATE`, `ANSWER_API.UPDATE` — no change. |
| Service | `src/services/questionService.js` | Add `updateQuestion(id, { title, description, tags }, token)` → `PUT QUESTION_API.UPDATE(id)` with Bearer header; return `res.data.data`. |
| Service | `src/services/answerService.js` | Add `updateAnswer(answerId, answerText, token)` → `PUT ANSWER_API.UPDATE(answerId)`; return `res.data.data`. |
| Slice | `src/reducers/questionSlice.js` | Add thunk `updateQuestion({ questionId, title, description, tags })` (token from state). On `fulfilled`: replace `currentQuestion` with payload (populated) and update the matching entry in `questions`. Add thunk `updateAnswer({ answerId, answerText })`. On `fulfilled`: in `currentQuestion.answers`, replace the answer with matching `_id` by the payload. `rejected` → set `error`. |
| Component | `src/components/Question/QuestionContent.jsx` | If author, show `FaEdit` pencil. Toggle inline edit form (Bootstrap `Form` like `AnswerForm`): inputs for title, description (textarea), tags (text). Pre-fill from `question` (tags joined `tag.name`). Client validation (AC8). Save → `dispatch(updateQuestion(...))`, on success exit edit mode (AC6); Cancel → exit, discard (AC7). Show **"(edited)"** next to "Asked …" when `question.isEdited` (AC11). |
| Component | `src/components/Answer/AnswerList.jsx` | Per answer: if author, show `FaEdit` pencil. Toggle inline textarea pre-filled with `answer.answerText`. Save → `dispatch(updateAnswer(...))`; Cancel discards. Show **"(edited)"** next to the answer's date when `answer.isEdited`. Track which answer id is being edited via local state. |

**No change to `QuestionCard.jsx`** (AC1 — no edit affordance in the feed).

## 9. Test plan

**Backend — `tests/unit/services/questionService.test.js`** (update the existing `updateQuestionService`
block): the success test's `Question.findByIdAndUpdate` mock must return a query-like object whose
`.populate().populate()` resolves the updated question; assert the update object includes
`isEdited:true` (via `objectContaining`); add a test that empty title/description → 400. **answerService
test:** add empty `answerText` → 400; existing success test still passes with `isEdited` set.
**Integration `questions.test.js`/`answers.test.js`:** author edit → 200 + `data.isEdited === true`
(AC11); non-author → 403 (AC10, exists); empty title/answerText → 400 (AC9); a vote on the post leaves
`isEdited` false (AC12).

**Frontend — `questionSlice` test:** `updateQuestion.fulfilled` replaces `currentQuestion` and the
`questions` entry; `updateAnswer.fulfilled` replaces the answer in `currentQuestion.answers`.
**Component tests:** `QuestionContent` — pencil shown for author only (AC2), form pre-filled (AC4),
Save dispatches & empty title blocked (AC8), "(edited)" shown when `isEdited` (AC11); `AnswerList` —
pencil for author only (AC3), edit + "(edited)" (AC5/AC11). Add **MSW** `PUT` handlers + `isEdited`
fields in `mockData.js`.

All existing tests stay green (the one `updateQuestionService` unit mock is updated to support the new
populated return; the integration PUT tests assert only title/description/message and are unaffected).

## 10. Decisions & resolved questions

- **Explicit `isEdited` boolean** over deriving from `updatedAt` — required for AC12. ✔
- **Populate the question update response** to match `GET`, so the edited question (with new tag
  names) drops straight into `currentQuestion` for instant in-place render. Requires updating one
  existing unit-test mock. ✔
- **Pencil icon (`FaEdit`) + inline form**, not a separate edit page — matches the brief and the
  inline `AnswerForm` pattern. ✔
- **Indicator placement:** "(edited)" near the post's timestamp on the detail page. ✔
- **Admin edit** stays allowed by the service (existing) — UI affordance is author-only; admins edit
  via API. Not expanding admin UI (out of scope). ✔
