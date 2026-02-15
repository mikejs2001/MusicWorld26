const { Playlist } = require("./playlist");

const myPlaylist = new Playlist("My Favorites");

myPlaylist.addTrack("Bohemian Rhapsody", "Queen", 354);
myPlaylist.addTrack("Imagine", "John Lennon", 187);
myPlaylist.addTrack("Hotel California", "Eagles", 391);

console.log(`Playlist: ${myPlaylist.name}`);
console.log("Tracks:");
for (const line of myPlaylist.listTracks()) {
  console.log(`  - ${line}`);
}
console.log(
  `Total duration: ${Math.floor(myPlaylist.getTotalDuration() / 60)}m ${myPlaylist.getTotalDuration() % 60}s`,
);
