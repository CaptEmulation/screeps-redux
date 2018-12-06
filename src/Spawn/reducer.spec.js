import {
  actionTypes,
  actionCreators,
  selectors,
  reducer,
} from './index';

global.Game = { creeps: {} };

const initialState = {
  needs: [],
};

const fooNeeds = {
  name: 'foo',
};

const barNeeds = {
  name: 'bar',
};

const foobarNeeds = {
  name: 'foobar',
};

describe('Creeps reducer', () => {
  it('add needs', () => {
    expect(reducer(initialState, {
      type: actionTypes.NEEDS,
      payload: fooNeeds,
    })).toEqual({
      needs: [ fooNeeds ],
    });
  });

  it('adds needs', () => {
    expect(_.flow(
      state => reducer(state, actionCreators.need(fooNeeds)),
      state => reducer(state, actionCreators.need(barNeeds))
    )(initialState)).toMatchObject({
      needs: [ fooNeeds, barNeeds ],
    })
  })

  describe('priority', () => {
    const update = needs => {
      needs[0].hunger=1;
      return selectors.nextNeeds({
        Spawn: {
          needs,
        },
      })
    }
    function spawnNeeds(needs, times = 1) {
      let args = []
      for (let i = 0; i < times; i++) {
        args.push(update);
      }
      return _.flow(...args)(needs);
    }

    it('round robins same priority', () => {
      const state = _.flow(
        state => reducer(state, actionCreators.need(fooNeeds)),
        state => reducer(state, actionCreators.need(barNeeds))
      )(initialState)

      expect(spawnNeeds(state.needs)).toMatchObject([
        {
          ...barNeeds,
          hunger: -1,
        },
        {
          ...fooNeeds,
          hunger: 0,
        }
      ]);
      expect(spawnNeeds(state.needs, 2)).toMatchObject([
        {
          ...fooNeeds,
          hunger: -1,
        },
        {
          ...barNeeds,
          hunger: 0,
        }
      ]);
    });
    it('low priorities can also spawn', () => {
      const needs = [
        {
          name: 0,
          priority: 0,
          hunger: 0,
        }, {
          name: 1,
          priority: 0,
          hunger: 0,
        }, {
          name: 2,
          priority: 0,
          hunger: 0,
        }, {
          name: 3,
          priority: 1,
          hunger: 0,
        },
      ];
      expect(spawnNeeds(needs, 1)).toMatchObject([
        {
          name: 1,
          priority: 0,
          hunger: -1,
        }, {
          name: 2,
          priority: 0,
          hunger: -1,
        }, {
          name: 0,
          priority: 0,
          hunger: 0,
        }, {
          name: 3,
          priority: 1,
          hunger: -1,
        }
      ]);
      expect(spawnNeeds(needs, 2)).toMatchObject([
        {
          name: 2,
          priority: 0,
          hunger: -2,
        }, {
          name: 0,
          priority: 0,
          hunger: -1,
        }, {
          name: 3,
          priority: 1,
          hunger: -2,
        }, {
          name: 1,
          priority: 0,
          hunger: 0,
        }
      ]);
      expect(spawnNeeds(needs, 3)).toMatchObject([
        {
          name: 0,
          priority: 0,
          hunger: -2,
        }, {
          name: 3,
          priority: 1,
          hunger: -3,
        }, {
          name: 1,
          priority: 0,
          hunger: -1,
        }, {
          name: 2,
          priority: 0,
          hunger: 0,
        }
      ]);
    });
  });

  it('needs are priotitize', () => {
    const low = {
      ...fooNeeds,
      priority: 1,
    };
    const high = {
      ...barNeeds,
    }
  });
});
