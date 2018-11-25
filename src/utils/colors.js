export const scoutFlag = [COLOR_GREEN, COLOR_GREEN];

export function isColor(colors) {
  return ({ color, secondaryColor }) => colors[0] === color && colors[1] === secondaryColor;
}
