import { happy } from './id';

global.Game = {
  creeps: {}
};

describe('#id', () => {
  describe('happy', () => {
    it('does something', () => {
      console.log(happy(6));
    });
  });
});
