import User from "../models/User.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import { createAppError } from "../utils/createAppError.js";

// Toggle a question in the logged-in user's bookmarks.
// Mirrors the per-user toggle pattern in voteService.handleVote, but stores
// the saved set on the User document so bookmarks are private per user.
export const toggleBookmarkService = async (userId, questionId) => {
  const question = await Question.findById(questionId);
  if (!question) {
    throw createAppError("Question not found", 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createAppError("User not found", 404);
  }

  const alreadySaved = user.bookmarks.some(
    (id) => id.toString() === questionId.toString(),
  );

  user.bookmarks = alreadySaved
    ? user.bookmarks.filter((id) => id.toString() !== questionId.toString())
    : [...user.bookmarks, questionId];

  await user.save();

  return { questionId, bookmarked: !alreadySaved };
};

// Return the user's saved questions, populated and shaped exactly like the
// feed (author name + tags + answerCount) so the existing QuestionList UI can
// render them unchanged. Mirrors getAllQuestionsService's answerCount map.
export const getBookmarksService = async (userId) => {
  const user = await User.findById(userId).populate({
    path: "bookmarks",
    populate: [
      { path: "author", select: "name" },
      { path: "tags" },
    ],
  });

  if (!user) {
    throw createAppError("User not found", 404);
  }

  return Promise.all(
    user.bookmarks.map(async (q) => {
      const answerCount = await Answer.countDocuments({ questionId: q._id });
      return { ...(q.toObject?.() ?? q), answerCount };
    }),
  );
};
