export const worker = {
  early: [MOVE, WORK, WORK],
  mid: [MOVE, WORK, WORK, WORK, WORK, WORK],
};

export const supply = {
  early: [MOVE, MOVE, CARRY, CARRY],
  mid: [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY],
};

export const scout = {
  early: [MOVE, MOVE],
  mid: [MOVE, MOVE, MOVE],
};

export const builder = {
  early: [MOVE, MOVE, CARRY, WORK],
  mid: [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK],
};
