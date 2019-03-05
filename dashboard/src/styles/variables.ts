/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const tablet = 768
export const desktop = 992
export const big = 1680

export const fontFamily = `font-family: Raleway, Arial, Helvetica, sans-serif`
export const fontBold = `${fontFamily};font-weight: 700;`
export const fontRegular = `${fontFamily};font-weight: 400;`
export const fontMedium = `${fontFamily};font-weight: 500;`
export const fontItalic = `${fontFamily};font-style: italic;`

function gardenPinkLighten(pct: number) {
  return `rgba(237, 131, 204, ${pct})`
}

// Colours prefixed with `garden` are from the official Garden colour palette.
// The rest are for those cases where none of the official colours worked.
export const colors = {
  border: "rgba(0,0,0,0.12)",
  gray: "#f0f0f0",
  grayLight: "#fafafa",
  gardenGray: "#555656",
  gardenGrayLight: "#cdcfd1",
  gardenBlack: "#010101",
  gardenBlue: "#00adef",
  gardenBlueDark: "#01569a",
  gardenBlueLight: "#e4f6fd",
  gardenGreenDarker: "#16999a",
  gardenGreenDark: "#00c9b6",
  gardenGreen: "#66ffcc",
  gardenGreenLight: "#c9ffed",
  gardenPink: "#ed83cc",
  gardenPinkLighten,
  gardenPinkRgba: "rgba(237, 131, 204, 0)",
  gardenWhite: "#ffffff",
}
