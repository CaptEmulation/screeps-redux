import {
  walkBox,
} from '../../utils/scan';

export function freeSpotsAtSource(source) {
  const terrain = new Room.Terrain(source.room.name);
  return [...walkBox(source.pos, 1)].filter(([x, y]) => terrain.get(x, y) !== 1);
}

export function getSourceId(creep) {
  if (creep.room.memory.sources && creep.room) {
    let target;
    let sourceId;
    if (_.isUndefined(creep.room.memory.lastSource)) {
      creep.room.memory.lastSource = 0;
    }
    const sources = creep.room.memory.sources;
    let index = creep.room.memory.lastSource;
    do {
      index++;
      if (index >= sources.length) {
        index = 0;
      }
      const sourceCheck = Game.getObjectById(sources[index].id);
      if (freeSpotsAtSource(sourceCheck).find(spot => new RoomPosition(...spot, creep.room.name).lookFor(LOOK_CREEPS).length === 0)) {
        target = sourceCheck;
        creep.room.memory.lastSource = index;
        sourceId = sourceCheck.id;
      }
      if (!target && index === creep.room.memory.lastSource){
        break;
      }
    } while (!target)
    return sourceId;
  }
}
