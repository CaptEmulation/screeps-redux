import createOsd from '../../stats/osd';

const statCache = {};

export default function* stats(room, {
  priority,
  context,
  done,
}) {
  if (!statCache[room.name]) {
    const stat = statCache[room.name] = {
      osd: createOsd(room),
    };
    stat.osd.addLineItem({
      text() {
        return 'Line 1';
      },
    });
  }
  const stat = statCache[room.name];
  
  stat.osd.draw();
  yield priority(context.priority);

  
  yield done();
}
