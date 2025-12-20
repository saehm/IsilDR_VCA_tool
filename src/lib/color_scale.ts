import { color, interpolateRgb, piecewise, quantize, scaleOrdinal, schemeObservable10, shuffle } from "d3";

const interpolator = piecewise(interpolateRgb.gamma(1.4), ["indianred", "gold", "mediumseagreen", "rebeccapurple"]);

export function get_color_scale(d: number) {
    if (d >= 2) {
        const scale = scaleOrdinal(quantize(interpolator, d));
        return (d: string) => {
            const c = color(scale(d));
            if (c === undefined || c === null) throw new Error("should not happen");
            return c.formatHex();
        };
    } else {
        return () => "black";
    }
}
