export function *scan(room, {
  priority,
}) {
  yield priority(10);
  if (_.isUndefined(room.memory.sk)) {
    // Look for hostile structures to avoid
    const sks = room.find(FIND_HOSTILE_STRUCTURES, {
      filter(structure) {
        return structure.structureType === 'keeperLair';
      }
    })
    room.memory.sk = sks.map(sk => ({
      id: sk.id,
    }));
  }
  if (_.isUndefined(room.memory.sources)) {
    // Look for safe sources
    const sks = room.memory.sk.map(a => Game.getObjectById(a.id));
    const sources = room.find(FIND_SOURCES, {
      filter(source) {
        return !sks.find(sk => sk.pos.getRangeTo(source) < 9);
      },
    });
    console.log(sources);
    room.memory.sources = sources.map(source => ({
      id: source.id,
    }));
  }
}
