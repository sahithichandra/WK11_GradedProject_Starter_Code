# Implementation Plan — Feature 2: Edit Your Own Questions and Answers

**Spec:** [edit-posts-spec.md](./edit-posts-spec.md) · **Branch:** `feature/edit-posts` (git worktree, branched from `main` after Bookmarks merges)

## Prerequisites
- Bookmarks merged to `main`; both suites green. (Edit and Bookmarks both touch `QuestionContent.jsx`
  / `config.js` / `store`-adjacent files, so Edit branches **after** Bookmarks to avoid conflicts.)

## Build-order rationale
Bottom-up: **models → services (+ unit tests) → backend integration tests**, then **frontend services
→ slice thunks (+ tests) → components (+ tests)**. Backend `PUT` routes/controllers already exist and
are unchanged, so no forward dependency.

## Capabilities reused (not rebuilt)
- `PUT /api/questions/:id` + `updateQuestionService`, `PUT /api/answers/:answerId` +
  `updateAnswerService` (auth/ownership already done) — only enhanced (flag, validation, populate).
- `config.js` `QUESTION_API.UPDATE` / `ANSWER_API.UPDATE` (already declared).
- `getQuestionByIdService` populate shape — matched by the enhanced question update return.
- `AnswerForm.jsx` — pattern for the inline edit forms.
- The author check pattern `author?._id === userInfo?.userId` (from `VoteButtons`).

---

## BACKEND

### B1 — Models: add `isEdited`
- **Files:** `src/models/Question.js`, `src/models/Answer.js` — add inside each schema:
  ```js
  isEdited: { type: Boolean, default: false },
  ```
- **Done-when:** new/seeded docs default `isEdited:false`; existing model tests pass.

### B2 — `updateQuestionService` (enhance) + update its unit test
- **File:** `src/services/questionService.js`, `updateQuestionService`:
  - After the 403 check, add validation:
    ```js
    if (!title?.trim() || !description?.trim())
      throw createAppError("Title and description are required", 400);
    ```
  - In the update object add `isEdited: true`:
    `findByIdAndUpdate(id, { title, description, tags: tagIds, isEdited: true }, { new: true })`.
  - **Populate the return** to match `getQuestionByIdService`:
    `.populate({ path: "author", select: "name" }).populate("tags")`.
- **Test update (required):** `tests/unit/services/questionService.test.js` →
  `updateQuestionService` "success" test: make `Question.findByIdAndUpdate` return a query-like mock:
  ```js
  Question.findByIdAndUpdate = vi.fn().mockReturnValue({
    populate: vi.fn().mockReturnValue({ populate: vi.fn().mockResolvedValue(mockUpdatedQuestion) }),
  });
  ```
  Assert the update arg includes `isEdited:true` (`expect.objectContaining({ ..., isEdited:true })`).
  Add a new test: empty title/description → rejects 400.
- **Pattern:** the populate-chain mock already used by `getAllQuestionsService` test.
- **Done-when:** `questionService.test.js` green; `data` from the route is populated + `isEdited:true`.

### B3 — `updateAnswerService` (enhance)
- **File:** `src/services/answerService.js`, `updateAnswerService`:
  - Validate: `if (!answerText?.trim()) throw createAppError("Answer text is required", 400);`
  - Before `await answer.save();` add `answer.isEdited = true;`
  - (Return already does `Answer.findById(answerId).populate('author','name')`.)
- **Test:** add empty `answerText` → 400 in `answerService.test.js`; existing success test unaffected.
- **Done-when:** `answerService.test.js` green.

### B4 — Backend integration tests
- **Files:** `tests/integration/questions.test.js`, `tests/integration/answers.test.js` — add:
  - Author `PUT` → 200 and `response.body.data.isEdited === true` (AC11).
  - Empty title (question) / empty `answerText` (answer) → 400 (AC9).
  - (403 non-author already covered — keep.) (AC10.)
  - **AC12:** after an upvote on a fresh question/answer, fetch it and assert `isEdited === false`.
- **Done-when:** backend `npm test` green.

---

## FRONTEND

### F1 — Services
- **File:** `src/services/questionService.js` — add:
  ```js
  export const updateQuestion = async (id, { title, description, tags }, token) => {
    const res = await axiosInstance.put(QUESTION_API.UPDATE(id), { title, description, tags },
      { headers: { Authorization: `Bearer ${token}` } });
    return res.data.data;
  };
  ```
- **File:** `src/services/answerService.js` — add:
  ```js
  export const updateAnswer = async (answerId, answerText, token) => {
    const res = await axiosInstance.put(ANSWER_API.UPDATE(answerId), { answerText },
      { headers: { Authorization: `Bearer ${token}` } });
    return res.data.data;
  };
  ```
- **Pattern:** `createQuestion` / `createAnswerForQuestion`.

### F2 — Slice thunks (TEST FIRST)
- **Test:** `tests/unit/reducers/questionSlice.test.jsx` — `updateQuestion.fulfilled` replaces
  `currentQuestion` (new title/tags/isEdited) and updates the matching `questions[i]`;
  `updateAnswer.fulfilled` replaces the matching answer inside `currentQuestion.answers`.
