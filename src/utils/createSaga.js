let _sagas = [];

export const sagas = () => _sagas;

export default function createSaga(...sagas) {
  _sagas = _sagas.concat(sagas);
}
