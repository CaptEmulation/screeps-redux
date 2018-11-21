import { names as getModuleNames } from './createModule';

export default function (newState) {
  Object.assign(Memory, getModuleNames().reduce((mem, curr) => {
    mem[curr] = newState[curr];
    return mem;
  }, {}));
}
