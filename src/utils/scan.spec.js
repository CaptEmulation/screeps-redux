import {
  walkBox,
} from './scan';

describe('scan', () => {
  describe('walkbox', () => {
    it('size 1 center', () => {
      const pos = [...walkBox({ x: 25, y: 25 }, 1)];
      expect(pos).toEqual([
        [24, 24],
        [25, 24],
        [26, 24],
        [24, 25],
        [26, 25],
        [24, 26],
        [25, 26],
        [26, 26],
      ]);
    });
    it('size 1 right edge', () => {
      const pos = [...walkBox({ x: 48, y: 24 }, 1)];
      expect(pos).toEqual([
        [47, 23],
        [48, 23],
        [47, 24],
        [47, 25],
        [48, 25],
      ]);
    });
  });
});
