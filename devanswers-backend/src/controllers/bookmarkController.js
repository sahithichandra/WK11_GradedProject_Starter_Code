import {
  toggleBookmarkService,
  getBookmarksService,
} from "../services/bookmarkService.js";

export const toggleBookmark = async (req, res) => {
  const { questionId } = req.params;
  const { bookmarked } = await toggleBookmarkService(req.user.id, questionId);

  res.status(200).json({
    success: true,
    message: bookmarked
      ? "Bookmark added successfully"
      : "Bookmark removed successfully",
    data: { questionId, bookmarked },
  });
};

export const getBookmarks = async (req, res) => {
  const bookmarks = await getBookmarksService(req.user.id);

  res.status(200).json({
    success: true,
    message: "Bookmarks fetched successfully",
    data: bookmarks,
  });
};
