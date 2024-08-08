import { Theme } from "@mui/material";

type RGB = [number, number, number];

function interpolateColor(color1: RGB, color2: RGB, factor: number): RGB {
  return [
    Math.round(color1[0] + factor * (color2[0] - color1[0])),
    Math.round(color1[1] + factor * (color2[1] - color1[1])),
    Math.round(color1[2] + factor * (color2[2] - color1[2]))
  ];
}

export function generateGradient(steps: number): string[] {
  const presetColors: RGB[] = [
    // [247, 147, 26], // RGB for #F7931A
    [255, 195, 96], // RGB for #ffc360
    [254, 107, 139], // RGB for #FE6B8B
    // [0, 51, 173],   // RGB for #0033ad
    [249, 51, 247], // #f933f7
    [200, 216, 235],
    [60, 221, 251],
    // [255, 142, 83], // RGB for #FF8E53
  ];

  const gradientColors: string[] = [];
  const totalIntervals = presetColors.length;
  const interpolatedSteps = steps - presetColors.length;
  const stepsPerInterval = Math.floor(interpolatedSteps / (totalIntervals - 1));
  const remainder = interpolatedSteps % (totalIntervals - 1);

  for (let i = 0; i < totalIntervals - 1; i++) {
    gradientColors.push(`rgb(${presetColors[i].join(",")})`);
    const currentSteps = (i < remainder) ? stepsPerInterval + 1 : stepsPerInterval;
    for (let j = 1; j <= currentSteps; j++) {
      const factor = j / (currentSteps + 1);
      const interpolatedColor = interpolateColor(presetColors[i], presetColors[i + 1], factor);
      gradientColors.push(`rgb(${interpolatedColor.join(",")})`);
    }
  }

  gradientColors.push(`rgb(${presetColors[presetColors.length - 1].join(",")})`);

  return gradientColors;
}

export const colorSwitch = (number: number, theme: Theme) => {
  return number > 0
    ? theme.palette.up.main
    : number < 0
      ? theme.palette.down.main
      : theme.palette.text.secondary;
};