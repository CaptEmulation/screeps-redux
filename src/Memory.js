import { appendReducer } from './utils/createReducer';

appendReducer((state = Memory, action) => {
  Object.assign(Memory, state);
  return state;
});
