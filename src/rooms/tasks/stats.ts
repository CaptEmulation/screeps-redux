import ScreepsStats from 'stats/ScreepsStats';
import createOsd from '../../stats/osd';

const statCache = {};

// @ts-ignore
const Stats = global.Stats = new ScreepsStats()

function aggregateEnergyHarvestForSource(room: Room, energySource: Source, lastEnergyTick: number) {
  const priorEnergy = room.memory[`source:${energySource.id}:energy`] || energySource.energy;
  
  let energyHarvested1000ticks = room.memory[`source:${energySource.id}:energyHarvested1000ticks`] || 0;
  // Check if source has refilled since last tick
  if (energySource.energy > priorEnergy) {
    energyHarvested1000ticks = (energyHarvested1000ticks / (1000 - Game.time + lastEnergyTick)) + ((energySource.energyCapacity - energySource.energy) / (Game.time - lastEnergyTick));
  } else {
    energyHarvested1000ticks = (energyHarvested1000ticks / (1000 - Game.time + lastEnergyTick)) + ((priorEnergy - energySource.energy) / (Game.time - lastEnergyTick)); 
  }
  room.memory[`source:${energySource.id}:energyHarvested1000ticks`] = energyHarvested1000ticks;
  room.memory[`source:${energySource.id}:energy`] = energySource.energy;
  return energyHarvested1000ticks
}

function aggregateEnergeHarvestForRoom(room: Room) {
  const lastEnergyTick = room.memory.lastEnergyTick || Game.time;
  let energyHarvested1000ticks: number = room.memory.energyHarvested1000ticks || 0;
  if (lastEnergyTick != Game.time) {
    for (let source of room.find(FIND_SOURCES)) {
      energyHarvested1000ticks += aggregateEnergyHarvestForSource(room, source, lastEnergyTick);
    }
  }

  room.memory.lastEnergyTick = Game.time;
  room.memory.energyHarvested1000ticks = energyHarvested1000ticks;
  return energyHarvested1000ticks
}

export default function* stats(room: Room, {
  priority,
  context,
  done,
}: any) {
  yield priority(Infinity);
  const energy1000ticks = aggregateEnergeHarvestForRoom(room);
  const stat = createOsd(room);

  console.log(energy1000ticks)
  stat.addLineItem({
    text() {
      return `Energy harvested per tick: ${energy1000ticks}`;
    },
  });
  stat.draw();
  Stats.runBuiltinStats();
  yield done();
}
