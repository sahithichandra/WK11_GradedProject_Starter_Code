import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  toggleBookmarkService,
  getBookmarksService,
} from "../../../src/services/bookmarkService.js";
import User from "../../../src/models/User.js";
import Question from "../../../src/models/Question.js";
import Answer from "../../../src/models/Answer.js";

vi.mock("../../../src/models/User.js");
vi.mock("../../../src/models/Question.js");
vi.mock("../../../src/models/Answer.js");

describe("bookmarkService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toggleBookmarkService", () => {
    it("should add the question when it is not already bookmarked", async () => {
      // Arrange
      const userId = "user123";
      const questionId = "question123";
      const mockUser = { bookmarks: [], save: vi.fn().mockResolvedValue(true) };

      Question.findById = vi.fn().mockResolvedValue({ _id: questionId });
      User.findById = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await toggleBookmarkService(userId, questionId);

      // Assert
      expect(result).toEqual({ questionId, bookmarked: true });
      expect(mockUser.bookmarks).toContain(questionId);
      expect(mockUser.save).toHaveBeenCalledTimes(1);
    });

    it("should remove the question when it is already bookmarked", async () => {
      // Arrange
      const userId = "user123";
      const questionId = "question123";
      const mockUser = {
        bookmarks: [questionId],
        save: vi.fn().mockResolvedValue(true),
      };

      Question.findById = vi.fn().mockResolvedValue({ _id: questionId });
      User.findById = vi.fn().mockResolvedValue(mockUser);

      // Act
      const result = await toggleBookmarkService(userId, questionId);

      // Assert
      expect(result).toEqual({ questionId, bookmarked: false });
      expect(mockUser.bookmarks).not.toContain(questionId);
      expect(mockUser.save).toHaveBeenCalledTimes(1);
    });

    it("should throw 404 when the question does not exist", async () => {
      Question.findById = vi.fn().mockResolvedValue(null);

      await expect(
        toggleBookmarkService("user123", "missing"),
      ).rejects.toThrow("Question not found");
      await expect(
        toggleBookmarkService("user123", "missing"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 404 when the user does not exist", async () => {
      Question.findById = vi.fn().mockResolvedValue({ _id: "question123" });
      User.findById = vi.fn().mockResolvedValue(null);

      await expect(
        toggleBookmarkService("missing", "question123"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("getBookmarksService", () => {
    it("should return saved questions with an answerCount", async () => {
      const mockQuestions = [
        { _id: "q1", toObject: () => ({ _id: "q1", title: "Q1" }) },
        { _id: "q2", toObject: () => ({ _id: "q2", title: "Q2" }) },
      ];
      User.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue({ bookmarks: mockQuestions }),
      });
      Answer.countDocuments = vi.fn().mockResolvedValue(3);

      const result = await getBookmarksService("user123");

      expect(result).toEqual([
        { _id: "q1", title: "Q1", answerCount: 3 },
        { _id: "q2", title: "Q2", answerCount: 3 },
      ]);
    });

    it("should throw 404 when the user does not exist", async () => {
      User.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      await expect(getBookmarksService("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
