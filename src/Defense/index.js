import mapValues from 'lodash.mapvalues';
import difference from 'lodash.difference';
import differenceWith from 'lodash.differencewith';
import flow from 'lodash.flow';
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


function* run() {
  yield takeEvery(RUN, function* onRun() {
    const room = Game.spawns['Spawn1'].room;
    const towers = room.find(FIND_STRUCTURES, {
      filter: (target) => target.structureType === STRUCTURE_TOWER,
    });
    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    let healed = false;
    const friendliesNeedingHealing = room.find(FIND_MY_CREEPS, {
      filter: creep => creep.hits < creep.hitsMax,
    }).sort((a, b) => (a.hitsMax - a.hits) - (b.hitsMax - b.hits));
    if (friendliesNeedingHealing.length) {
      const {
        hits,
        hitsMax,
      } = friendliesNeedingHealing[0];
      const damage = hitsMax - hits;
      if (damage / hitsMax > 0.5) {
        towers.forEach(tower => {
          tower.heal(friendliesNeedingHealing[0]);
        });
        healed = true;
      }
    }
    if (hostiles.length) {
      console.log('I see baddies', hostiles);
      yield put(spawnActions.need({
        needs: [
          ..._.range(hostiles.length).map(num => ({
            name: `Defense-${num}`,
            body: [TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK],
            priority: -100,
            memory: {
              role: 'Defense'
            },
          })),
        ],
        room: Game.spawns['Spawn1'].room.name,
        controller: 'Defense',
      }));
    } else {
      yield put(spawnActions.need({
        needs: [],
        controller: 'Defense',
      }));
    }
    if (!healed) {
      towers.forEach(tower => {
        tower.attack(hostiles[0]);
      });
    }
    const myDefCreeps = Object.values(Game.creeps).filter(c => c.memory && c.memory.role === 'Defense');
    for (let i = 0; i < myDefCreeps.length; i++) {
      const creep = myDefCreeps[i];
      const baddies = creep.room.find(FIND_HOSTILE_CREEPS);
      const badGuy = creep.pos.findClosestByRange(baddies);
      if (badGuy) {
        acquireTask(creep, creepTasks.attack(), badGuy);
      }
    }
  });
}

createSaga(
  run,
);
