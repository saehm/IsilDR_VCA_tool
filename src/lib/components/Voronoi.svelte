<script>
    import { Delaunay } from "d3";

    export let data;
    export let width;
    export let height;
    export let color_scale;

    $: delaunay = Delaunay.from(data);
    $: voronoi = delaunay.voronoi([0, 0, width, height]);
</script>

{#if voronoi}
    {#each data as _, i}
        <path d="M {voronoi.cellPolygon(i)?.join('L')} Z" fill={color_scale(i)} fill-opacity="0.5" />
    {/each}
{/if}
