import { extent } from "d3";

/**function
 *
 * @param {number[][]} data
 * @param {{keep_aspect_ratio?: boolean}} param1
 * @returns {[number, number][]}
 */
export function get_domains(data, { keep_aspect_ratio = true } = {}) {
    const dim = data[0].length;

    let max_span = -Infinity;
    let max_span_index = -1;

    const extents = Array.from({ length: dim }, (_, i) => {
        const [min, max] = extent(data, (d) => d[i]);
        if (min === undefined || max === undefined) throw Error("No valid numbers");
        const span = max - min;
        if (span > max_span) {
            max_span = span;
            max_span_index = i;
        }
        return { min, max, span };
    });

    if (keep_aspect_ratio) {
        for (let i = 0; i < dim; ++i) {
            if (i === max_span_index) continue;
            const delta = Math.abs(extents[i].span - max_span) / 2;
            extents[i].min -= delta;
            extents[i].max += delta;
        }
    }

    return extents.map((d) => [d.min, d.max]);
}
