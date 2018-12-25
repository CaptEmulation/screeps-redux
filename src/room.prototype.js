
if (!Object.keys(Room.prototype).includes('sources')) {
  Object.defineProperties(Room.prototype, {
    sources: {
      get() {
        return this.find(FIND_SOURCES);
      },
    },
    minerals: {
      get() {
        return this.find(FIND_MINERALS);
      }
    },
  });
}


Room.prototype.addTask = function addRoomTask(...args) { return global.addRoomTask(this.name, ...args); };
