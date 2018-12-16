export function getPathMatrix(room) {
  let pathMatrix;

  if (!room.memory.pathMatrix) {
    pathMatrix = new PathFinder.CostMatrix;
    for (let i=0; i<50; i++) {
      for (let j=0; j<50; j++) {
        pathMatrix.set(i,j,255);
      }
    }
    room.memory.pathMatrix = pathMatrix.serialize();
  }

  else {
    pathMatrix = PathFinder.CostMatrix.deserialize(room.memory.pathMatrix);
  }

  return pathMatrix;
}

export function savePathMatrix(room, pathMatrix) {
  room.memory.pathMatrix = pathMatrix.serialize()
}
