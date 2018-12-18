import { call, put, select } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import {
  scout as scoutRoom,
} from '../utils/room';
import { actionCreators as spawnActions } from '../Spawn';
import createBrood from '../Creeps/brood';
import {
  actionCreators as mapActions,
  selectors as mapSelectors,
} from '../Map';
import {
  scout,
} from '../Creeps/builds';
import {
  scout as roomScout,
  exits as roomExits,
} from '../utils/room';
import findPath from '../utils/findPath';
import { renewSelf, vanish, wakeup } from '../Tasks/index';
import {
  isColor,
  drainFlag,
  healFlag,
} from '../utils/colors';

const root = state => state.Creeps.Drainer;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,
)

const selectDrainers = createSelector(
  () => Game.creeps,
  creeps => Object.values(creeps).filter(creep => creep.memory && creep.memory.role === 'Drainer'),
)

function* newRoomBehavior(creep) {
}

let DRAINER_COUNT = 0
const earlyCreeps = _.range(0, HAULER_COUNT).map(num => ({
  name: `Drainer-${num}`,
  body: [TOUGH, TOUGH, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  memory: {
    role: 'Drainer',
    task: 'drain',
  },
  priority: 10,
  controller: Drainer,
}));


export function init(store) {
  global.spawnDrainer = function(num) {
    if (!num) {
      num = selectDrainers().length;
    }
    store.dispatch({
      type: 'EXE',
      payload: spawnActions.spawn({
        name: 'Drainer-' + num,
        body: [TOUGH, TOUGH, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        memory: {
          role: 'Drainer',
          task: 'drain',
        },
        priority: 10,
        controller: 'Drainer',
        room: Game.spawns['Spawn1'].room.name,
      }),
    });
    return "Drainer-" + num;
  }
}

createBrood({
  role: 'Drainer',
  * directCreeps({
    selectors,
  }) {
      yield put(spawnActions.need({
        needs: earlyCreeps,
        controller: 'Drainer',
      }));
      const creeps = yield select(selectors.alive);

      for (let creep of creeps) {

        if (creep.memory.task === "drain" && creep.hits / creep.hitsMax < 0.5) {
          creep.say("ouch!", true);
          creep.memory.task = "heal";
        }
        if (creep.memory.task === "heal" && creep.hits === creep.hitsMax) {
          creep.say("hit me", true);
          creep.memory.task = "fill";
        }

        if (creep.memory.task === "drain") {
          const targets = Object.values(Game.flags).filter(isColor(drainFlag));
          const target = creep.pos.findClosestByRange(targets);
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else if (target) {
            const saying = Math.random() * 10;
            if (Math.floor(saying) === 1) {
              creep.say("nyah nyah", true);
            }
          }
        }

        else if (creep.memory.task === "heal") {
          const targets = Object.values(Game.flags).filter(isColor(drainFlag));
          const target = creep.pos.findClosestByRange(targets);
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else if (target) {
            const saying = Math.random() * 10;
            if (Math.floor(saying) === 1) {
              creep.say("next time", true);
            }
          }
        }
    }

    }

  });
