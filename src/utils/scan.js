export function* walkBox(pos, size = 1) {
  for (let x = -size; x <= size; x++) {
    yield [pos.x + x, pos.y - size];
  }
  for (let y = -(size - 1); y <= (size - 1); y++) {
    yield [pos.x - size, pos.y + y];
    yield [pos.x + size, pos.y + y];
  }
  for (let x = -size; x <= size; x++) {
    yield [pos.x + x, pos.y + size];
  }
}

export function creepsByRoom() {
  if (!Game.creepsByRoom) {
    Game.creepsByRoom = Object.entries(Game.rooms).reduce((r, [name, room]) => {
      if (room.controller && room.controller.my) {
        r.push({
          room,
          creeps: Object.values(Game.creeps).reduce((creepInfo, creep) => {
            if (creep.memory.home === room.name) {
              creepInfo[creep.memory.role] = creepInfo[creep.memory.role] || [];
              creepInfo[creep.memory.role].push(creep);
            }
            return creepInfo;
          }, {}),
        });
      }
      return r;
    }, []);
  }
  return Game.creepsByRoom;
}
