import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import "../setup.js";
import app from "../../src/app.js";
import Question from "../../src/models/Question.js";
import Tag from "../../src/models/Tag.js";
import User from "../../src/models/User.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let userA;
let tokenA;
let tokenB;

beforeAll(async () => {
  ({ user: userA, token: tokenA } = await createUserAndLogin("alice"));
  ({ token: tokenB } = await createUserAndLogin("bob"));
});

async function createUserAndLogin(prefix = "user") {
  const email = `${prefix}+${Date.now()}-${Math.random()}@example.com`;
  const password = "password123";

  const userRes = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test User", email, password, isAdmin: false });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return { user: userRes.body.data, token: loginRes.body.data.token };
}

async function createQuestion(author) {
  const tag = new Tag({ name: `tag-${Date.now()}-${Math.random()}` });
  await tag.save();

  const question = new Question({
    title: "How to use async/await?",
    description: "I am trying to understand async/await in JavaScript",
    tags: [tag._id],
    author: author || userA._id,
  });
  await question.save();
  return question;
}

describe("Bookmarks API", () => {
  beforeEach(async () => {
    await Question.deleteMany({});
    await Tag.deleteMany({});
    await User.updateMany({}, { $set: { bookmarks: [] } });
  });

  it("POST /api/bookmarks/:questionId -> toggles a question saved then unsaved", async () => {
    const question = await createQuestion();

    const saveRes = await request(app)
      .post(`/api/bookmarks/${question._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);
    expect(saveRes.body.message).toBe("Bookmark added successfully");
    expect(saveRes.body.data.bookmarked).toBe(true);

    const unsaveRes = await request(app)
      .post(`/api/bookmarks/${question._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(unsaveRes.status).toBe(200);
    expect(unsaveRes.body.message).toBe("Bookmark removed successfully");
    expect(unsaveRes.body.data.bookmarked).toBe(false);
  });

  it("GET /api/bookmarks -> returns the user's saved questions, populated, with answerCount", async () => {
    const question = await createQuestion();

    await request(app)
      .post(`/api/bookmarks/${question._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    const res = await request(app)
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(question._id.toString());
    expect(res.body.data[0].author).toHaveProperty("name");
    expect(Array.isArray(res.body.data[0].tags)).toBe(true);
    expect(res.body.data[0].answerCount).toBe(0);
  });

  it("GET /api/bookmarks -> returns 401 without authentication", async () => {
    const res = await request(app).get("/api/bookmarks");
    expect(res.status).toBe(401);
  });

  it("POST /api/bookmarks/:questionId -> returns 401 without authentication", async () => {
    const question = await createQuestion();
    const res = await request(app).post(`/api/bookmarks/${question._id}`);
    expect(res.status).toBe(401);
  });

  it("POST /api/bookmarks/:questionId -> returns 404 for a non-existent question", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/bookmarks/${fakeId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question not found");
  });

  it("bookmarks are per-user -> user B does not see user A's saved questions", async () => {
    const question = await createQuestion();

    await request(app)
      .post(`/api/bookmarks/${question._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    const resB = await request(app)
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data).toHaveLength(0);
  });
});
