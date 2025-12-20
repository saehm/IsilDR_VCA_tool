//@ts-nocheck

import * as mistle from "@saehrimnir/mistle";

/**
 * @type {(
 *     | (keyof mistle & "IRIS")
 *     | "BLOBS"
 *     | "ECOLI"
 *     | "ECOLI_CONT"
 *     | "GLASS"
 *     | "IONO"
 *     | "MAMMOTH"
 *     | "MOONS"
 *     | "OECD"
 *     | "PENGUINS"
 *     | "RAYS"
 *     | "SEGMENT"
 *     | "SONAR"
 *     | "SPOTIFY"
 *     | "SSHAPE"
 *     | "SWISSROLL"
 *     | "THY"
 *     | "VEHICLE"
 *     | "VOWELS"
 *     | "WAVES"
 *     | "WINE"
 *     | "YEAST"
 * )[]}
 */
export const datasets = [
    "IRIS",
    "BLOBS",
    "ECOLI",
    "ECOLI_CONT",
    "GLASS",
    "IONO",
    "MAMMOTH",
    "MOONS",
    "OECD",
    "PENGUINS",
    "RAYS",
    "SEGMENT",
    "SONAR",
    "SPOTIFY",
    "SSHAPE",
    "SWISSROLL",
    "THY",
    "VEHICLE",
    "VOWELS",
    "WAVES",
    "WINE",
    "YEAST",
].filter((key) => Object.keys(mistle).includes(key) && mistle[key].columns.length > 3);
