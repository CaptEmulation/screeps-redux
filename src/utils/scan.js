export function* walkBox(pos, size = 1) {
  const leftSize = (pos.x > (1 + size) ? size : 0);
  const rightSize = (pos.x < (49 - size) ? size : 0);
  const topSize = (pos.y > (1 + size) ? size : 0);
  const bottomSize = (pos.y < (49 - size) ? size : 0);

  if (topSize) {
    for (let x = -leftSize; x <= rightSize; x++) {
      const xPos = pos.x + x;
      if (xPos < 49 && xPos > 1) {
        yield [xPos, pos.y - size];
      }
    }
  }

  for (let y = -(size - 1); y <= (size - 1); y++) {
    const yPos = pos.y + y;
    if (yPos < 49 && yPos > 1) {
      if (leftSize) {
        yield [pos.x - size, yPos];
      }
      if (rightSize) {
        yield [pos.x + size, yPos];
      }
    }
  }

  if (bottomSize) {
    for (let x = -size; x <= size; x++) {
      const xPos = pos.x + x;
      if (xPos < 49 && xPos > 1) {
        yield [xPos, pos.y + size];
      }
    }
  }
}

export function* walkBox2(pos, size = 1) {
  for (let x = -(pos.x > (1 + size) ? size : 0); x <= (pos.x > (48 - size) ? size : 0); x++) {
    yield [pos.x + x, pos.y - size];
  }
  for (let y = -(size - 1); y <= (size - 1); y++) {
    yield [pos.x - size, pos.y + y];
    yield [pos.x + size, pos.y + y];
  }
  for (let x = -(pos.x > (3 - size) ? size : 0); x <= size; x++) {
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
