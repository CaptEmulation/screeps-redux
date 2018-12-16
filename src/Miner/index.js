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
import {
  isColor,
  scoutFlag as scoutFlagColor,
} from '../utils/colors';
import findPath from '../utils/findPath';

const root = state => state.Creeps.Scout;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,

)

function* newRoomBehavior(creep) {
}

const MINER_COUNT = 0
const earlyCreeps = _.range(0, MINER_COUNT).map(num => ({
  name: `Miner-${num}`,
  body: [MOVE, WORK],
  memory: {
    role: 'Miner',
  },
  priority: -500,
  controller: 'Miner',
  room: Game.spawns['Spawn1'].room.name,
}));

createBrood({
  role: 'Miner',
  * directCreeps({
    selectors,
  }) {
      yield put(spawnActions.need({
        needs: [],
        controller: 'Miner',
      }));
      const creeps = yield select(selectors.alive);
      for (let creep of creeps) {
          if (!creep.memory.source) {
            const target = _.sample(creep.room.find(FIND_SOURCES));
            creep.memory.source = { id: target.id, pos: [target.pos.x, target.pos.y] };
          }
          const target = Game.getObjectById(creep.memory.source.id);
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.routeTo(target);
          } else {
            creep.harvest(target);
          }
      }

    }

  });
