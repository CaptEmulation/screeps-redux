import { createSelector } from 'reselect';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import {
  acquireTask,
  tasks as creepTasks,
} from '../utils/creeps';
import { actionCreators as spawnActions } from '../Spawn';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';

import {
  RUN,
} from '../events';


function notDrainersOrDrainersNeedingHealing(creep) {
  const isDrainer = creep.memory && creep.memory.role === 'Drainer';
  const isDamaged = creep.hits < creep.hitsMax;
  const notDrainerWithDamage = !isDrainer && isDamaged;
  const workingHealPieces = !!creep.body.find(b => b.type === HEAL && b.hits > 0);
  const drainerThatCannotHeal = isDrainer
    && isDamaged
    && !workingHealPieces;
  return notDrainerWithDamage || drainerThatCannotHeal;
}



function* run() {
  yield takeEvery(RUN, function* onRun() {
    const needs = [];
    let num = 0;

    for (let room of Object.values(Game.rooms)) {
      const towers = room.find(FIND_STRUCTURES, {
        filter: (target) => target.structureType === STRUCTURE_TOWER,
      });
      const hostiles = room.find(FIND_HOSTILE_CREEPS);
      let healed = false;
      const friendliesNeedingHealing = room.find(FIND_MY_CREEPS, {
        filter: notDrainersOrDrainersNeedingHealing,
      }).sort((a, b) => (a.hitsMax - a.hits) - (b.hitsMax - b.hits));
      if (friendliesNeedingHealing.length) {
        const {
          hits,
          hitsMax,
        } = friendliesNeedingHealing[0];
        towers.forEach(tower => {
          tower.heal(friendliesNeedingHealing[0]);
        });
        healed = true;
      }
      const lowRamparts = room.find(FIND_STRUCTURES, {
        filter(rampart) {
          return rampart.structureType === STRUCTURE_RAMPART && rampart.hits < 1000;
        }
      });
      if (lowRamparts) {
        towers.forEach(tower => {
          tower.repair(lowRamparts[0]);
        });
      }
      if (!healed) {
        towers.forEach(tower => {
          tower.attack(hostiles[0]);
        });
      }
      if (hostiles.length) {
        needs.push(..._.range(hostiles.length).map(() => ({
          name: `Defense-${num++}`,
          body({ appraiser, available }) {
            if (appraiser([TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK]) <= available) {
              return [TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK];
            }
            return [MOVE, RANGED_ATTACK];
          },
          priority: -100,
          memory: {
            role: 'Defense'
          },
          room: room.name,
        })))
      }
    }
    yield put(spawnActions.need({
      needs,
      controller: 'Defense',
    }));

    const myDefCreeps = Object.values(Game.creeps).filter(c => c.memory && c.memory.role === 'Defense');
    for (let i = 0; i < myDefCreeps.length; i++) {
      const creep = myDefCreeps[i];
      const baddies = creep.room.find(FIND_HOSTILE_CREEPS);
      const badGuy = creep.pos.findClosestByRange(baddies);
      if (badGuy) {
        if (creep.body.find(b => b.type === RANGED_ATTACK)) {
          creep.routeTo(badGuy, { range: 3 });
          creep.rangedAttack(badGuy);
        } else {
          acquireTask(creep, creepTasks.attack(), badGuy);
        }

      }
    }
  });
}

createSaga(
  run,
);
