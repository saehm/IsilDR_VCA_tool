<script>
    import { scaleBand, scaleLinear } from "d3";

    /** @type {{ values: number[][]; labels: any[]; columns: string[] }} */
    export let data;

    export let radius = 5;

    $: columns = data.columns.map((col, i) => {
        return { col, i };
    });

    /** @type {import("$lib/Clusters.js").Clusters} */
    export let clusters;

    export let margin = {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
    };
    export let width = 500;
    export let height = 500;

    /** @type {number[][]} */
    let domains;
    $: {
        let biggest_span = -Infinity;
        const column_domains = columns.map(({ i }) => {
            const [min, max] = extent(data.values, (d) => d[i]);
            const span = max - min;
            biggest_span = Math.max(biggest_span, span);
            return [min, max, span];
        });
        domains = column_domains.map(([min, max, span]) => {
            const o = Math.abs(biggest_span - span) / 2;
            return [min - o, max + o];
        });
    }

    $: splom_pos_scale = {
        x: scaleBand()
            .domain(columns.slice(0, -1).map(({ col }) => col))
            .range([margin.left, width - margin.right])
            .padding(0.05),
        y: scaleBand()
            .domain(columns.slice(1).map(({ col }) => col))
            .range([margin.top, height - margin.bottom])
            .padding(0.05),
    };
    const fm = 8;
    $: fw = splom_pos_scale.x.bandwidth();
    $: fh = splom_pos_scale.y.bandwidth();
    $: scales = domains.map((domain) => {
        return {
            x: scaleLinear()
                .domain(domain)
                .range([fm, fw - fm]),
            y: scaleLinear()
                .domain(domain)
                .range([fh - fm, fm]),
        };
    });

    /**
     * @param {number[][]} values
     * @param {(d: number[]) => number} accessor
     */
    function extent(values, accessor) {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < values.length; ++i) {
            const value = accessor(values[i]);
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
        return [min, max];
    }

    export let monochrome = false;

    /** @type {boolean[] | null} */
    export let selection = null;
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<svg class={$$props.class} {width} {height} role="figure">
    {#each columns.slice(0, -1) as { col, i }}
        {#each columns.slice(1) as { col: row, i: j }}
            {#if i < j}
                <g transform="translate({splom_pos_scale.x(col)}, {splom_pos_scale.y(row)})">
                    <slot name="bg" points={data.values.map((row) => [scales[i].x(row[i]), scales[j].y(row[j])])}
                    ></slot>
                    <rect width={fw} height={fh} fill="none" class="stroke-neutral-content" rx="1em" />
                    <g class="text-base-300">
                        {#each data.values as d, k}
                            <circle
                                class="stroke-current"
                                cx={scales[i].x(d[i])}
                                cy={scales[j].y(d[j])}
                                r={radius / 2}
                                fill={monochrome ? "black" : clusters.find_cluster_by_index(k).color}
                                opacity={selection ? (selection[k] ? 1 : 0.1) : 1}
                            />
                        {/each}
                    </g>
                    <slot name="fg" points={data.values.map((row) => [scales[i].x(row[i]), scales[j].y(row[j])])}
                    ></slot>
                </g>
            {/if}
        {/each}
    {/each}
</svg>
