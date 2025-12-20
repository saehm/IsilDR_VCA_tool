<script>
    import { get_domains, get_scales } from "$lib/utils.js";

    import Axis from "./Axis.svelte";

    /** @type {number[][]} projection */
    export let projection;

    /** @type {string[]} projection */
    export let labels;

    export let color_scale;

    export let margin = {
        top: 60,
        bottom: 60,
        left: 60,
        right: 60,
    };
    export let width = 500;
    export let height = 500;
    export let draw_axis = false;

    $: domain = get_domains(projection, { keep_aspect_ratio: true });
    $: scales = get_scales(domain, [
        [margin.left, width - margin.right],
        [height - margin.top, margin.bottom],
    ]);
</script>

{#if draw_axis}
    <g id="axis">
        <Axis scale={scales.x} orientation="bottom" {width} {height} {margin} ticks={5} />
        <Axis scale={scales.x} orientation="top" {width} {height} {margin} ticks={5} />
        <Axis scale={scales.y} orientation="left" {width} {height} {margin} ticks={5} />
        <Axis scale={scales.y} orientation="right" {width} {height} {margin} ticks={5} />
    </g>
{/if}
<g id="data" stroke-width="0.5" stroke="yellow">
    {#each projection as [px, py], i}
        <circle cx={scales.x(px)} cy={scales.y(py)} r={4} fill={color_scale(labels[i])} />
    {/each}
</g>

<style>
</style>
