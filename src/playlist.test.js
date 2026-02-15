const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { Playlist } = require("./playlist");

describe("Playlist", () => {
  it("should create a playlist with a name", () => {
    const p = new Playlist("Rock Classics");
    assert.equal(p.name, "Rock Classics");
    assert.equal(p.tracks.length, 0);
  });

  it("should add tracks", () => {
    const p = new Playlist("Test");
    const track = p.addTrack("Song A", "Artist A", 200);
    assert.equal(track.title, "Song A");
    assert.equal(p.tracks.length, 1);
  });

  it("should remove tracks by title", () => {
    const p = new Playlist("Test");
    p.addTrack("Song A", "Artist A", 200);
    p.addTrack("Song B", "Artist B", 180);
    const removed = p.removeTrack("Song A");
    assert.equal(removed.title, "Song A");
    assert.equal(p.tracks.length, 1);
  });

  it("should return null when removing a non-existent track", () => {
    const p = new Playlist("Test");
    assert.equal(p.removeTrack("Nope"), null);
  });

  it("should calculate total duration", () => {
    const p = new Playlist("Test");
    p.addTrack("A", "X", 100);
    p.addTrack("B", "Y", 200);
    assert.equal(p.getTotalDuration(), 300);
  });

  it("should list tracks as formatted strings", () => {
    const p = new Playlist("Test");
    p.addTrack("Song A", "Artist A", 100);
    p.addTrack("Song B", "Artist B", 200);
    assert.deepEqual(p.listTracks(), [
      "Artist A - Song A",
      "Artist B - Song B",
    ]);
  });
});
