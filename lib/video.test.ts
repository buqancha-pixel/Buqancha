import { test } from "node:test";
import assert from "node:assert/strict";
import { isVertical, parseVideoUrl, videoEmbedUrl } from "./video.ts";

test("YouTube havolalari", () => {
  assert.equal(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10").id, "dQw4w9WgXcQ");
  assert.equal(parseVideoUrl("youtu.be/dQw4w9WgXcQ").id, "dQw4w9WgXcQ");
  const s = parseVideoUrl("https://youtube.com/shorts/abcdefghijk?si=x");
  assert.equal(s.id, "abcdefghijk");
  assert.equal(videoEmbedUrl(s), "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0");
  assert.throws(() => parseVideoUrl("https://www.youtube.com/@kanal"));
});

test("Instagram va TikTok", () => {
  const ig = parseVideoUrl("https://www.instagram.com/reel/C8xYz12AbCd/?igsh=abc");
  assert.deepEqual([ig.platform, ig.id], ["instagram", "C8xYz12AbCd"]);
  assert.equal(isVertical(ig), true);
  const tt = parseVideoUrl("https://www.tiktok.com/@kitobxon/video/7301234567890123456?lang=uz");
  assert.deepEqual([tt.platform, tt.id], ["tiktok", "7301234567890123456"]);
  assert.throws(() => parseVideoUrl("https://vm.tiktok.com/ZMabc/"));
  assert.throws(() => parseVideoUrl("https://example.com/video.mp4"));
});
