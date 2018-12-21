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
import { renewSelf, returnSelf, vanish, wakeup } from '../Tasks/index';
import {
  isColor,
  attackFlag,
} from '../utils/colors';

const root = state => state.Creeps.Attacker;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,
)

// const selectAttackers = createSelector(
//   () => Game.creeps,
//   creeps => Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Attacker'),
// )

function* newRoomBehavior(creep) {
}

let ATTACKER_COUNT = 0
const earlyCreeps = _.range(0, ATTACKER_COUNT).map(num => ({
  name: `Attacker-${num}`,
  body: [ATTACK, ATTACK, MOVE, MOVE],
  memory: {
    role: 'Attacker',
    task: 'move',
  },
  priority: 10,
  controller: 'Attack',
}));


export function init(store) {
  global.spawnAttacker = function(num) {
    if (!num) {
      num = Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Attacker').length;
    }
    store.dispatch({
      type: 'EXE',
      payload: spawnActions.spawn({
        name: 'Attacker-' + num,
        body: [CLAIM, MOVE],
        memory: {
          role: 'Attacker',
          task: 'move',
        },
        priority: 10,
        controller: 'Attacker',
        room: Game.spawns['Spawn1'].room.name,
      }),
    });
    return "Spawned creep Attacker-" + num;
  }
}

createBrood({
  role: 'Attacker',
  * directCreeps({
    selectors,
  }) {
      yield put(spawnActions.need({
        needs: earlyCreeps,
        controller: 'Attacker',
      }));
      const creeps = yield select(selectors.alive);

      if (Game.time % 1000 === 165) {
        console.log(spawnAttacker());
      }

      for (let creep of creeps) {
        //
        // if (creep.memory.task === "renew") {
        //   renewSelf(creep, "move");
        // }

        if (creep.memory.task === "return") {
          returnSelf(creep);
        }

        if (creep.memory.task === "move") {
          const targets = Object.values(Game.flags).filter(isColor(attackFlag));
          //console.log(targets);
          if (targets.length) {
            const target = targets[0];
            const range = creep.pos.getRangeTo(target);
            if (range > 1) {
              let err = creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
              //creep.routeTo(target, { range:0, ignoreCreeps:false });
            } else {
              creep.memory.task = "attack";
            }
          }
        }

        else if (creep.memory.task === "attack") {
          const targets = creep.room.find(FIND_STRUCTURES);
          const target = creep.pos.findClosestByRange(targets);
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else if (target) {
            let err;
            if (target instanceof StructureController) {
              if (!target.my && target.owner && target.owner.username) {
                err = creep.attackController(target);
                creep.say("bam", true);
                console.log(creep.name, "attacked controller in room", creep.room.name, "ticks to downgrade", target.ticksToDowngrade);
                if (err) {
                  creep.memory.task = "return";
                }
              } else if (!target.my && !target.owner) {
                err = creep.claimController(target);
                creep.say("mine", true);
              } else if (target.my) {
                err = creep.signController(target, "screeps-redux");
              }
              // if (!err) {
              //   creep.memory.task = "renew";
              // }
            } else {
              err = creep.attack(target);
            }
            if (err) {
              creep.say(err);
            }
          }
        }
    }

    }

  });
