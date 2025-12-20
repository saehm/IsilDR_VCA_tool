<script>
    import ColorDialog from "$lib/components/ColorDialog.svelte";
    import Katex from "$lib/components/Katex.svelte";
    import Scatterplot from "$lib/components/Scatterplot.svelte";

    import { table_types } from "$lib/table_types.js";
    import concaveman from "concaveman";

    import { gridify_hilbert } from "@saehrimnir/hagrid";

    import * as d3 from "d3";

    import { Grid3x3, Maximize2, Palette, RefreshCcw, RotateCcw, Sigma, WandSparkles } from "lucide-svelte";
    import Offset from "polygon-offset";

    /** @type {string} */
    export let name;
    /** @type {[number, number][]} */
    export let projection;
    /** @type {import("$lib/Clusters.js").Clusters} */
    export let own_clusters;
    /** @type {import("$lib/Clusters.js").Clusters} */
    export let clusters;
    /** @type {import("$lib/Clusters.js").Clusters} */
    export let original_clusters;
    /** @type {number[][]?} */
    export let original_mst = null;
    /** @type {boolean[]} */
    export let selection;
    $: selection = projection.map(() => true);
    /** @type {(0 | 1 | 2 | 3 | 4 | 5)[]} */
    export let table_types_selection_between;
    /** @type {(0 | 1 | 2 | 3 | 4 | 5)[]} */
    export let table_types_selection_within;
    /** @type {Record<1 | 2 | 3 | 4 | 5 | 6, { within: number[][]; between: number[][] }>} */
    export let link_types;
    /** @type {(v: 1 | 2 | 3 | 4 | 5 | 6) => string} */
    export let link_color;
    /** @type {string | null} */
    export let sub_name = null;

    /** @type {boolean} */
    export let show_colors = false;
    /** @type {boolean} */
    export let show_hd_clusters = false;
    /** @type {boolean} */
    export let keep_aspect_ratio = true;
    /** @type {boolean} */
    export let border_indicators = true;
    /** @type {boolean} */
    export let show_hulls = true;

    /** @type {number} */
    export let delta;
    /** @type {number} */
    export let radius;
    /** @type {number} */
    export let width;
    /** @type {number} */
    export let height;
    /** @type {number} */
    export let max_D = 10;
    /** @type {number} */
    export let clientWidth = 0;

    let save_projection = projection.slice();

    function gridify() {
        projection = gridify_hilbert(projection, { level: 4, keep_aspect_ratio: true });
    }

    /**
     * @param {import("$lib/Clusters.js").Clusters} clusters
     * @param {[number, number][]} projection
     * @param {{ x: (d: number) => number; y: (d: number) => number }} scales
     * @returns {Map<string, { points: [number, number][]; color: string; indices: Set<number> }>}
     */
    function cluster_hulls(clusters, projection, scales, margin, concavity = 2, lengthThreshold = 0) {
        const hulls = new Map();
        if (!scales) return hulls;

        /**
         * @param {[number, number]} param
         * @returns {[number, number]}
         */
        const point_scaler = ([px, py]) => [
            scales.x(px) + (Math.random() - 0.5) * 0.5,
            scales.y(py) + (Math.random() - 0.5) * 0.5,
        ];

        try {
            for (const [cluster, { indices, color }] of clusters.clusters) {
                if (indices.size === 1) {
                    const pos = projection[Array.from(indices)[0]];
                    hulls.set(cluster, { type: "circle", pos, color });
                }
                if (indices.size < 2) continue;
                const points = [];
                for (const i of indices) {
                    points.push(projection[i]);
                }

                const scaled_points = points.map(point_scaler);

                /** @type {[number, number][]} */
                const hull = concaveman(scaled_points, concavity, lengthThreshold).map((d) => [d[0], d[1]]);

                if (hull == null) {
                    throw new Error("no polygon");
                }

                const offset = new Offset();
                const bigger_hull = offset.data(hull).margin(margin);
                hulls.set(cluster, { points: bigger_hull, color, indices, type: "hull" });
            }
            return hulls;
        } catch (e) {
            return new Map();
        }
    }

    /** @type {boolean[]} */
    let temp_selection;

    /**
     * @param {MouseEvent & { currentTarget: SVGPathElement }} event
     * @param {Set<number>} indices
     * @param {number} i
     */
    function mouseover_hull(event, indices, i) {
        temp_selection = selection.map((d) => d);
        for (let i = 0; i < selection.length; ++i) {
            selection[i] = indices.has(i);
        }
        hovered_hull = i;
    }

    /** @param {MouseEvent} event */
    function click_hull(event) {
        if (event.ctrlKey) {
            for (let i = 0; i < selection.length; ++i) {
                if (selection[i]) temp_selection[i] = true;
            }
            temp_selection = temp_selection;
        } else {
            temp_selection = selection;
        }
    }

    function autocolor_clusters() {
        const selected_clusters = new Set();
        for (let i = 0; i < temp_selection.length; ++i) {
            if (temp_selection[i]) selected_clusters.add(clusters.find_cluster_by_index(i).label);
        }
        const interpolator = d3.piecewise(d3.interpolateRgb.gamma(1.4), [
            "indianred",
            "gold",
            "mediumseagreen",
            "rebeccapurple",
        ]);

        let color_scale;
        if (selected_clusters.size > 1) {
            const colors = d3.quantize(interpolator, selected_clusters.size).map((c) => {
                const hsl = d3.hsl(c);
                hsl.l *= 0.9;
                return hsl.formatHex();
            });
            color_scale = d3.scaleOrdinal(colors);
        } else {
            color_scale = d3.scaleOrdinal(["black"]);
        }

        for (const [key, values] of clusters.clusters.entries()) {
            if (selected_clusters.has(key)) {
                values.color = color_scale(key);
            } else {
                values.color = "#AAAAAA";
            }
        }
        clusters.clusters = clusters.clusters;
        selection = temp_selection.map(() => true);
    }

    function mouseleave_hull() {
        selection = temp_selection;
        hovered_hull = null;
    }

    function reset_selection() {
        selection = selection.map(() => true);
    }
    /** @type {number | null} */
    let hovered_hull = null;
    let interaction_mode = "hulls";

    /** @type {string | null} */
    export let labels_masterview;

    export let show_controls = false;

    /** @type {HTMLDialogElement} */
    let color_dialog;

    /** @param {number[][]} proj */
    function scale_for_tikz(proj) {
        const [min_x, max_x] = d3.extent(proj, (d) => d[0]);
        const [min_y, max_y] = d3.extent(proj, (d) => d[1]);

        const mean_x = (min_x + max_x) / 2;
        const mean_y = (min_y + max_y) / 2;
        const new_proj = proj.map(([x, y]) => [x - mean_x, y - mean_y]);
        const max_r = d3.max(new_proj, (d) => Math.hypot(d[0], d[1]));

        const scales = {
            x: (v) => ((v - mean_x) / max_r) * 2.35,
            y: (v) => ((v - mean_y) / max_r) * 2.35,
        };
        return scales;
        //return new_proj.map(([x, y]) => [x / max_r, y / max_r].map((v) => +v.toFixed(4)));
    }

    function console_tikz() {
        console.log("boundaries");
        const scales = scale_for_tikz(projection);
        const scaled = projection.map(([x, y]) => [scales.x(x) * 100, scales.y(y) * 100]);
        const margin = 0.1 * 2.35 * 100;
        const hulls = cluster_hulls(own_clusters, scaled, { x: (d) => d, y: (d) => d }, margin, 2, 0.2);
        console.log("hulls");
        let hulls_string = "";
        for (const [key, { points, color, type, pos }] of hulls.entries()) {
            if (type === "hull") {
                const points_string = points[0]
                    .map(([x, y]) => `(${(x / 100).toFixed(4)},${(y / 100).toFixed(4)})`)
                    .join("--");
                const { r, g, b } = d3.rgb(color);
                hulls_string += `\\draw[fill=black!5, draw=black!50, densely dotted] ${points_string} -- cycle;\n`;
            } else if (type === "circle") {
                hulls_string += `\\draw[fill=black!5, draw=black!50, densely dotted] (${(pos[0] / 100).toFixed(4)},${(pos[1] / 100).toFixed(4)}) circle (${margin / 100});\n`;
            }
        }
        console.log(hulls_string);
    }

    let ctrl_key = false;
