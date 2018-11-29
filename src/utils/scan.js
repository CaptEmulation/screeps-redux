export function* walkBox(pos, size) {
  for (let x = -size; x <= size; x++) {
    yield [pos.x + x, pos.y - size];
  }
  for (let y = -(size - 1); y <= (size - 1); y++) {
    yield [pos.x - size, pos.y + y];
    yield [pos.x + size, pos.y + y];
  }
  for (let x = -size; x <= size; x++) {
    yield [pos.x + x, pos.y + size];
  }
}
