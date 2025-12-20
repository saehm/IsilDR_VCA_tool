<script>
    import * as d3 from "d3";
    import { get_domains, get_scales } from "$lib/utils.js";
    import { onMount } from "svelte";

    import Axis from "./Axis.svelte";
    import Voronoi from "./Voronoi.svelte";

    import { createEventDispatcher } from "svelte";
    const dispatcher = createEventDispatcher();

    /** @type {number[][]} projection */
    export let projection;

    /** @type {import("$lib/Clusters.js").Clusters} */
    export let clusters;

    export let margin = {
        top: 25,
        bottom: 25,
        left: 25,
        right: 25,
    };
    export let width = 500;
    export let height = 500;
    export let draw_axis = false;
    /** @type {"outer" | "inner"} */
    export let axis_type = "outer";
    export let show_tooltip = false;
    export let keep_aspect_ratio = true;
    export let points_pointerevents = true;

    $: domain = get_domains(projection, { keep_aspect_ratio });
    $: scales = get_scales(domain, [
        [margin.left, width - margin.right],
        [height - margin.top, margin.bottom],
    ]);

    export let export_scales = null;
    $: export_scales = scales;

    /** @type {boolean} */
    let visible = false;
    /** @type {number | null} */
    let selected = null;
    /** @type {boolean[]?} */
    export let selection = null;
    /** @type {[number, number][]?} */
    let lasso = null;

    /** @type {"selection" | "none"} */
    export let mode = "selection";

    /** @param {MouseEvent} event */
    function mousemove(event) {
        let { x, y } = scales;
        const mx = event.offsetX;
        const my = event.offsetY;
        if (make_selection) {
            if (lasso === null) return;
            lasso = [...lasso, [mx, my]];
            // @ts-ignore
            selection = projection.map(([px, py]) => d3.polygonContains(lasso, [x(px), y(py)]));
        }
    }

    function mouseleave() {
        if (!show_tooltip) return;
        visible = false;
        selected = null;
    }

    let make_selection = false;

    /** @param {MouseEvent & { currentTarget: SVGSVGElement }} event */
    function mousedown(event) {
        if (event.shiftKey) return;
        if (event.button === 0 && mode == "selection") {
            lasso = [];
            selection = [];
            make_selection = true;
        }
    }

    function mouseup() {
        if (mode == "selection") {
            finish_selection();
        }
    }

    function finish_selection() {
        lasso = null;
        make_selection = false;
        if (selection?.reduce((a, b) => a || b, false) == false) {
            selection = projection.map(() => true);
        }
        dispatcher("select", { selection });
    }

    export let show_voronoi = false;
    export let original_clusters;
    export let show_ground_truth = true;

    export let radius = 4;
    export let border_indicators = true;

    export let monochrome = false;

    let zoom;
    let drag;
    /** @type {SVGSVGElement} */
    let svg;
    /** @type {SVGGElement} */
    let svg_group;

    onMount(() => {
        zoom = d3
            .zoom()
            .filter((event) => event.shiftKey)
            .scaleExtent([0.1, 8])
            .on("zoom", handleZoom);
        drag = d3
            .drag()
            .filter((event) => event.shiftKey)
            .on("drag", handleDrag);
        d3.select(svg).call(zoom);
        d3.select(svg).call(drag);
    });

    function handleZoom(event) {
        console.log(event.transform);
        transform = event.transform;
        d3.select(svg_group).attr("transform", event.transform);
    }

    function handleDrag(event) {
        const transform = d3.zoomTransform(svg.node());
        svgGroup.attr("transform", transform.scale(transform.k).translate(event.x, event.y));
    }
</script>

