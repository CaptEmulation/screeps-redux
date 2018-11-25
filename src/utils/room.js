
export function exits(name) {
  const pre1 = name[0];
  const leftright = parseInt(name[1]);
  const pre2 = name[2];
  const topbottom = parseInt(name[3]);
  return [
    `${pre1}${leftright}${pre2}${topbottom + 1}`,
    `${pre1}${leftright - 1}${pre2}${topbottom }`,
    `${pre1}${leftright}${pre2}${topbottom - 1 }`,
    `${pre1}${leftright + 1}${pre2}${topbottom }`,
  ];
}

export function roomName(name, exitDir) {
  let pre1 = name[0],
      leftright = parseInt(name[1]),
      pre2 = name[2],
      topbottom = parseInt(name[3]);

  switch (exitDir) {
  case FIND_EXIT_TOP:
      topbottom++;
      break;
  case FIND_EXIT_BOTTOM:
      topbottom--;
      break;
  case FIND_EXIT_RIGHT:
      leftright--;
      break;
  case FIND_EXIT_LEFT:
      leftright++;
      break;
  default:
      throw new Error('invalid direction ' + exitDir);
  }
  let newRoom = pre1 + leftright + pre2 + topbottom;
  return newRoom;
}


function toJSON(obj) {
  return obj.toJSON();
}

function Rect({ top, right, bottom, left }) {
  const rect = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    get size() {
      return (rect.bottom - rect.top) * (rect.right - rect.left);
    }
  };
  return rect;
}

export function findOpenSpace(terrain) {
  let maxX = 0;
  let maxY = 0;
  let maxRect;
  let vertRanges = [];
  for (let y = 0; y < 50; y++) {
    let runX = 0;
    for (let x = 0; x < 50; x++) {
      if (terrain.get(x, y) === 0) {
        runX++;
        if (y > 0) {
          vertRanges[x]++;
        }

      } else if (y > 1 && runX > 1 && vertRanges[x] > 1){
        const newRect = Rect({
          top: y - vertRanges[x],
          right: x - 1,
          bottom: y - 1,
          left: x - runX,
        });
        if (!maxRect || newRect.size > maxRect.size) {
          maxRect = newRect;
        }
        vertRanges[x] = 0;
        runX = 0;
      } else {
        vertRanges[x] = 0;
        runX = 0;
      }
    }
  }
}

export function flagRoom(roomName, name, color, secondaryColor) {
  const rect = findOpenSpace(new Terrain(roomName));
  if (rect) {
    const pos = new RoomPosition(rect.right - rect.left, rect.bottom - rect.top. roomName);
    return pos.createFlag(name, color, secondaryColor);
  }
  return rect;
}

export function scout(room) {
  const structures = room.find(FIND_HOSTILE_STRUCTURES).map(toJSON);
  const creeps = room.find(FIND_HOSTILE_CREEPS).map(toJSON);
  const sources = room.find(FIND_SOURCES).map(toJSON);

  const exits = {
    top: roomName(room.name, FIND_EXIT_TOP),
    right: roomName(room.name, FIND_EXIT_RIGHT),
    bottom: roomName(room.name, FIND_EXIT_BOTTOM),
    left: roomName(room.name, FIND_EXIT_LEFT),
  }
  const resources = room.find(FIND_DROPPED_RESOURCES).map(toJSON);
  const minerals = room.find(FIND_MINERALS).map(toJSON);

  return {
    name: room.name,
    structures,
    creeps,
    sources,
    exits,
    resources,
    minerals,
  };
}
