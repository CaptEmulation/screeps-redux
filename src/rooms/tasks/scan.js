import {
  target as targetMatchers,
} from '../../utils/matchers';

export default function* scan(room, {
  priority,
}) {
  yield priority(context.priority);
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
    room.memory.sources = sources.map(source => ({
      id: source.id,
    }));
  }
  if (room.controller && room.controller.my) {
    const noContainerSources = room.memory.sources.filter(s => !s.containerId);
    if (noContainerSources.length) {
      const containers = room.find(FIND_STRUCTURES, {
        filter: targetMatchers.isContainer,
      });
      if (containers.length) {
        for (let i = 0; i < noContainerSources.length; i++) {
          const { id: sourceId } = noContainerSources[i];
          const source = Game.getObjectById(sourceId);
          if (source) {
            const container = source.pos.findInRange(containers, 1);
            if (container) {
              noContainerSources[i].containerId = container.id;
            }
          }
        }
      }
    }
  }
  yield done();
}
