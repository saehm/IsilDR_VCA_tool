<script lang="ts">
    import * as isildr from "@saehrimnir/isildr";
    import * as mistle from "@saehrimnir/mistle";
    import { PCA, Randomizer, TSNE } from "@saehrimnir/druidjs";
    import { extent } from "d3";

    import { get_color_scale } from "$lib/color_scale";
    import { datasets } from "$lib/datasets";
    import { MDEpsilonClustering, OneDEpsilonClustering } from "$lib/epsclusters";

    import AggregatedCombHorizontal from "$lib/components/AggregatedCombHorizontal.svelte";
    import ControlledPcp from "$lib/components/ControlledPCP.svelte";
    import { get_scales } from "$lib/get_scales";
    import { get_domains } from "$lib/get_domains";
    import { Palette } from "lucide-svelte";

    const width = 1000;
    const height = 300;
    const margin = { left: 50, right: 50, top: 50, bottom: 50 };

    let selected_dataset = $state(datasets[0]);
    let normalize = $state(false);

    //@ts-ignore
    let data = $derived(!normalize ? mistle[selected_dataset] : normalizing_values(mistle[selected_dataset]));
    let unqiue_labels = $derived(Array.from(new Set([...data.labels])));

    type ColorOption = "none" | "labels" | "pca" | "hd" | "hildr" | "gsp" | "tsne" | "self";
    let how_to_color: ColorOption = $state("none");
    let how_to_color_options: ColorOption[] = ["none", "labels", "pca", "hd", "hildr", "gsp", "tsne", "self"];

    function normalizing_values(data: Pick<typeof mistle.IRIS, "values" | "columns" | "labels">) {
        const D = data.columns.length;
        const N = data.values.length;
        const new_values = [];
        const scalers = [];
        for (let j = 0; j < D; ++j) {
            const [min, max] = extent(data.values, (d) => d[j]);
            if (min === undefined || max === undefined) throw new Error("not valid data");
            const span = max - min;
            scalers.push({ min, max, span });
        }

        for (let i = 0; i < N; ++i) {
            let new_row = [];
            for (let j = 0; j < D; ++j) {
                new_row.push((data.values[i][j] - scalers[j].min) / scalers[j].span);
            }
            new_values.push(new_row);
        }

        return {
            values: new_values,
            labels: data.labels,
            columns: data.columns,
        };
    }

    let tsne_seed = $state(1212);
    let hildr_seed = $state(1212);
    let gsp_seed = $state(1212);
    let epsilon = $state(1);
    let perplexity = $state(5);
    let tsne_scale = $state(0.2);
    let comb_width = $state(300);

    let dims = $derived(data.columns.map((_, i) => i));
    let number_of_hildr_projection = $state(4);
    let axis = $derived(get_axis(number_of_hildr_projection, hildr_seed));

    function get_axis(N: number, seed: number) {
        const R = new Randomizer(seed);
        return Array.from({ length: N }, (_, i) => {
            return R.choice(dims, dims.length);
        });
    }

    function get_starting_points(N: number, seed: number): number[] {
        const R = new Randomizer(seed);
        const indices = Array.from({ length: data.values.length }, (_, i) => i);
        const res = R.choice(indices, N) as number[];
        return res;
    }

    let hildr_projections = $derived(
        axis.map((ax) => {
            //@ts-ignore
            const proj = isildr.one_d_projection(data.values, 6, ax, "full").map((d) => d.d);
            const clusters = new OneDEpsilonClustering(proj, epsilon);

            const color_scale = get_color_scale(clusters.clusters.size);
            const colors = proj.map((_, i) => {
                return color_scale(clusters.cluster_id_by_point_id(i).toString());
            });

            return { ax, proj, clusters, colors };
        }),
    );

    let number_starting_points = $state(2);
    let starting_points = $derived(get_starting_points(number_starting_points, gsp_seed));
    let gsp_projections = $derived(
        starting_points.map((sp) => {
            const proj = isildr.greedy_shortest_path_projection_1d(data.values, sp).map((d) => d.d);
            const clusters = new OneDEpsilonClustering(proj, epsilon);
            const color_scale = get_color_scale(clusters.clusters.size);
            const colors = proj.map((_, i) => {
                return color_scale(clusters.cluster_id_by_point_id(i).toString());
            });

            return { sp, proj, clusters, colors };
        }),
    );

    function collect_clusters(acc: OneDEpsilonClustering, curr: { clusters: OneDEpsilonClustering }, i: number) {
        if (i === 0) {
            return acc;
        }
        for (const cluster_points of curr.clusters.clusters.values()) {
            const list = acc.cluster_list();
            const orig_clusters = Array.from(cluster_points).map((d) => list[d]);
            const [first_cluster, ...clusters_to_merge] = Array.from(new Set(orig_clusters));
            for (const id2 of clusters_to_merge) {
                acc = acc.merge_clusters(first_cluster, id2);
            }
        }

        return acc;
    }

    let hildr_collect_clusters = $derived(
        hildr_projections.reduce(collect_clusters, hildr_projections[0].clusters.clone()),
    );

    let gsp_collect_clusters = $derived(gsp_projections.reduce(collect_clusters, gsp_projections[0].clusters.clone()));

    let hildr_merged = $derived(
        hildr_collect_clusters.clusters
            .entries()
            .reduce((acc: Map<number, Set<number>>, [cluster_id, indices]: [number, Set<number>]) => {
                let clusters_list = new Set<number>();
                for (const id of indices) {
                    clusters_list.add(hildr_projections[0].clusters.cluster_id_by_point_id(id));
                }
                acc.set(cluster_id, clusters_list);
                return acc;
            }, new Map<number, Set<number>>()),
    );

    let gsp_merged = $derived(
        gsp_collect_clusters.clusters
            .entries()
            .reduce((acc: Map<number, Set<number>>, [cluster_id, indices]: [number, Set<number>]) => {
                let clusters_list = new Set<number>();
                for (const id of indices) {
                    clusters_list.add(gsp_projections[0].clusters.cluster_id_by_point_id(id));
                }
                acc.set(cluster_id, clusters_list);
                return acc;
            }, new Map<number, Set<number>>()),
    );

    let hd_clusters = $derived(new MDEpsilonClustering(data.values, epsilon));

    let pca_projection = $derived(PCA.transform(data.values).map((d: number[]) => Array.from(d)));
    let pca_clusters = $derived(new MDEpsilonClustering(pca_projection, epsilon));

    let tsne_projection_unscaled = $derived(TSNE.transform(data.values, { perplexity, seed: tsne_seed }));
    let tsne_projection = $derived(tsne_projection_unscaled.map((d: number[]) => d.map((v) => v * tsne_scale)));

    let tsne_clusters = $derived(new MDEpsilonClustering(tsne_projection, epsilon));

    let hd_colorscale = $derived(get_color_scale(hd_clusters.clusters.size));
    let pca_colorscale = $derived(get_color_scale(pca_clusters.clusters.size));
    let hildr_colorscale = $derived(get_color_scale(hildr_collect_clusters.clusters.size));
    let gsp_colorscale = $derived(get_color_scale(gsp_collect_clusters.clusters.size));
    let ori_colorscale = $derived(get_color_scale(unqiue_labels.length));
    let tsne_colorscale = $derived(get_color_scale(tsne_clusters.clusters.size));

    let pca_cluster_colors: Record<string, string> = $state({});
    $effect(() => {
        pca_cluster_colors = pca_clusters.clusters.keys().reduce(
            (acc, key) => {
                acc[key] = pca_colorscale(key.toString());
                return acc;
            },
            {} as Record<string, string>,
        );
    });

    let hildr_cluster_colors: Record<number, string> = $state({});
    $effect(() => {
        hildr_cluster_colors = hildr_collect_clusters.clusters.keys().reduce(
            (acc, key) => {
                acc[key] = hildr_colorscale(key.toString());
                return acc;
            },
            {} as Record<number, string>,
        );
    });

    let tsne_cluster_colors: Record<number, string> = $state({});
    $effect(() => {
        tsne_cluster_colors = tsne_clusters.clusters.keys().reduce(
            (acc, key) => {
                acc[key] = tsne_colorscale(key.toString());
                return acc;
            },
            {} as Record<number, string>,
        );
    });

    let gsp_cluster_colors: Record<number, string> = $state({});
    $effect(() => {
        gsp_cluster_colors = gsp_collect_clusters.clusters.keys().reduce(
            (acc, key) => {
                acc[key] = gsp_colorscale(key.toString());
                return acc;
            },
            {} as Record<number, string>,
        );
    });

    let hd_cluster_colors: Record<number, string> = $state({});
    $effect(() => {
        hd_cluster_colors = hd_clusters.clusters.keys().reduce(
            (acc, key) => {
                acc[key] = hd_colorscale(key.toString());
                return acc;
            },
            {} as Record<number, string>,
        );
    });

    let pca_cluster_list = $derived(pca_clusters.cluster_list());
    let hildr_cluster_list = $derived(hildr_collect_clusters.cluster_list());
    let gsp_cluster_list = $derived(gsp_collect_clusters.cluster_list());
    let hd_cluster_list = $derived(hd_clusters.cluster_list());
    let tsne_cluster_list = $derived(tsne_clusters.cluster_list());

    let get_selected_color_scale = $derived((which: ColorOption) => {
        switch (which) {
            case "none":
                return (i: number) => "#000000";
            case "labels":
                return (i: number) => ori_colorscale(data.labels[i].toString());
            case "pca":
                return (i: number) => pca_cluster_colors[pca_cluster_list[i].toString()];
            case "hildr":
                return (i: number) => hildr_cluster_colors[hildr_cluster_list[i]];
            case "gsp":
                return (i: number) => gsp_cluster_colors[gsp_cluster_list[i]];
            case "hd":
                return (i: number) => hd_cluster_colors[hd_cluster_list[i]];
            case "tsne":
                return (i: number) => tsne_cluster_colors[tsne_cluster_list[i]];
            case "self":
                return (i: number) => "#000000";
        }
    });

    let color_scale_to_use = $derived(get_selected_color_scale(how_to_color));
    let label_colors = $derived(
        data.labels.map((l, i) => {
            return color_scale_to_use(i);
        }),
    );

    let true_clusters = $derived.by(() => {
        let result: { pca: Set<string>; hildr: Set<string>; gsp: Set<string> } = {
            pca: new Set(),
            hildr: new Set(),
            gsp: new Set(),
        };
        for (const [pca_cluster_id, pca_points] of pca_clusters.clusters) {
            for (const [hildr_cluster_id, hildr_points] of hildr_collect_clusters.clusters) {
                if (pca_points.symmetricDifference(hildr_points).size == 0) {
                    result.pca.add(pca_cluster_id.toString());
                    result.hildr.add(hildr_cluster_id.toString());
                }
            }
            for (const [gsp_cluster_id, gsp_points] of gsp_collect_clusters.clusters) {
                if (pca_points.symmetricDifference(gsp_points).size == 0) {
                    result.pca.add(pca_cluster_id.toString());
                    result.gsp.add(gsp_cluster_id.toString());
                }
            }
        }
        return result;
    });

    const scatterplot_width = 300;
    const scatterplot_height = 300;
