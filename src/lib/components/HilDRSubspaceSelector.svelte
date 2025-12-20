<script>
    import Katex from "$lib/components/Katex.svelte";
    import { afterUpdate } from "svelte";

    /** @type {number} */
    export let D;

    $: arrD = Array.from({ length: D });
    $: sub_axis = arrD.map((_, i) => (i < D / 2 ? "x" : "y"));

    /** @type {{ x: number[]; y: number[] }} */
    export let axis = get_axes();

    /** @returns {{ x: number[]; y: number[] }} */
    function get_axes() {
        if (!sub_axis) return { x: [], y: [] };
        return sub_axis.reduce((acc, curr, i) => {
            if (curr === "x") {
                acc.x.push(i);
            } else if (curr === "y") {
                acc.y.push(i);
            }
            return acc;
        }, /** @type {{ x: number[]; y: number[] }} */ ({ x: [], y: [] }));
    }

    afterUpdate(() => {
        if (!sub_axis) return;
        axis = get_axes();
    });
</script>

<div class="w-full grid gap-2 p-2" style="grid-template-columns: auto 1fr;">
    <div><Katex math="x"></Katex>-axis</div>
    <div class="rounded bg-base-100 flex gap-1 px-1">
        {#each axis.x as p, i}
            <button
                class="btn btn-xs my-1 w-6"
                on:click={() => {
                    sub_axis[p] = "y";
                }}>{p}</button
            >
        {/each}
    </div>
    <div><Katex math="y"></Katex>-axis</div>
    <div class="rounded bg-base-100 flex gap-1 px-1">
        {#each axis.y as p, i}
            <button
                class="btn btn-xs my-1 w-6"
                on:click={() => {
                    sub_axis[p] = "x";
                }}
            >
                {p}
            </button>
        {/each}
    </div>
</div>