</script>

<svelte:window
    on:keydown={(event) => {
        ctrl_key = true;
    }}
    on:keyup={() => (ctrl_key = false)}
/>

<ColorDialog bind:element={color_dialog} bind:clusters />

<section
    bind:clientWidth
    style={$$props.style}
    class="rounded-box shadow-md border grid grid-cols-1 row-span-4 grid-rows-subgrid mb-4 {$$props.class}"
>
    <header class="pt-2 rounded-t-box content-center border-b bg-base-300/70">
        <h2 class="my-2 mx-4 flex gap-2 items-center text-2xl font-black">
            <div class="overflow-hidden text-ellipsis w-full whitespace-nowrap" title={name}>{name}</div>
            <div class="flex-1"></div>
            <slot name="actions" />
        </h2>
    </header>
    <div class="form-control w-full px-2 py-1 bg-base-200/70">
        <label class="label cursor-pointer gap-2 w-full">
            <span class="label-text w-max text-right"><Katex math={`\\delta_\\text{${sub_name ?? name}}`} /></span>
            <input
                type="range"
                class="range range-sm w-full disabled:[--range-shdw:oklch(var(--b3))] disabled:cursor-not-allowed"
                disabled={labels_masterview != null && labels_masterview != (sub_name ?? name)}
                min="0.001"
                max={max_D}
                step="0.001"
                bind:value={delta}
            />
            <span class="label-text-alt w-36 font-mono">
                <input class="input input-xs w-full" type="number" step="0.001" bind:value={delta} />
            </span>
        </label>
        <slot name="settings" />
    </div>
    <section class="aspect-square relative">
        <Scatterplot
            class="border-y absolute top-0 left-0"
            {width}
            {height}
            {projection}
            {clusters}
            {original_clusters}
            {radius}
            {keep_aspect_ratio}
            {border_indicators}
            bind:selection
            show_ground_truth={show_hd_clusters}
            monochrome={!show_colors}
            points_pointerevents={false}
            draw_axis={false}
            mode={interaction_mode == "lasso" ? "selection" : "none"}
            axis_type="inner"
            on:select={(ev) => (selection = ev.detail.selection)}
        >
            <g slot="bg" let:scales>
                {#if show_hulls}
                    {@const hulls = cluster_hulls(own_clusters, projection, scales, radius + 2)}

                    <g>
                        {#each hulls as [, { points, color, indices, pos, type }], i}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <!-- svelte-ignore a11y_mouse_events_have_key_events -->
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            {#if type === "hull"}
                                <path
                                    d="M {points.join('L')} Z"
                                    fill={own_clusters == clusters ? color : "black"}
                                    fill-opacity="0.05"
                                    stroke={own_clusters == clusters ? color : "black"}
                                    stroke-width={0.5}
                                    stroke-dasharray="8 2"
                                    stroke-opacity={hovered_hull ? (hovered_hull == i ? 1 : 0.1) : 0.5}
                                    on:mouseover={(ev) => mouseover_hull(ev, indices, i)}
                                    on:mouseleave={mouseleave_hull}
                                    on:click={(event) => click_hull(event)}
                                    style:cursor={ctrl_key ? "copy" : "pointer"}
                                />
                            {:else if type === "circle"}
                                <circle
                                    cx={scales.x(pos[0])}
                                    cy={scales.y(pos[1])}
                                    r={radius}
                                    fill={own_clusters == clusters ? color : "black"}
                                    fill-opacity="0.05"
                                    stroke={own_clusters == clusters ? color : "black"}
                                    stroke-width={0.5}
                                    stroke-dasharray="8 2"
                                    stroke-opacity={hovered_hull ? (hovered_hull == i ? 1 : 0.1) : 0.5}
                                    style:cursor={ctrl_key ? "not-allowed" : "pointer"}
                                />
                            {/if}
                        {/each}
                    </g>
                {/if}

                {#if original_mst}
                    {#each original_mst as [source, target]}
                        {@const px = scales.x(projection[source][0])}
                        {@const py = scales.y(projection[source][1])}
                        {@const qx = scales.x(projection[target][0])}
                        {@const qy = scales.y(projection[target][1])}
                        {@const d = `M ${px} ${py} L ${qx} ${qy}`}
                        <path {d} stroke-width="1" stroke="#0003" />
                    {/each}
                {/if}
            </g>
            <g slot="fg" let:scales>
                {#each table_types as type, i}
                    {@const data = projection}
                    {#if table_types_selection_between.includes(/** @type {0 | 1 | 2 | 3 | 4 | 5} */ (i))}
                        <g stroke={link_color(type.name)} fill="none" stroke-linecap="round">
                            {#each link_types[type.name]["between"] as [source, target]}
                                {@const px = scales.x(data[source][0])}
                                {@const py = scales.y(data[source][1])}
                                {@const qx = scales.x(data[target][0])}
                                {@const qy = scales.y(data[target][1])}
                                {@const d = `M ${px} ${py} L ${qx} ${qy}`}
                                {@const opacity = selection[source] && selection[target] ? 1 : 0.1}
                                <path {d} stroke-width="5" stroke="white" {opacity} />
                                <path {d} stroke-width="3" {opacity} />
                            {/each}
                        </g>{/if}
                    {#if table_types_selection_within.includes(/** @type {0 | 1 | 2 | 3 | 4 | 5} */ (i))}
                        <g stroke={link_color(type.name)} fill="none" stroke-linecap="round">
                            {#each link_types[type.name]["within"] as [source, target]}
                                {@const px = scales.x(data[source][0])}
                                {@const py = scales.y(data[source][1])}
                                {@const qx = scales.x(data[target][0])}
                                {@const qy = scales.y(data[target][1])}
                                {@const d = `M ${px} ${py} L ${qx} ${qy}`}
                                {@const opacity = selection[source] && selection[target] ? 1 : 0.1}
                                <path {d} stroke-width="5" stroke="black" {opacity} />
                                <path {d} stroke-width="3" {opacity} />
                            {/each}
                        </g>
                    {/if}
                {/each}
            </g>
        </Scatterplot>
    </section>
    {#if show_controls}
        <footer class="flex p-2 gap-2 rounded-b-box bg-base-200/70">
            <div class="flex-1"></div>
            <ul class="menu menu-xs menu-horizontal bg-base-100 rounded-box">
                <li>
                    <button on:click={() => color_dialog?.show()}>
                        <Palette />
                    </button>
                </li>
                <li class="hidden">
                    <button on:click={autocolor_clusters}>
                        <WandSparkles />
                    </button>
                </li>
                <li class="hidden">
                    <button
                        on:click={() => {
                            temp_selection = temp_selection.map(() => true);
                            autocolor_clusters();
                        }}
                    >
                        <RotateCcw />
                    </button>
                </li>
                <li class="hidden">
                    <button on:click={console_tikz}><Sigma /></button>
                </li>
            </ul>
            <ul class="menu menu-xs menu-horizontal bg-base-100 rounded-box">
                <li>
                    <button
                        class="btn btn-ghost btn-sm tooltip"
                        data-tip="Reset points positions"
                        on:click={() => {
                            projection = save_projection;
                        }}
                    >
                        <RefreshCcw />
                    </button>
                </li>
                <li>
                    <button class="btn btn-ghost btn-sm tooltip" data-tip="Gridify" on:click={gridify}>
                        <Grid3x3 />
                    </button>
                </li>
            </ul>
        </footer>
    {/if}
</section>
