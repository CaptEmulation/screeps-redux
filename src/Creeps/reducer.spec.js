import flow from 'lodash.flow';
import {
  actionTypes,
  reducer,
} from './index';

const emptyNeeds = {
  needs: [],
};

const fooNeeds = {
  controller: 'foo',
};

const barNeeds = {
  controller: 'bar',
};

const foobarNeeds = {
  controller: 'foobar',
};

describe('Creeps reducer', () => {
  it('add needs', () => {
    expect(reducer(emptyNeeds, {
      type: actionTypes.NEEDS,
      payload: fooNeeds,
    })).toEqual({
      needs: [ fooNeeds ],
    });
  });

  it('update needs', () => {
    const newNeeds = {
      ...fooNeeds,
      count: 3,
    };
    expect(reducer({
      needs: [fooNeeds],
    }, {
      type: actionTypes.NEEDS,
      payload: newNeeds,
    })).toEqual({
      needs: [ newNeeds ],
    });
  });

  it('update needs 2', () => {
    const newNeeds = {
      ...fooNeeds,
      count: 3,
    };
    expect(reducer({
      needs: [foobarNeeds, fooNeeds, barNeeds],
    }, {
      type: actionTypes.NEEDS,
      payload: newNeeds,
    })).toEqual({
      needs: [ foobarNeeds, newNeeds, barNeeds ],
    });
  });

  it('needs are priotitize', () => {
    const low = {
      ...fooNeeds,
      priority: 1,
    };
    const high = {
      ...bar
    }
  });
});
