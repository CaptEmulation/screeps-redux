import {
  target as targetMatchers,
} from '../../utils/matchers';
import {
  getBunkerLocation,
  getStructureOfTypeMapForBunkerAt,
} from '../planner';

export default function* scan(room, {
  priority,
  context,
  done,
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
  if (room.controller) {
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
            const inRangeContainers = source.pos.findInRange(containers, 1);
            if (inRangeContainers.length) {
              noContainerSources[i].containerId = inRangeContainers[0].id;
            }
          }
        }
      }
    }

    if (!room.memory.bunker) {
      room.memory.bunker = {};
    }
    if (room.memory.bunker.anchor) {
      const spawns = room.find(FIND_MY_SPAWNS);
      if (spawns.length) {
        const spawn = spawns[0];
        room.memory.bunker.anchor = { x: spawn.pos.x - 4, y: spawn.pos.y };
      } else {
        room.memory.bunker.anchor = getBunkerLocation(room, true);
      }
    }
    if (room.memory.bunker.anchor) {
      const containerPositions = getStructureOfTypeMapForBunkerAt(room.memory.bunker.anchor, room, STRUCTURE_CONTAINER, room.controller.level);
      room.memory.bunker.containers = [];
      for (let containerPos of containerPositions) {
        const containers = containerPos.lookFor(LOOK_STRUCTURES);
        if (containers.length) {
          room.memory.bunker.containers.push(containers[0].id);
        }
      }
    }
  }
  yield done();
}
