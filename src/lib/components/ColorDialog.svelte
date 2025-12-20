<script>
    export let element;

    /** @type {{ clusters: Map<string, { indices: Set<number>; info: string; color: string }> }} */
    export let clusters;

    function change_color(key, c) {
        const group = clusters.clusters.get(key);
        group.color = c;
        clusters.clusters = clusters.clusters;
    }
</script>

<dialog bind:this={element} class="modal">
    <div class="modal-box w-max max-w-full">
        <button
            class="btn"
            on:click={() => {
                for (const [key, cluster] of clusters.clusters.entries()) {
                    cluster.color = "#aaaaaa";
                    clusters.clusters.set(key, cluster);
                }
            }}>Grey out all</button
        >
        <ul>
            {#each clusters.clusters.entries() as [key, { color }] (key)}
                <li>
                    <span class="inline-block w-16 text-right">{key}</span>
                    <input
                        class="w-8"
                        type="color"
                        bind:value={color}
                        on:change={() => (clusters.clusters = clusters.clusters)}
                    />
                    <button class="btn" on:click={change_color(key, "#aaaaaa")}>gray</button>
                </li>
            {/each}
        </ul>
    </div>
    <form method="dialog" class="modal-backdrop">
        <button>close</button>
    </form>
</dialog>
