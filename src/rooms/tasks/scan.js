import {
  and,
  or,
  not,
  creep as creepMatchers,
  target as targetMatchers,
} from '../../utils/matchers';
import {
  getBunkerLocation,
  getStructureOfTypeMapForBunkerAt,
} from '../planner';
import {
  enhanceSources,
} from './common';

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
  if (_.isUndefined(room.memory.sources) || room.memory.sources.find(s => !s.pos)) {
    // Look for safe sources
    const sks = room.memory.sk.map(a => Game.getObjectById(a.id));
    const sources = room.find(FIND_SOURCES);
    room.memory.sources = sources.map(source => ({
      id: source.id,
      sk:  sks.find(sk => sk.pos.getRangeTo(source) < 9),
      pos: [source.pos.x, source.pos.y]
    }));
  }
  if (_.get(room, 'controller.my') || context.sources) {
    enhanceSources(room);
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
  }
  if (_.isUndefined(room.memory.mineral)) {
    // Look for safe sources
    const sks = room.memory.sk.map(a => Game.getObjectById(a.id));
    const minerals = room.find(FIND_MINERALS);
    room.memory.mineral = minerals.map(mineral => ({
      id: mineral.id,
      sk:  sks.find(sk => sk.pos.getRangeTo(mineral) < 9),
      pos: [mineral.pos.x, mineral.pos.y]
    }));
  }

  // Threat assessment
  const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
  room.hostile = {
    workers: hostileCreeps.filter(
      and(
        creepMatchers.work,
        not(creepMatchers.offensive),
      ),
    ),
    hostile: hostileCreeps.filter(creepMatchers.offensive),
    towers: room.find(FIND_HOSTILE_STRUCTURES, {
      filter: and(
        targetMatchers.isTower,
        tower => tower.energy,
      ),
    }),
  };

  if (room.controller) {
    if (_.isUndefined(room.memory.controller)) {
      room.memory.controller = {
        pos: [room.controller.pos.x, room.controller.pos.y],
        id: room.controller.id,
      };
    }

    if (!_.get(room, 'memory.bunker.anchor')) {
      room.memory.bunker = room.memory.bunker || {};
      const spawns = room.find(FIND_MY_SPAWNS);
      if (spawns.length) {
        const spawn = spawns[0];
        room.memory.bunker.anchor = { x: spawn.pos.x - 4, y: spawn.pos.y };
      } else {
        room.memory.bunker.anchor = getBunkerLocation(room, true);
      }
    }
    const containerPositions = getStructureOfTypeMapForBunkerAt(room.memory.bunker.anchor, room, STRUCTURE_CONTAINER, room.controller.level);
    room.memory.bunker.containers = [];
    for (let containerPos of containerPositions) {
      const containers = containerPos.lookFor(LOOK_STRUCTURES);
      if (containers.length) {
        room.memory.bunker.containers.push(containers[0].id);
      }
    }
  }
  yield done();
}
