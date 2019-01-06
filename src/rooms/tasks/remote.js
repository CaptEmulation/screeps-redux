import scan from './scan';
import {
  getBunkerLocation,
} from '../planner';

export default function* remote(room, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (!context.scanned || Game.time % 50 === 0) {
    context.scanned = true;
    yield subTask(scan);
  }
}
