import { call, put, select, takeEvery, take } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import { happy } from '../utils/id';
import { actionCreators as spawnActions } from '../Spawn';
import {
  builder,
} from '../Creeps/builds';
import {
  acquireTask,
  findClosestEnergy,
  tasks as creepTasks,
} from '../utils/creeps';
import {
  findEnergyDropOffs,
  dropOffEnergy,
} from '../Economy';
import {
  findWorkSites,
} from '../utils/find';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';
import {
  RUN,
} from '../events';
import {
  target as targetMatcher,
} from '../utils/matchers';
import { renewSelf } from '../Tasks/index';

const {
  mapValues,
  difference,
  intersection,
  range,
} = _;


const BUILDER_COUNT = 2;
const SPAWN = 'BUILDER_SPAWN';
const QUEUE = 'BUILDER_QUEUE';
const POP = 'BUILDER_POP';
const PICK_EXTENSION_LOCATION = 'PICK_EXTENSION_LOCATION';
const BUILD_EXTENSION = 'BUILD_EXTENSION';
const CLEAN_BUILDERS = 'BUILDERS_CLEAN';

function createNearby(position, structure, size = 3) {
  let wasBuilt = false;
  let pos;
  for (let i = -size; i < size; i++) {
    if (wasBuilt) break;
    for (let j = -size; j < size; j++) {
      const x = position.x + i;
      const y = position.y + j;
      pos = new RoomPosition(x, y, position.roomName);
      const err = pos.createConstructionSite(structure);
      if (!err) {
        wasBuilt = true;
        break;
      }
    }
  }
  return wasBuilt ? pos : wasBuilt;
}

function defaultBuild(creep, location) {
  const structure = location.findClosestByRange(FIND_STRUCTURES);
  console.log('attempt to build', JSON.stringify(location))
  if(structure && creep.build(structure) == ERR_NOT_IN_RANGE) {
    console.log('moving')
    creep.moveTo(structure, { visualizePathStyle: {stroke: '#ffffff'} });
  }
}

const BUILD_ORDER = [
  {
    build: defaultBuild,
  }
];

export const actionCreators = {
  spawn(name) {
    return {
      type: SPAWN,
      payload: name,
    };
  },
  build(room, definition) {
    console.log('action', definition.build);
    const ret = {
      type: QUEUE,
      payload: {
        location: definition.init(room),
        build: definition.build,
      },
    };
    console.log('ret', Object.keys(ret.payload));
    return ret;
  },
  pop() {
    return {
      type: POP,
    };
  },
  cleanBuilders(deadBuilder) {
    return {
      type: CLEAN_BUILDERS,
      payload: deadBuilder,
    };
  },
};

const root = state => state.Construction;
const selectCreeps = state => Memory.creeps || {};
const selectBuilders = createSelector(
  root,
  construct => construct.creeps,
);
const selectNeedsBuilders = createSelector(
  selectBuilders,
  (builders) => {
    return builders.length <= BUILDER_COUNT;
  }
);
const selectNeedsSpawn = createSelector(
  selectCreeps,
  selectBuilders,
  (creeps, builders) => difference(builders, Object.keys(creeps)),
);

const selectActiveBuilderNames = createSelector(
  selectCreeps,
  selectBuilders,
  (creeps, builders) => intersection(Object.keys(creeps), builders),
);

const selectActiveBuilders = createSelector(
  () => Game.creeps || {},
  creeps => Object.values(creeps).filter(creep => creep.memory && creep.memory.role === 'builder'),
);


const selectInfants = createSelector(
  selectCreeps,
  selectActiveBuilderNames,
  (creeps, activeBuilders) => activeBuilders.filter(name => creeps[name].infant).map(name => creeps[name]),
);

const selectDeadBuilders = createSelector(
  selectBuilders,
  selectCreeps,
  () => Game.creeps || {},
  (builders, creepsMem, creepsGame) =>
    intersection(
      difference(Object.keys(creepsMem), Object.keys(creepsGame)),
      builders,
    ),
);

const selectBuildQueue = createSelector(
  root,
  construct => construct.queue,
);

export const selectors = {
  builders: selectBuilders,
  needsBuilders: selectNeedsBuilders,
  needsSpawn: selectNeedsSpawn,
  activeBuilderNames: selectActiveBuilderNames,
  infants: selectInfants,
  deadBuilders: selectDeadBuilders,
  queue: selectBuildQueue,
};

export function init(store) {
  global.Construct = {
    ...mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: mapValues(selectors, selector => () => selector(store.getState())),
  };
}

let lastNeeds;