<svelte:window on:mouseup={mouseup} />
<div class=" select-none">
    <div id="tooltip-container">
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <svg
            bind:this={svg}
            class={$$props.class}
            {width}
            {height}
            on:mousemove={mousemove}
            on:mouseleave={mouseleave}
            on:mousedown={mousedown}
            role="figure"
        >
            <g bind:this={svg_group}>
                {#if show_voronoi}
                    <Voronoi
                        {width}
                        {height}
                        data={projection.map((d) => [scales.x(d[0]), scales.y(d[1])])}
                        color_scale={(/** @type {number} */ i) => clusters.find_cluster_by_index(i).color}
                    />
                {/if}
                <slot name="bg" {scales}></slot>
                {#if draw_axis}
                    <g id="axis">
                        {#if axis_type == "outer"}
                            <Axis scale={scales.x} orientation="bottom" {width} {height} {margin} ticks={5} />
                            <Axis scale={scales.x} orientation="top" {width} {height} {margin} ticks={5} />
                            <Axis scale={scales.y} orientation="left" {width} {height} {margin} ticks={5} />
                            <Axis scale={scales.y} orientation="right" {width} {height} {margin} ticks={5} />
                        {:else if axis_type == "inner"}
                            <g transform="translate(0, {height})">
                                <Axis
                                    scale={scales.x}
                                    orientation="top"
                                    {width}
                                    height={0}
                                    ticks={5}
                                    draw_axis_line={false}
                                />
                            </g>
                            <g transform="translate(0, 0)">
                                <Axis
                                    scale={scales.x}
                                    orientation="bottom"
                                    {width}
                                    height={0}
                                    ticks={5}
                                    draw_axis_line={false}
                                />
                                <Axis
                                    scale={scales.y}
                                    orientation="right"
                                    width={0}
                                    {height}
                                    margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
                                    ticks={5}
                                    draw_axis_line={false}
                                />
                            </g>
                            <g transform="translate({width}, 0)">
                                <Axis
                                    scale={scales.y}
                                    orientation="left"
                                    width={0}
                                    {height}
                                    ticks={5}
                                    draw_axis_line={false}
                                />
                            </g>
                        {/if}
                    </g>
                {/if}
                <g id="data" stroke-width="1" class="text-base-300">
                    {#each projection as [px, py], i}
                        {@const color = clusters.find_cluster_by_index(i).color}
                        {@const ocolor = original_clusters.find_cluster_by_index(i).color}
                        {#if border_indicators}
                            <path
                                d="M 0 {scales.y(py)} h {12}"
                                fill="none"
                                stroke={monochrome ? "black" : color}
                                stroke-width={1}
                            />
                            <path
                                d="M {scales.x(px)} 0 v {12}"
                                fill="none"
                                stroke={monochrome ? "black" : color}
                                stroke-width={1}
                            />
                        {/if}

                        <slot name="point" pos={[scales.x(px), scales.y(py)]} index={i}>
                            <circle
                                class="stroke-current"
                                cx={scales.x(px)}
                                cy={scales.y(py)}
                                r={i == selected ? radius : radius / 2}
                                fill={monochrome ? "black" : color}
                                opacity={selection && selection[i] ? 1 : 0.1}
                                pointer-events={points_pointerevents ? "all" : "none"}
                            />
                        </slot>
                        {#if show_ground_truth}
                            <circle
                                class="stroke-current"
                                cx={scales.x(px)}
                                cy={scales.y(py)}
                                r={i == selected ? radius / 2 : radius / 4}
                                fill={monochrome ? "black" : ocolor}
                                opacity={selection && selection[i] ? 1 : 0.1}
                                pointer-events="none"
                            />
                        {/if}
                    {/each}
                    {#if lasso && lasso.length > 1}
                        <g stroke="white" stroke-width="2" style="mix-blend-mode: difference">
                            <path class="lasso" d="M{lasso.join('L')}" stroke-dasharray="4 4"> </path>
                            <path d="M {lasso.at(-1)} L {lasso.at(0)}"></path>
                        </g>
                    {/if}
                </g>
                {#if $$slots.fg}
                    <slot name="fg" {scales}></slot>
                {/if}
            </g>
        </svg>
        {#if show_tooltip && visible && selected}
            <slot name="tooltip" {selected}>
                <div
                    id="tooltip"
                    style="top: {scales.y(projection[selected][1]) + 10}px; left: {scales.x(projection[selected][0]) -
                        75 / 2}px"
                >
                    x: {projection[selected][0]}
                    <br />
                    y: {projection[selected][1]}
                </div>
            </slot>
        {/if}
    </div>
    {#if $$slots.after}
        <slot name="after" {projection} {selection}></slot>
    {/if}
</div>

<style>
    #tooltip-container {
        position: relative;
    }

    #tooltip {
        opacity: 0.8;
        position: absolute;
        pointer-events: none;
        background-color: white;
        border: 1px solid grey;
        padding: 0.33em;
        width: 75px;
    }

    .lasso {
        will-change: stroke-dashoffset;
        stroke-dashoffset: 0;
        animation: strokeAni 0.333s infinite linear forwards;
    }

    @keyframes strokeAni {
        from {
            stroke-dashoffset: 0;
        }
        to {
            stroke-dashoffset: 8;
        }
    }
</style>
