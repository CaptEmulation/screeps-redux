export const worker = {
  early: [MOVE, WORK, WORK],
  mid: [MOVE, WORK, WORK, WORK, WORK, WORK],
  default({
    appraiser,
    available,
    max,
  }) {
    const fullBody = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
    const fullCost = appraiser(fullBody);
    if (fullCost < available) {
      return fullBody;
    }
    if ((fullCost - (BODYPART_COST[MOVE] + 2 * BODYPART_COST[WORK])) <= available) {
      fullBody.shift();
      fullBody.pop();
      fullBody.pop();
      return fullBody;
    }
    return [MOVE, MOVE, WORK, WORK];
  }
};

export const supply = {
  early: [MOVE, MOVE, CARRY, CARRY],
  mid: [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY],
  default({
    appraiser,
    available,
    max,
    spawner,
    extensions,
  }) {
    const body = [MOVE, MOVE, CARRY, CARRY];
    const remaining = available - appraiser(body);
    if (remaining > 0) {
      const parts = Math.min(Math.floor(remaining / appraiser([MOVE, CARRY])), 16);
      _.range(0, parts).forEach(() => body.push(MOVE, CARRY));
    }
    return body;
  },
};

export const scout = {
  early: [MOVE, MOVE],
  mid: [MOVE, MOVE, MOVE],
};

export const builder = {
  early: [MOVE, MOVE, CARRY, WORK],
  mid: [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK],
};
