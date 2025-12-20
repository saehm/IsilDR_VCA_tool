<script lang="ts">
    import { extent, scaleLinear } from "d3";

    let {
        data,
        label_colors,
        clusters,
        merged,
        epsilon,
        data_height = 12,
        width = 500,
        margin = 5,
        bracket_height = 3,
    }: {
        data: number[];
        label_colors: string[];
        clusters: Map<number, Set<number>>;
        merged: Map<number, Set<number>>;
        epsilon: number;
        data_height?: number;
        width?: number;
        margin?: number;
        bracket_height?: number;
    } = $props();

    let h = $derived(data_height);

    let scale = $derived(
        scaleLinear()
            //@ts-ignore
            .domain(extent(data))
            .range([margin, width - margin]),
    );

    let brackets = $derived(
        new Map(
            clusters.entries().map(([cluster_id, points]) => {
                const point_indices = Array.from(points);
                let [min, max] = extent(point_indices.map((id) => data[id]));
                if (min === undefined || max === undefined) throw new Error("should not happen");
                return [
                    cluster_id,
                    {
                        min: min - epsilon / 2,
                        mid: (min + max) / 2,
                        max: max + epsilon / 2,
                        color: label_colors[point_indices[0]],
                    },
                ];
            }),
        ),
    );

    let merge_brackets = $derived(
        Array.from(merged.values())
            .map((connections, i) => {
                const connection_list = Array.from(connections);
                let mids = connection_list.map((cluster_id) => {
                    const bracket = brackets.get(cluster_id);
                    if (bracket === undefined) throw new Error("should not happen");
                    return bracket.mid;
                });

                const [min, max] = extent(mids);
                if (min === undefined || max === undefined) throw new Error("should not happen");

                const color = brackets.get(connection_list[0])?.color;
                if (color === undefined) {
                    throw new Error("should not happen");
                }

                return {
                    mids,
                    min,
                    max,

                    color,
                };
            })
            .filter((d) => d.mids.length >= 2)
            .sort((a, b) => a.min - b.min),
    );

    let height = $derived(2 * margin + data_height + merge_brackets.length * bracket_height);
</script>

<svg {width} {height}>
    {#each data as p, i (i)}
        <path d="M {scale(p)} {margin} v {h}" fill="none" stroke={label_colors[i]} />
    {/each}

    {#each brackets.values() as { min, max, color }, i (i)}
        <path
            d="M {scale(min)} {margin + h} v {bracket_height} H {scale(max)} v {-bracket_height}"
            fill="none"
            stroke={color}
            stroke-dasharray="1 1"
        />
    {/each}

    {#each merge_brackets.values() as { min, max, mids, color }, i (i)}
        {@const depth = i + 1}
        {@const bracket_h = bracket_height * depth}
        <g fill="none" stroke={color} stroke-dasharray="1 1">
            <path d="M {scale(min)} {margin + h + bracket_height} v {bracket_h} H {scale(max)} v {-bracket_h}" />
            {#each mids as mid, j (j)}
                <path d="M {scale(mid)} {margin + h + bracket_height} v {bracket_h}" />
            {/each}
        </g>
    {/each}
</svg>
