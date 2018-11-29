import range from 'lodash.range';
import get from 'lodash.get';
import mapValues from 'lodash.mapvalues';
import differenceWith from 'lodash.differencewith';
import difference from 'lodash.difference';
import cond from 'lodash.cond';
import intersection from 'lodash.intersection';
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
  moveTo,
} from '../utils/creeps';
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

const SCOUT_COUNT = 3
const earlyCreeps = range(0, SCOUT_COUNT).map(num => ({
  name: `Scout-${num}`,
  body: scout.early,
  memory: {
    role: 'Scout',
  },
  priority: 10,
  controller: 'Scout',
}));

createBrood({
  role: 'Scout',
  actions: ['patrol'],
  * directCreeps({
    selectors,
  }) {
    const scoutFlags = Object.values(Game.flags).filter(isColor(scoutFlagColor));
    if (scoutFlags.length) {
      yield put(spawnActions.need({
        needs: range(scoutFlags.length).map(num => ({
          name: `Scout-${num}`,
          body: scout.early,
          memory: {
            role: 'Scout',
          },
          priority: 10,
          controller: 'Scout',
        })),
        controller: 'Scout',
      }));
    }

    const exploredRooms = yield select(mapSelectors.explored);
    // const unexploredRooms = yield select(mapSelectors.unexplored);

    if (exploredRooms.length && (yield select(mapSelectors.unexplored)).length) {
      let j = 0;
      const scouts = yield select(selectors.alive);
      // scouts.forEach(scout => delete scout.memory.flag);
      for (let i = 0; i < scouts.length; i++) {
        const scout = scouts[i];
        if (!scout.memory.flag || !Game.flags[scout.memory.flag]) {
          const scoutedFlags = scouts.filter(scout => scout.memory.flag).map(scout => scout.memory.flag);
          const unscoutedFlags = Object.values(Game.flags).filter(flag => !scoutedFlags.includes(flag.name));
          if (unscoutedFlags.length) {
            scout.memory.flag = unscoutedFlags[0].name;
          }
        } else {
          moveTo(scout, Game.flags[scout.memory.flag]);
        }
        if (scout.memory.lastRoomIn && scout.memory.lastRoomIn !== scout.room.name) {
          console.log('entered room', scout.name, scout.room.name);
          // if (scout.memory.visited && !scout.memory.visisted.includes(scout.room.name)) {
          //   scout.memory.visisted = scout.memory.visisted || [];
          //   scout.memory.visisted.push(scout.room.name);
          // }
          // const availableRooms = roomExits(scout.room.name)
          //   .filter(n => !scout.memory.visited.includes(n))
          //   .map(roomName => {
          //     const roomExit = scout.room.findExitTo(roomName);
          //     //return { pos: source.pos, range: 1 };
          //     const path = scout.pos.findClosestByRange(roomExit);
          //     return path;
          //   })
          //   .sort((a, b) => a.length = b.length);
          // console.log(availableRooms)
        }

        // if (!(yield select(mapSelectors.unexplored)).includes(scout.room.name)) {
        //   console.log('new room');
        //   // yield put(mapActions.roomInfo(roomScout(scout.room)));
        // }
        // const unexploredRooms = yield select(mapSelectors.unexplored);
        //
        // if (!unexploredRooms.includes(scout.memory && scout.memory.exploreTo && scout.memory.exploreTo.roomName)) {
        //   if (!unexploredRooms[j]) {
        //     j = 0;
        //   }
        //   scout.memory.exploreTo = scout.pos.findClosestByRange(scout.room.findExitTo(unexploredRooms[j++]));
        // }
        // if (scout.memory.exploreTo) {
        //   moveTo(scout, scout.memory.exploreTo);
        // }
        scout.memory.lastRoomIn = scout.room.name;
      }

    }
    // if (exploredRooms.length && unexploredRooms.length) {
    //   let j = 0;
    //   const scouts = yield select(selectors.alive);
    //   for (let i = 0; i < scouts.length; i++) {
    //     const scout = scouts[i];
    //     if (!unexploredRooms[j]) {
    //       j = 0;
    //     }
    //     // console.log(scout.pos.findClosestByRange(scout.room.findExitTo(unexploredRooms[j++])))
    //     moveTo(scout, scout.pos.findClosestByRange(scout.room.findExitTo(unexploredRooms[j++])));
    //   }
    // }
  },
  initialState: {
    roomPatrol: [],
  },
  reducerHandler: actionTypes => ({
    [actionTypes.patrol](state, { payload: room }) {
      return {
        ...state,
        roomPatrol: [...roomPatrol, room],
      };
    }
  })
});