function* run() {
  // yield takeEvery('INIT', function* onRun() {
  //   for(let i = 0; i < earlyCreeps.length; i++) {
  //     console.log('need', earlyCreeps[i].name)
  //     yield put(spawnActions.need(earlyCreeps[i]));
  //   }
  // });
  yield takeEvery(RUN, function* onRun() {
    const mySpawnRooms = Object.values(Game.spawns).map(spawn => spawn.room);
    const needs = [];
    let num = 0;
    for (let room of mySpawnRooms) {
      for (let i = 0; i < BUILDER_COUNT; i++) {
        needs.push({
          name: `Builder-${num}`,
          priority: -60,
          body: ({
            appraiser,
            available,
            max,
          }) => {
            const body = [MOVE, CARRY, WORK];
            while (appraiser(body) < available) {
              const workCount = body.filter(b => WORK).length;
              if (workCount >= 8) {
                break;
              }
              if (appraiser([...body, MOVE, WORK, WORK, CARRY]) <= max) {
                body.push(MOVE, WORK, WORK, CARRY);
              } else {
                break;
              }
            }
            return body;
          },
          memory: {
            role: 'builder',
            num,
          },
          room: room.name,
        });
        num++;
      }
    }

    const activeBuilders = yield select(selectActiveBuilders);

    // Check for rooms external to spawn that need a builder
    const remoteConstructionSites = Object.values(Game.constructionSites)
      .filter(site => !mySpawnRooms.includes(site.room));
    if (remoteConstructionSites.length) {
      const remoteBuilderRoomNames = activeBuilders
        .filter(c => _.get(c, 'memory.remote'))
        .map(c => c.memory.remote);
      const roomsNeedingBuilder = remoteConstructionSites.reduce((rooms, site) => {
        if (remoteBuilderRoomNames && !remoteBuilderRoomNames.includes(site.room.name)) {
          rooms.push(site.room);
        }
        return rooms;
      }, []);
      // FIXME: not doing anything yet....
    }

    yield put(spawnActions.need({
      needs,
      controller: 'Construction',
    }));

    const buildQueue = yield select(selectBuildQueue);

    activeBuilders.forEach(creep => {
      if (creep.memory.building && creep.carry.energy === 0) {
        creep.memory.building = false;
        if (creep.ticksToLive < 200 && creep.memory.num < BUILDER_COUNT) {
          creep.say("fix me!", true);
          creep.memory.task = "renew";
        } else {
          creep.say('need fuel', true);
          creep.memory.task = "fill";
        }
      }
      if(!creep.memory.building && creep.carry.energy === creep.carryCapacity) {
        creep.memory.building = true;
        creep.memory.task = "build";
        creep.say('build', true);
      }

      if (creep.memory.task === "renew") {
        renewSelf(creep);
      }
      else if(creep.memory.building) {
        if (creep.room.energyAvailable < 25 && dropOffEnergy(creep)) {
          // all done
          return;
        }
        const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        if(targets.length) {
          const target = findWorkSites(creep.room);
          if (creep.pos.getRangeTo(target) > 3) {
            creep.routeTo(target, {
              range: 3,
            });
          } else if (!(target instanceof StructureController)){
            creep.build(target);
            creep.getOutOfTheWay(target, 3);
          }
          // console.log(target)
          // const creepBuild = creepTasks.build();
          // if (creep.pos.getRangeTo(target) > 3) {
          //   moveTo(creep, target);
          // } else {
          //   creepBuild(target)
          // }
        } else {
          if (creep.pos.getRangeTo(creep.room.controller) > 3) {
            creep.routeTo(creep.room.controller, {
              range: 3,
            });
          } else {
            creep.upgradeController(creep.room.controller);
            const saying = Math.random() * 10;
            if (Math.floor(saying) === 1) {
              creep.say("UP-grade", true);
            }
            creep.getOutOfTheWay(creep.room.controller, 3);
          }
        }
        //  else {
        //   const containerSites = creep.room.find(FIND_STRUCTURES, {
        //     filter: (target) => (target.hits / target.hitsMax) < 0.5,
        //   });
        //   if (containerSites.length) {
        //     acquireTask(creep, creepTasks.repair(), creep.pos.findClosestByRange(containerSites));
        //   }
        // }
        // if (!creep.memory.upgrading && creep.room.controller.ticksToDowngrade < 6000 && creep.room.controller.level === 1) {
        //   creep.memory.upgrading = creep.room.controller.level + 1;
        // } else if (creep.memory.upgrading <= creep.room.controller.level) {
        //   delete creep.memory.upgrading;
        // } else if (creep.memory.upgrading > creep.room.controller.level) {
        //   acquireTask(creep, creepTasks.upgradeController(), creep.room.controller);
        // } else {
        //
        // }
      } else {
        const pickupDroppedEnergy = creep.room.find(FIND_MY_STRUCTURES, { filter: targetMatcher.isMyContainer }).length ? false : true;
        findClosestEnergy(creep, pickupDroppedEnergy);
      }
    });
  });
}

createSaga(
  run,
);

const initialState = {
  creeps: [],
  queue: [],
  currentBuild: null,
};

createReducer('Construction', initialState, {
  [SPAWN](state, { payload: probe }) {
    return {
      ...state,
      creeps: [...state.creeps, probe],
    };
  },
  [QUEUE](state, { payload: definition }) {
    console.log('reducer',  Object.keys(definition))
    const ret = {
      ...state,
      queue: [...state.queue, definition],
    };
    console.log('ret', JSON.stringify(definition));
    return ret;
  },
  [POP](state) {
    return {
      ...state,
      queue: state.queue.slice(1),
    };
  },
  [CLEAN_BUILDERS](state, { payload: deadBuilders }) {
    return {
      ...state,
      creeps: [...difference(state.creeps, deadBuilders)],
    };
  },
});

createModule('Construction', {
  selectors,
  actionCreators,
});
