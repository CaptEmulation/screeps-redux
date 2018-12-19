export const scoutFlag = [COLOR_GREEN, COLOR_GREEN];
export const healFlag = [COLOR_YELLOW, COLOR_YELLOW];
export const drainFlag = [COLOR_WHITE, COLOR_WHITE];
export const attackFlag = [COLOR_RED, COLOR_RED];

export function isColor(colors) {
  return ({ color, secondaryColor }) => colors[0] === color && colors[1] === secondaryColor;
}