- **File:** `src/reducers/questionSlice.js`:
  - `updateQuestion` thunk: arg `{ questionId, title, description, tags }`; token from state; calls
    service; returns the populated question. `fulfilled` → `state.currentQuestion = payload` (and if
    present, replace in `state.questions`).
  - `updateAnswer` thunk: arg `{ answerId, answerText }`; returns populated answer. `fulfilled` →
    in `state.currentQuestion.answers`, replace the entry whose `_id === payload._id`.
  - Both `rejected` → `state.error = payload`.
- **Pattern:** the existing `voteQuestion`/`postAnswer` thunks + fulfilled reducers.
- **Done-when:** slice tests pass.

### F3 — Question edit UI (TEST FIRST)
- **Test:** `tests/unit/components/QuestionContent.test.jsx` — pencil shown only when author (AC2);
  clicking shows a form pre-filled with title/description/tags (AC4); Save with empty title is blocked
  (AC8); "(edited)" appears when `question.isEdited` true and is absent when false (AC11).
- **File:** `src/components/Question/QuestionContent.jsx`:
  - `const { userInfo } = useSelector(s => s.user);` `const isAuthor = question.author?._id === userInfo?.userId;`
  - Local state `isEditing`, plus controlled `title`/`description`/`tags` (init from `question`;
    `tags` = `question.tags.map(t=>t.name).join(', ')`).
  - When `isAuthor && !isEditing`: show `FaEdit` pencil button (icon-only, `variant="link"`/small).
  - When `isEditing`: inline `Form` (title `Form.Control`, description `as="textarea"`, tags
    `Form.Control`) + Save/Cancel. Save: client-validate non-empty title/description (else `alert` &
    return); `await dispatch(updateQuestion({ questionId: question._id, title, description, tags })).unwrap()`;
    on success `setIsEditing(false)`. Cancel: reset fields from `question` and `setIsEditing(false)`.
  - Near "Asked {date}": `{question.isEdited && <span className="…">(edited)</span>}`.
- **Pattern:** `AnswerForm.jsx` (controlled inputs, dispatch, validation/alert).

### F4 — Answer edit UI (TEST FIRST)
- **Test:** `tests/unit/components/AnswerList.test.jsx` — pencil per answer only when author (AC3);
  edit textarea pre-filled (AC5); "(edited)" when `answer.isEdited` (AC11).
- **File:** `src/components/Answer/AnswerList.jsx`:
  - `const userInfo = useSelector(s => s.user.userInfo);` local `editingId` + `editText`.
  - Per answer, if `answer.author?._id === userInfo?.userId` and not editing: `FaEdit` pencil →
    `setEditingId(answer._id); setEditText(answer.answerText)`.
  - If `editingId === answer._id`: textarea + Save/Cancel. Save: validate non-empty;
    `dispatch(updateAnswer({ answerId: answer._id, answerText: editText }))`; on success clear editingId.
  - Near the answer date: `{answer.isEdited && <span>(edited)</span>}`.
- **Pattern:** inline form like `AnswerForm`; author check like `VoteButtons`.

### F5 — Frontend MSW + fixtures
- **Files:** `tests/mocks/handlers.js` — add `PUT /api/questions/:id` (returns body merged onto the
  fixture + `isEdited:true`, populated tags) and `PUT /api/answers/:answerId` (returns updated text +
  `isEdited:true`). `tests/mocks/mockData.js` — ensure question/answer fixtures can carry `isEdited`.
- **Done-when:** frontend `npm test` green.

### F6 — Confirm NO edit affordance in the feed
- **Check:** `QuestionCard.jsx` unchanged re: edit (AC1). (Bookmark button is fine there.)

---

## Verification
- `cd devanswers-backend && npm test` and `cd devanswers-frontend && npm test` → all green.
- **Manual** (servers running):
  - As the author, open `/question/:id`: pencil on the question and on your own answer (AC1–AC3).
  - Edit title/description/tags → Save → updates in place, no reload; tag chips reflect new names (AC4/AC6).
  - Edit your answer text → Save → updates in place (AC5/AC6); Cancel discards (AC7).
  - Clear the title and Save → blocked client-side (AC8); via API with empty body → 400 (AC9).
  - Log in as a different user → no pencils on others' posts; API `PUT` as non-author → 403 (AC2/AC3/AC10).
  - Edited posts show "(edited)"; an un-edited post does not; **upvoting does not add "(edited)"** (AC11/AC12).

## Risks / regressions to watch
- **The `updateQuestionService` unit-test mock must be updated** for the new populate chain, or that
  test fails (its `findByIdAndUpdate` currently resolves a plain object).
- Validation must run **after** the existing 404/403 checks so error precedence is unchanged.
- `isEdited` must be set **only** in the update services — never in vote/view paths (AC12).
- Edit affordances must not leak into `QuestionCard`/feed (AC1).
- Keep `data` populated on the question update so `currentQuestion` keeps tag/author objects (no React
  key warnings, working tag links).
- Both suites stay green.
