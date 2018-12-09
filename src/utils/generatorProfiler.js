import { call } from 'redux-saga/effects';

export default function(name, func, period = 25) {
  return function* (...args) {
    const active = Game.time % period === 0;
    let now;
    if (active) {
      now = Game.cpu.getUsed();
    }
    const ret = yield call(func, ...args);

    if (active) console.log(name, (Game.cpu.getUsed() - now).toFixed(3));
    return ret;
  }
}
