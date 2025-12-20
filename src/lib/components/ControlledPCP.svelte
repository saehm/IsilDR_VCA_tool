<script lang="ts">
    import { scaleLinear, scalePoint, curveLinear, line as d3line } from "d3";

    import { get_domains } from "$lib/get_domains.js";

    import Axis from "./Axis.svelte";

    let {
        values,
        columns,
        width = 1200,
        height = 300,
        margin = { left: 50, right: 50, top: 50, bottom: 50 },
        colors,
    }: {
        values: number[][];
        columns: string[];
        width: number;
        height: number;
        margin: { top: number; left: number; right: number; bottom: number };
        colors: string[];
    } = $props();

    let domains = $derived(get_domains(values, { keep_aspect_ratio: true }));

    let axes: {
        name: string;
        accessor: (d: any) => number;
        direction: "hi2lo" | "lo2hi";
        domain: [number, number];
        scale: typeof scaleLinear;
    }[] = $derived(
        columns.map((d: string, i: number) => {
            return {
                name: d,
                accessor: (e: Record<string, number>) => e[i],
                domain: domains[i],
                scale: scaleLinear,
                direction: "hi2lo",
            };
        }),
    );

    /** @type {number[]} */
    let order = $derived(axes.map((_, i) => i)); //.sort(() => Math.random() - 0.5);

    const line = d3line().curve(curveLinear);

    const data = $derived(values);

    /** @type {import("@types/d3").ScaleContinuousNumeric[]} */
    let scales = $derived(
        axes.map((col) => {
            if (!col?.scale) col.scale = scaleLinear;
            const scale = col
                .scale()
                .domain(col.domain)
                .range(
                    col.direction == "hi2lo"
                        ? [height - margin.bottom, margin.top]
                        : [margin.top, height - margin.bottom],
                );
            return scale;
        }),
    );

    let axis_scale = $derived(
        scalePoint()
            .domain(axes.map((_, i) => i))
            .range([margin.left, width - margin.right]),
    );
    let scale_stepsize = $derived(axis_scale.step());

    let selected_axis = $state(null);
    let mouse_pos = $state(null);

    let polylines = $derived(get_polylines(order, selected_axis, mouse_pos));

    function get_polylines(order, selected_axis, mouse_pos) {
        return data.map((row) => {
            const polyline = order
                .map((i, j) => {
                    const px = selected_axis == j ? mouse_pos[0] : axis_scale(i);
                    const py = scales[j](axes[j].accessor(row));
                    return [px, py];
                })
                .sort((a, b) => a[0] - b[0]);
            return line(polyline);
        });
    }
</script>

<!--
    @component
    A svelte component for drawing parallel coordinate plots.
-->

<svg {width} {height}>
    <g id="background">
        <rect {width} {height} fill="none" />
    </g>
    <g id="axes">
        {#each axes as col, index (index)}
            {@const i = order[index]}
            <g class="axis" class:transition-active={selected_axis != index} transform="translate({axis_scale(i)}, 0)">
                <g class="horizontal" transform="translate(0, {margin.top})">
                    <rect width={scale_stepsize} {height} x={-scale_stepsize / 2} y={-margin.top} fill="transparent" />
                    <rect
                        x={-scale_stepsize / 2}
                        width={scale_stepsize}
                        height={height - margin.top - margin.bottom}
                        fill="transparent"
                    />
                </g>

                <g>
                    <Axis
                        scale={scales[i]}
                        width={0}
                        {height}
                        margin={{ left: 0, right: 0, bottom: margin.bottom, top: margin.top }}
                        orientation="left"
                    ></Axis>

                    <text text-anchor="middle" dy={height - margin.bottom + 10}>{col.name}</text>
                </g>
            </g>
        {/each}
    </g>
    <g id="data" stroke="white" pointer-events="none">
        {#each polylines as d, i}
            <path {d} fill="none" stroke={colors ? colors[i] : "black"} />
        {/each}
    </g>
</svg>

<style>
    svg {
        position: relative;
        top: 0;
        left: 0;
        user-select: none;
    }

    .transition-active {
        transition: transform 0.1s;
    }

    .horizontal rect {
        cursor: pointer;
    }
</style>
