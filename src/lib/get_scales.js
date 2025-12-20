import { scaleLinear } from "d3";

/**
 *
 * @param {[[number, number], [number, number]]} domain - Domain for the scales.
 * @param {[[number, number], [number, number]]} range - Range of the scales.
 * @returns {{x: (d: any) => number, y: (d: any) => number}}
 */
export function get_scales(domain, range) {
    return {
        x: scaleLinear().domain(domain[0]).range(range[0]),
        y: scaleLinear().domain(domain[1]).range(range[1]),
    };
}
