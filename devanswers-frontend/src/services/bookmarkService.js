import axiosInstance from "../api/axiosInstance.js";
import { BOOKMARK_API } from "../config/config.js";

export const getBookmarks = async (token) => {
  const res = await axiosInstance.get(BOOKMARK_API.LIST, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data || [];
};

export const toggleBookmark = async (questionId, token) => {
  const res = await axiosInstance.post(
    BOOKMARK_API.TOGGLE(questionId),
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.data;
};
