import {
  periodically,
} from '../../utils/tick';

const period = periodically(5);

export default function* letCreepsRenew(spawn, {
  priority,
  context,
  sleep,
}) {
  if (!context.renewing || period()) {
    context.renewing = spawn.pos.availableNeighbors(false).filter(
      look => look.type === 'creep' && look.creep.memory.lastRunTask === 'renewSelf',
    ).length > 0;
  }

   if (context.renewing) {
     yield priority(-10);
   } else {
     yield sleep();
   }

}
