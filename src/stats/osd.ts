

interface LineItem {
  text(): string;
  style?(): TextStyle;
}

interface Osd {
  addLineItem(lineItem: LineItem): void;
  draw(): void;
}

export default function (room: Room) {
  const lines: Array<LineItem> = [];
  const defaultStyles: TextStyle = {
    font: 1.5,
    color: '#DDDD33',
    align: 'left',
  };
  const self: Osd = {
    addLineItem(lineItem) {
      lines.push(lineItem);
    },
    draw() {
      let pos: RoomPosition = new RoomPosition(1, 2, room.name);
      const visual = new RoomVisual();
      visual.text(`Room: ${room.name}`, pos, defaultStyles);
      lines.forEach((line) => {
        pos.y += 2;

        visual.text(line.text(), pos, line.style ? {
          ...defaultStyles,
          ...line.style(),
        } : defaultStyles);
      });
    }
  };
  return self;
}