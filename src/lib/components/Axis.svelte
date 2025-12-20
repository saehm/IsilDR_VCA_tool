<script>
    import * as d3 from "d3";

    /** @type {"bottom" | "left" | "right" | "top"} */
    export let orientation = "bottom";

    /** @type {number} */
    export let ticks = 5;
    /** @type {(d: any) => any} */
    export let tick_format = (d) => d;

    /** @type {{ top: number; bottom: number; left: number; right: number }} */
    export let margin = { top: 0, bottom: 0, left: 0, right: 0 };
    /** @ts-ignore */
    export let scale;
    /** @type {number} */
    export let height = 20;
    /** @type {number} */
    export let width = 100;
    /** @type {number} */
    export let tick_font_size = 12;
    /** @type {number} */
    export let label_font_size = 16;

    export let show_subgrid = false;
    export let draw_axis_line = true;
</script>

<g font-size={tick_font_size} paint-order="stroke">
    {#if orientation == "bottom"}
        <g fill="none" stroke="grey" text-anchor="middle" dominant-baseline="hanging">
            {#if scale.bandwidth}
                {#each scale.domain() as t, i}
                    <path d="M {scale(t)} {height - margin.bottom} v 8" />
                    <text x={scale(t)} y={height - margin.bottom + 12} fill="grey" stroke="#fff9">{tick_format(t)}</text
                    >
                {/each}
            {:else}
                {#each scale.ticks(ticks) as t, i}
                    {#if show_subgrid}
                        <path
                            stroke-dasharray="2 2"
                            stroke="#3336"
                            d="M {scale(t)} {margin.top} V {height - margin.bottom}"
                        />
                    {/if}
                    <path d="M {scale(t)} {height - margin.bottom} v 8" />
                    <text x={scale(t)} y={height - margin.bottom + 12} fill="grey" stroke="#fff9">{tick_format(t)}</text
                    >
                {/each}
            {/if}
            {#if draw_axis_line}<path d="M {margin.left} {height - margin.bottom} H {width - margin.right}" />{/if}
        </g>
        {#if $$slots.label_upper}
            <g
                font-size={label_font_size}
                text-anchor="end"
                dominant-baseline="hanging"
                transform="translate({width - margin.right}, {height - margin.bottom + 32})"
            >
                <slot name="label_upper" />
            </g>
        {/if}
    {:else if orientation == "top"}
        <g fill="none" stroke="grey" text-anchor="middle" dominant-baseline="start">
            {#if scale.bandwidth}
                {#each scale.domain() as t, i}
                    {@const o = scale.bandwidth() / 2}
                    <path d="M {scale(t) + o} {margin.top} v -8" />
                    <text x={scale(t) + o} y={margin.top - 12} fill="grey" stroke="#fff9">{tick_format(t)}</text>
                {/each}
            {:else}
                {#each scale.ticks(ticks) as t, i}
                    {#if show_subgrid}
                        <path
                            stroke-dasharray="2 2"
                            stroke="#3336"
                            d="M {scale(t)} {margin.top} V {height - margin.bottom}"
                        />
                    {/if}
                    <path d="M {scale(t)} {margin.top} v -8" />
                    <text x={scale(t)} y={margin.top - 12} fill="grey" stroke="#fff9">{tick_format(t)}</text>
                {/each}
            {/if}
            {#if draw_axis_line}<path d="M {margin.left} {margin.top} H {width - margin.right}" />{/if}
        </g>
        {#if $$slots.label_upper}
            <g
                font-size={label_font_size}
                text-anchor="end"
                dominant-baseline="start"
                transform="translate({width - margin.right}, {margin.top - 32})"
            >
                <slot name="label_upper" />
            </g>
        {/if}
    {:else if orientation == "left"}
        <g fill="none" stroke="grey" text-anchor="end" dominant-baseline="central">
            {#if scale.bandwidth}
                {@const o = scale.bandwidth() / 2}
                {#each scale.domain() as t, i}
                    <path d="M {margin.left} {scale(t) + o} h -8" />
                    <text x={margin.left - 12} y={scale(t) + o} fill="grey" stroke="#fff9">{tick_format(t)}</text>
                {/each}
            {:else}
                {#each scale.ticks(ticks) as t, i}
                    {#if show_subgrid}
                        <path
                            stroke-dasharray="2 2"
                            stroke="#3336"
                            d="M {margin.left} {scale(t)} H {width - margin.right}"
                        />
                    {/if}
                    <path d="M {margin.left} {scale(t)} h -8" />
                    <text x={margin.left - 12} y={scale(t)} fill="grey" stroke="#fff9">{tick_format(t)}</text>
                {/each}
            {/if}
            {#if draw_axis_line}<path d="M {margin.left} {height - margin.bottom} V {margin.top}" />{/if}
        </g>
        {#if $$slots.label_upper}
            <g
                font-size={label_font_size}
                text-anchor="end"
                dominant-baseline="start"
                transform="translate({margin.left - 42}, {margin.top}) rotate(-90)"
            >
                <slot name="label_upper" />
            </g>
        {/if}
    {:else if orientation == "right"}
        <g fill="none" stroke="grey" text-anchor="start" dominant-baseline="central">
            {#each scale.ticks(ticks) as t, i}
                {#if show_subgrid}
                    <path
                        stroke-dasharray="2 2"
                        stroke="#3336"
                        d="M {margin.left} {scale(t)} H {width - margin.right}"
                    />
                {/if}
                <path d="M {width - margin.right} {scale(t)} h 8" />
                <text x={width - margin.right + 12} y={scale(t)} fill="grey" stroke="#fff9">{tick_format(t)}</text>
            {/each}
            {#if draw_axis_line}<path d="M {width - margin.right} {height - margin.bottom} V {margin.top}" />{/if}
        </g>
        {#if $$slots.label_upper}
            <g
                font-size={label_font_size}
                text-anchor="end"
                dominant-baseline="start"
                transform="translate({width - margin.right + 32}, {margin.top}) rotate(-90)"
            >
                <slot name="label_upper" />
            </g>
        {/if}
    {/if}
</g>
