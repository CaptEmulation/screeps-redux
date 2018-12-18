export const scoutFlag = [COLOR_GREEN, COLOR_GREEN];
export const drainFlag = [COLOR_YELLOW, COLOR_YELLOW];
export const healFlag = [COLOR_WHITE, COLOR_WHITE];

export function isColor(colors) {
  return ({ color, secondaryColor }) => colors[0] === color && colors[1] === secondaryColor;
}
