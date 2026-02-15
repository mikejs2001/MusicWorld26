class Playlist {
  constructor(name) {
    this.name = name;
    this.tracks = [];
  }

  addTrack(title, artist, durationSeconds) {
    const track = { title, artist, durationSeconds };
    this.tracks.push(track);
    return track;
  }

  removeTrack(title) {
    const index = this.tracks.findIndex((t) => t.title === title);
    if (index === -1) {
      return null;
    }
    return this.tracks.splice(index, 1)[0];
  }

  getTotalDuration() {
    return this.tracks.reduce((sum, t) => sum + t.durationSeconds, 0);
  }

  listTracks() {
    return this.tracks.map((t) => `${t.artist} - ${t.title}`);
  }
}

module.exports = { Playlist };