</script>

{#snippet color_select(colors: Record<string, string>, true_cluster_acc?: string)}
    <div class="grid grid-cols-3 gap-2 max-h-96 overflow-y-scroll">
        <button
            onclick={() => {
                for (const [key, color] of Object.entries(colors)) {
                    if (
                        true_clusters &&
                        true_cluster_acc &&
                        true_cluster_acc in true_clusters &&
                        !true_clusters[true_cluster_acc].has(key)
                    ) {
                        colors[key] = "#cccccc";
                    }
                }
            }}
            class="btn col-span-3">all non-true clusters grey</button
        >
        {#each Object.entries(colors) as [key, color]}
            <div
                class:font-black={true_cluster_acc && true_clusters[true_cluster_acc]
                    ? true_clusters[true_cluster_acc].has(key)
                        ? true
                        : false
                    : false}
            >
                {key}
                {true_cluster_acc && true_clusters[true_cluster_acc]
                    ? true_clusters[true_cluster_acc].has(key)
                        ? "true"
                        : ""
                    : ""}
            </div>
            <input
                class="input"
                type="color"
                value={color}
                oninput={function () {
                    colors[key] = this.value;
                }}
            />
            <button
                class="btn"
                onclick={() => {
                    colors[key] = "#cccccc";
                }}>grey</button
            >
        {/each}
    </div>
{/snippet}

{#snippet create_color_dialog(modal_id: string, cluster_colors: Record<string, string>, name: string)}
    <button class="btn btn-square" onclick={() => document.getElementById(modal_id).showModal()}><Palette /></button>
    <dialog id={modal_id} class="modal">
        <div class="modal-box">
            <h3>Colors</h3>
            <div class="w-96">
                {@render color_select(cluster_colors, name)}
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button>close</button>
        </form>
    </dialog>
{/snippet}

<main class="p-4">
    <div class="flex flex-col gap-2 mb-4">
        <select class="select" bind:value={selected_dataset}>
            {#each datasets as d}
                <option value={d}>{d} ({mistle[d].values.length} × {mistle[d].columns.length})</option>
            {/each}
        </select>

        <label class="label cursor-pointer">
            <span class="label-text">normalize</span>
            <input class="checkbox" type="checkbox" bind:checked={normalize} />
        </label>

        <div>
            <span class="pr-4">clustered/colored by</span>
            <div class="join">
                {#each how_to_color_options as option}
                    <input
                        class="join-item btn checked:btn-neutral"
                        type="radio"
                        bind:group={how_to_color}
                        value={option}
                        aria-label={option}
                    />
                {/each}
            </div>
        </div>
        <label class="label cursor-pointer">
            <span class="label-text">epsilon</span>
            <input class="input number" min={0.001} max={Infinity} step={0.001} type="number" bind:value={epsilon} />
        </label>
    </div>

    <section class="card border rounded-box shadow-md mb-4">
        <header class="pt-2 rounded-t-box content-center border-b bg-base-300/70">
            <h2 class="my-2 mx-4 flex gap-2 items-center text-2xl font-black">
                <div class="overflow-hidden text-ellipsis w-full whitespace-nowrap" title="HD">HD</div>
                <div class="flex-1"></div>
            </h2>
        </header>
        <ControlledPcp
            values={data.values}
            columns={data.columns}
            {width}
            {height}
            {margin}
            colors={how_to_color === "self"
                ? data.values.map((_: number[], i: number) =>
                      hd_colorscale(hd_clusters.cluster_id_by_point_id(i).toString()),
                  )
                : label_colors}
        />

        <div class="border-t p-2">
            {@render create_color_dialog("modal_color_hd", hd_cluster_colors, "hd")}
        </div>
    </section>

    <div>
        <div class="flex gap-4">
            <section class="card border rounded-box shadow-md">
                <header class="pt-2 rounded-t-box content-center border-b bg-base-300/70">
                    <h2 class="my-2 mx-4 flex gap-2 items-center text-2xl font-black">
                        <div class="overflow-hidden text-ellipsis w-full whitespace-nowrap" title="PCA">PCA</div>
                        <div class="flex-1"></div>
                    </h2>
                </header>

                {#key label_colors}
                    {@const scales = get_scales(get_domains(pca_projection), [
                        [margin.left, scatterplot_width - margin.right],
                        [margin.top, scatterplot_height - margin.bottom],
                    ])}
                    {@const self_colors = pca_projection.map((_: number[], i: number) =>
                        pca_colorscale(pca_clusters.cluster_id_by_point_id(i).toString()),
                    )}

                    <svg width={scatterplot_width} height={scatterplot_height}>
                        <g id="bg-layer" class="text-base-200">
                            {#each pca_projection as [px, py], i}
                                <circle
                                    cx={scales.x(px)}
                                    cy={scales.y(py)}
                                    r={Math.abs(scales.x(px) - scales.x(px + epsilon / 2))}
                                    class="fill-current"
                                    stroke="none"
                                />
                            {/each}
                        </g>
                        <g id="data" class="text-base-300">
                            {#each pca_projection as [px, py], i (i)}
                                <circle
                                    class="stroke-current"
                                    cx={scales.x(px)}
                                    cy={scales.y(py)}
                                    r={3}
                                    fill={how_to_color === "self" ? self_colors[i] : label_colors[i]}
                                />
                            {/each}
                        </g>
                    </svg>
                {/key}
                <div class="border-t mt-4 p-2">
                    {@render create_color_dialog("modal_color_pca", pca_cluster_colors, "pca")}
                </div>
            </section>
            <section class="card border rounded-box">
                <header class="pt-2 rounded-t-box content-center border-b bg-base-300/70">
                    <h2 class="my-2 mx-4 flex gap-2 items-center text-2xl font-black">
                        <div class="overflow-hidden text-ellipsis w-full whitespace-nowrap" title="tSNE">tSNE</div>
                        <div class="flex-1"></div>
                    </h2>
                </header>
                <div class="flex flex-col gap-2 p-2 bg-base-200/70 border-b">
                    <label class="label cursor-pointer w-full">
                        <span class="label-text">Seed</span>
                        <input class="input input-sm" type="number" bind:value={tsne_seed} />
                    </label>
                    <label class="label cursor-pointer w-full">
                        <span class="label-text">scale</span>
                        <input
                            class="input input-sm"
                            min={0}
                            max={Infinity}
                            step={0.01}
                            type="number"
                            bind:value={tsne_scale}
                        />
                    </label>

                    <label class="label cursor-pointer w-full">
                        <span class="label-text">perplexity</span>
                        <input
                            class="input input-sm"
                            min={2}
                            max={data.values.length}
                            step={1}
                            type="number"
                            bind:value={perplexity}
                        />
                    </label>
                </div>
                {#key label_colors}
                    {@const scales = get_scales(get_domains(tsne_projection), [
                        [margin.left, scatterplot_width - margin.right],
                        [margin.top, scatterplot_height - margin.bottom],
                    ])}
                    {@const self_colors = tsne_projection.map((_: number[], i: number) =>
                        tsne_colorscale(tsne_clusters.cluster_id_by_point_id(i).toString()),
                    )}

                    <svg width={scatterplot_width} height={scatterplot_height}>
                        <g id="bg-layer" class="text-base-200">
                            {#each tsne_projection as [px, py], i}
                                <circle
                                    cx={scales.x(px)}
                                    cy={scales.y(py)}
                                    r={Math.abs(scales.x(px) - scales.x(px + epsilon / 2))}
                                    class="fill-current"
                                    stroke="none"
                                />
                            {/each}
                        </g>
                        <g id="data" class="text-base-300">
                            {#each tsne_projection as [px, py], i (i)}
                                <circle
                                    class="stroke-current"
                                    cx={scales.x(px)}
                                    cy={scales.y(py)}
                                    r={3}
                                    fill={how_to_color === "self" ? self_colors[i] : label_colors[i]}
                                />
                            {/each}
                        </g>
                    </svg>
                {/key}
                <div class="border-t mt-4 p-2">
                    {@render create_color_dialog("modal_color_tsne", tsne_cluster_colors, "tsne")}
                </div>
            </section>
            <section class="card border rounded-box shadow-md">
                <header class="pt-2 rounded-t-box content-center border-b bg-base-300/70">
                    <h2 class="my-2 mx-4 flex gap-2 items-center text-2xl font-black">
                        <div class="overflow-hidden text-ellipsis w-full whitespace-nowrap" title="HilDR">HilDR</div>
                        <div class="flex-1"></div>
                    </h2>
                </header>
                <div class="w-full p-2 bg-base-200/70 flex flex-col gap-2 border-b mb-4">
                    <label class="label cursor-pointer">
                        <span class="label-text">Seed</span>
                        <input class="input input-sm w-full" type="number" bind:value={hildr_seed} />
                    </label>
                    <div class="flex flex-col gap-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">number of projections</span>
                            <input
                                class="range range-sm"
                                type="range"
                                min={1}
                                max={80}
                                step={1}
                                bind:value={number_of_hildr_projection}
                            />
                            <input
                                class="input input-sm"
                                type="number"
                                min={1}
                                max={80}
                                step={1}
                                bind:value={number_of_hildr_projection}
                            />
                        </label>
                        <label class="label cursor-pointer">
                            <span class="label-text">width</span>
                            <input
                                class="range range-sm"
                                type="range"
                                min={100}
                                max={2000}
                                step={1}
                                bind:value={comb_width}
                            /><input
                                class="input input-sm"
                                type="number"
                                min={100}
                                max={2000}
                                step={1}
                                bind:value={comb_width}
                            />
                        </label>
                    </div>
                </div>
                <div class="grid grid-cols-[min-content_max-content_min-content] gap-2 px-2 py-0">
                    <div class="text-center">agg</div>
                    <AggregatedCombHorizontal
                        data={hildr_projections[0].proj}
                        label_colors={how_to_color === "self"
                            ? hildr_projections[0].proj.map((_, i) =>
                                  hildr_colorscale(hildr_collect_clusters.cluster_id_by_point_id(i).toString()),
                              )
                            : label_colors}
                        {epsilon}
                        clusters={hildr_projections[0].clusters.clusters}
                        merged={hildr_merged}
                        width={comb_width}
                    />
                    <div>
                        <div class="badge badge-outline">{hildr_collect_clusters.clusters.size}</div>
                    </div>
                    {#each hildr_projections as { ax, proj, clusters, colors }}
                        <div class="text-center">
                            {ax}
                        </div>
                        <AggregatedCombHorizontal
                            data={proj}
                            label_colors={how_to_color == "self" ? proj.map((_, i) => colors[i]) : label_colors}
                            {epsilon}
                            clusters={clusters.clusters}
                            merged={new Map()}
                            width={comb_width}
                        />
                        <div>
                            <div class="badge badge-outline">{clusters.clusters.size}</div>
                        </div>
                    {/each}
                </div>

                <div class="border-t mt-4 p-2">
                    {@render create_color_dialog("modal_color_hildr", hildr_cluster_colors, "hildr")}
                </div>
            </section>
            <section class="card border rounded-box shadow-md">
                <header class="pt-2 rounded-t-box content-center border-b bg-base-300/70">
                    <h2 class="my-2 mx-4 flex gap-2 items-center text-2xl font-black">
                        <div class="overflow-hidden text-ellipsis w-full whitespace-nowrap" title="GSP">GSP</div>
                        <div class="flex-1"></div>
                    </h2>
                </header>
                <div class="w-full p-2 bg-base-200/70 flex flex-col gap-2 border-b mb-4">
                    <label class="label cursor-pointer">
                        <span class="label-text">Seed</span>
                        <input class="input input-sm w-full" type="number" bind:value={gsp_seed} />
                    </label>
                    <label class="label cursor-pointer">
                        <span class="label-text">number of starting_points</span>
                        <input
                            class="range range-sm"
                            type="range"
                            min={1}
                            max={80}
                            step={1}
                            bind:value={number_starting_points}
                        />
                        <input
                            class="input input-sm"
                            type="number"
                            min={1}
                            max={80}
                            step={1}
                            bind:value={number_starting_points}
                        />
                    </label>
                    <label class="label cursor-pointer">
                        <span class="label-text">width</span>
                        <input
                            class="range range-sm"
                            type="range"
                            min={100}
                            max={2000}
                            step={1}
                            bind:value={comb_width}
                        />
                        <input
                            class="input input-sm"
                            type="number"
                            min={100}
                            max={2000}
                            step={1}
                            bind:value={comb_width}
                        />
                    </label>
                </div>
                <div class="grid grid-cols-[min-content_max-content_min-content] gap-2 px-2 py-0">
                    <div class="text-center">agg</div>
                    <AggregatedCombHorizontal
                        data={gsp_projections[0].proj}
                        label_colors={how_to_color === "self"
                            ? gsp_projections[0].proj.map((_, i) =>
                                  gsp_colorscale(gsp_collect_clusters.cluster_id_by_point_id(i).toString()),
                              )
                            : label_colors}
                        {epsilon}
                        clusters={gsp_projections[0].clusters.clusters}
                        merged={gsp_merged}
                        width={comb_width}
                    />
                    <div>
                        <div class="badge badge-outline">{gsp_collect_clusters.clusters.size}</div>
                    </div>
                    {#each gsp_projections as { sp, proj, clusters, colors }}
                        <div class="text-center">
                            {sp}
                        </div>
                        <AggregatedCombHorizontal
                            data={proj}
                            label_colors={how_to_color == "self" ? proj.map((_, i) => colors[i]) : label_colors}
                            {epsilon}
                            clusters={clusters.clusters}
                            merged={new Map()}
                            width={comb_width}
                        />
                        <div>
                            <div class="badge badge-outline">{clusters.clusters.size}</div>
                        </div>
                    {/each}
                </div>
                <div class="border-t mt-4 p-2">
                    {@render create_color_dialog("modal_color_gsp", gsp_cluster_colors, "gsp")}
                </div>
            </section>
        </div>
    </div>
</main>
