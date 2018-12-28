import { take, put, call, takeEvery } from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import createSaga from '../utils/createSaga';
import createReducer from '../utils/createReducer';
import runTasks from '../tasks';
import {
  target as targetMatchers,
} from '../utils/matchers';
import {
  LOOP,
} from '../events';

export const ADD_TASK = 'TOWER_ADD_TASK';
export const REMOVE_TASK = 'TOWER_REMOVE_TASK';

export const actionCreators = {
  addTask(towerName, task) {
    if (_.isString(task)) {
      task = { action: task };
    }
    return {
      type: ADD_TASK,
      payload: {
        towerName,
        task,
      },
    };
  },
}

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

createSaga(
  function* () {
    const chan = eventChannel(emitter => {
      global.addTowerTask = function addTask(tower, task) {
        emitter(actionCreators.addTask(tower, task));
      }
      return () => {
        delete global.addTowerTask;
      };
    })
    while (true) {
      yield put(yield take(chan));
    }
  },
  function* () {
    yield takeEvery(LOOP, function* towerRunTasks() {
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
      }
      // for (let tower of Object.values(Game.rooms).reduce((towers, room) => towers.concat(room.find(FIND_MY_STRUCTURES), {
      //   filter: targetMatchers.isTower,
      // }), [])) {
      //   yield call(runTasks, tower, handlers, tower => Memory.tower[tower.id]);
      // }
    })
  }
);


createReducer('towers', Memory.towers || {}, {
  [ADD_TASK](towers, { payload: { towerName, task } }) {
    const newTasks = Array.isArray(task) ? task : [task];
    const oldTasks = towers[towerName] && towers[towerName].tasks || [];
    return {
      ...towers,
      [towerName]: {
        ...towers[towerName],
        tasks: [...oldTasks, ...newTasks],
      },
    }
  },
  [REMOVE_TASK](towers, { payload: { towerName, task } }) {
    const newTasks = Array.isArray(task) ? task : [];
    const oldTasks = towers[towerName] && towers[towerName].tasks || [];
    return {
      ...towers,
      [towerName]: {
        ...towers[towerName],
        tasks: _.difference(oldTasks, newTasks),
      },
    };
  },
});
