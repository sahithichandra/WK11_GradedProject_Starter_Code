import express from "express";

import {
  getBookmarks,
  toggleBookmark,
} from "../controllers/bookmarkController.js";
import authenticate from "../middleware/authHandler.js";

const router = express.Router();

// All bookmark routes require authentication
router.get("/", authenticate, getBookmarks);
router.post("/:questionId", authenticate, toggleBookmark);

export default router;
