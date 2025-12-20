<script>
    import { Clusters } from "$lib/Clusters.js";
    import { get_link_types, get_link_types_on_MST, table_types } from "$lib/table_types.js";
    import { MST } from "$lib/utils";
    import { EBG } from "$lib/ebg";

    import * as mistle from "@saehrimnir/mistle";
    import { distance_matrix, Matrix, PCA, TopoMap, TSNE, UMAP } from "@saehrimnir/druidjs";
    import * as isildr from "@saehrimnir/isildr";

    import * as d3 from "d3";
    import {
        ChartScatter,
        ChevronsDownUp,
        ChevronsUpDown,
        HelpCircle,
        Minus,
        Palette,
        PictureInPicture2,
        Settings,
        View,
    } from "lucide-svelte";

    import Scatterplot from "$lib/components/Scatterplot.svelte";
    import Katex from "$lib/components/Katex.svelte";
    import SPLOM from "$lib/components/SPLOM.svelte";
    import ColorDialog from "$lib/components/ColorDialog.svelte";
    import HilDrSubspaceSelector from "$lib/components/HilDRSubspaceSelector.svelte";
    import EnrichedCard from "./EnrichedCard.svelte";

    const b = 6;
    let width = 100;
    $: height = width;
    const hd_width = 300;
    const hd_height = hd_width;

    const link_color_scale = d3.scaleOrdinal(d3.schemeTableau10);
    /** @param {1 | 2 | 3 | 4 | 5 | 6} v */
    const link_color = (v) => link_color_scale(String(v));

    /** @type {(0 | 1 | 2 | 3 | 4 | 5)[]} */
    let table_types_selection_between = [];
    /** @type {(0 | 1 | 2 | 3 | 4 | 5)[]} */
    let table_types_selection_within = [];
    /** @type {number} */
    let radius = 6;
    /** @type {"hd" | "proj"} */
    let show_mst = "proj";

    const test_data = {
        name: "blobs",
        ...mistle.blobs({
            N: 120,
            D: 4,
            centers: [
                [0.5, 0, 0, 0.5],
                [0, 0, 0.5, 0.5],
                [0, 0.5, 0.5, 0],
                [0.5, 0.5, 0, 0],
            ],
            deviations: 0.1,
            seed: 1212,
        }),
    };

    const SQRT3REZ = 1 / Math.sqrt(3);
    const SQRT6REZ = 1 / Math.sqrt(6);
    // const tetrahedron_k = 4;
    // const tetrahedron = {
    //     name: "Tetrahedron",
    //     ...mistle.blobs({
    //         N: 100,
    //         D: 3,
    //         centers: [
    //             [0, 1.5 * SQRT3REZ * tetrahedron_k, -SQRT6REZ * tetrahedron_k],
    //             [1 * tetrahedron_k, -SQRT3REZ * tetrahedron_k, -SQRT6REZ * tetrahedron_k],
    //             [-1 * tetrahedron_k, -SQRT3REZ * tetrahedron_k, -SQRT6REZ * tetrahedron_k],
    //             [0, 0, 3 * SQRT6REZ * tetrahedron_k],
    //             [0, 0, SQRT6REZ * tetrahedron_k],
    //         ],
    //         deviations: 0.4,
    //         seed: 1212,
    //     }),
    // };

    const SQRT10REZ = 1 / Math.sqrt(10);
    const pentachoron = {
        name: "Pentachoron",
        ...mistle.blobs({
            N: 80,
            D: 4,
            centers: [
                [SQRT10REZ, SQRT6REZ, SQRT3REZ, 1],
                [SQRT10REZ, SQRT6REZ, SQRT3REZ, -1],
                [SQRT10REZ, SQRT6REZ, -2 * SQRT3REZ, 0],
                [SQRT10REZ, -Math.sqrt(3 / 2), 0, 0],
                [-2 * Math.sqrt(2 / 5), 0, 0, 0],
            ],
            deviations: 0.05,
            seed: 1215,
        }),
    };

    // const pca_fail_data = {
    //     name: "PCA synthetic",
    //     ...mistle.blobs({
    //         N: 100,
    //         D: 3,
    //         centers: [
    //             [-1, 1, 0],
    //             [1, -1, 0],
    //             [-1, -1, 0],
    //             [-0.9, -0.9, 0.25],
    //             [1, 1, 0],
    //             [0, 0, 0],
    //             [0.1, 0.1, 1.5],
    //         ],
    //         deviations: 0.05,
    //     }),
    // };

    const datasets = [
        //pca_fail_data,
        pentachoron,
        //tetrahedron,
        test_data,
        { name: "iris", ...mistle.IRIS },
        { name: "wine", ...mistle.wine({ normalize: true }) },
        { name: "yeast", ...mistle.YEAST },
        { name: "vehicle", ...mistle.VEHICLE },
        { name: "vowels", ...mistle.VOWELS },
        { name: "thy", ...mistle.THY },
        { name: "sonar", ...mistle.SONAR },
        { name: "segment", ...mistle.SEGMENT },
        { name: "ecoli", ...mistle.ECOLI },
        { name: "ecoli_cont", ...mistle.ECOLI_CONT },
        { name: "glass", ...mistle.GLASS },
        { name: "iono", ...mistle.IONO },
        { name: "rays", ...mistle.rays({ N: 100, D: 4, touching: false }) },
        { name: "SSHAPE", ...mistle.SSHAPE },
        { name: "SPOTIFY", ...mistle.SPOTIFY },
    ];
    let selected_data_index = 2;
    /** @type {{ values: number[][]; labels: string[]; name: string; columns: string[] }} */
    $: selected_data = datasets[selected_data_index];
    //@ts-ignore
    const color_scale = d3.scaleOrdinal(d3.schemeObservable10);
    $: hd_mst = MST(Matrix.from(selected_data.values));
    $: hd_D = distance_matrix(Matrix.from(selected_data.values));
    $: hd_max_D = Number(d3.max(hd_D.values));
    $: hd_cluster_graph = EBG(hd_D.to2dArray, { epsilon, metric: "precomputed" });
    $: hd_clusters = new Clusters(clusters_to_labels(count_components(hd_cluster_graph).clusters), {
        color_scale,
    });
    $: epsilon = Math.round(hd_D.mean * 500) / 1000;

    $: delta_pca = epsilon;
    $: pca_proj = PCA.transform(selected_data.values);
    $: pca_D = distance_matrix(Matrix.from(pca_proj));
    $: pca_max_D = Number(d3.max(pca_D.values, (d) => d));
    $: pca_mst = MST(Matrix.from(pca_proj));
    $: pca_cluster_graph = EBG(pca_D.to2dArray, { metric: "precomputed", epsilon: delta_pca });
    $: pca_clusters = new Clusters(clusters_to_labels(count_components(pca_cluster_graph).clusters), {
        color_scale,
    });
    $: all_pca_link_types = get_link_types(hd_D, pca_D, pca_clusters, epsilon);
    $: mst_pca_link_types = get_link_types_on_MST(
        hd_D,
        pca_D,
        pca_clusters,
        show_mst == "hd" ? hd_mst : pca_mst,
        delta_pca,
    );

    $: delta_topomap = epsilon;
    $: topomap_proj = TopoMap.transform(selected_data.values);
    $: topomap_D = distance_matrix(Matrix.from(topomap_proj));
    $: topomap_max_D = Number(d3.max(topomap_D.values, (d) => d));
    $: topomap_mst = MST(Matrix.from(topomap_proj));
    $: topomap_cluster_graph = EBG(topomap_D.to2dArray, { metric: "precomputed", epsilon: delta_topomap });
    $: topomap_clusters = new Clusters(clusters_to_labels(count_components(topomap_cluster_graph).clusters), {
        color_scale,
    });
    $: all_topomap_link_types = get_link_types(hd_D, topomap_D, topomap_clusters, epsilon);
    $: mst_topomap_link_types = get_link_types_on_MST(
        hd_D,
        topomap_D,
        topomap_clusters,
        show_mst == "hd" ? hd_mst : topomap_mst,
        delta_topomap,
    );

    function prepare_tsne(para, values) {
        const tsne = new TSNE(values, para);
        tsne.init();
        return tsne;
    }

    let tsne_scale = 0.2;

    $: delta_tsne = epsilon;
    $: tsne = prepare_tsne(tsne_parameters, selected_data.values);
    $: tsne_parameters = { perplexity: 5, epsilon: 0.4 };
    $: tsne_orig_proj = tsne.transform();
    $: tsne_proj = Matrix.from(tsne_orig_proj).mult(tsne_scale).asArray;
    $: tsne_D = distance_matrix(Matrix.from(tsne_proj));
    $: tsne_max_D = Number(d3.max(tsne_D.values, (d) => d));
    $: tsne_mst = MST(Matrix.from(tsne_proj));
    $: tsne_cluster_graph = EBG(tsne_D.to2dArray, { metric: "precomputed", epsilon: delta_tsne });
    $: tsne_clusters = new Clusters(clusters_to_labels(count_components(tsne_cluster_graph).clusters), {
        color_scale,
    });
    $: all_tsne_link_types = get_link_types(hd_D, tsne_D, tsne_clusters, epsilon);
    $: mst_tsne_link_types = get_link_types_on_MST(
        hd_D,
        tsne_D,
        tsne_clusters,
        show_mst == "hd" ? hd_mst : tsne_mst,
        delta_tsne,
    );

    $: delta_gsp = epsilon;
    /** @type {[number, number][]} */
    $: gsp_proj = isildr
        .greedy_shortest_path_projection(selected_data.values, [s1, s2])
        .map((row) => row.map((col) => col.d))
        .map((row) => [row[0], row[1]]);
    $: gsp_D = distance_matrix(Matrix.from(gsp_proj));
    $: gsp_max_D = Number(d3.max(gsp_D.values, (d) => d));
    $: gsp_mst = MST(Matrix.from(gsp_proj));
    $: gsp_cluster_graph = EBG(gsp_D.to2dArray, { metric: "precomputed", epsilon: delta_gsp });
    $: gsp_clusters = new Clusters(clusters_to_labels(count_components(gsp_cluster_graph).clusters), {
        color_scale,
    });
    $: all_gsp_link_types = get_link_types(hd_D, gsp_D, gsp_clusters, epsilon);
    $: mst_gsp_link_types = get_link_types_on_MST(
        hd_D,
        gsp_D,
        gsp_clusters,
        show_mst == "hd" ? hd_mst : gsp_mst,
        delta_gsp,
    );

    $: delta_umap = epsilon;
    $: umap_proj = UMAP.transform(selected_data.values);
    $: umap_D = distance_matrix(Matrix.from(umap_proj));
    $: umap_max_D = Number(d3.max(umap_D.values, (d) => d));
    $: umap_mst = MST(Matrix.from(umap_proj));
    $: umap_cluster_graph = EBG(umap_D.to2dArray, { metric: "precomputed", epsilon: delta_umap });
    $: umap_clusters = new Clusters(clusters_to_labels(count_components(umap_cluster_graph).clusters), {
        color_scale,
    });
    $: all_umap_link_types = get_link_types(hd_D, umap_D, umap_clusters, epsilon);
    $: mst_umap_link_types = get_link_types_on_MST(
        hd_D,
        umap_D,
        umap_clusters,
        show_mst == "hd" ? hd_mst : umap_mst,
        delta_umap,
    );

    $: delta_hildr = epsilon;
    $: delta_hildr_sub = epsilon;

    /** @type {[number, number][]} */
    $: hildr_proj = make_hildr_proj(selected_data.values, perm_axis.x, perm_axis.y, epsilon, delta_hildr);

    /**
     * @param {number[][]} values
     * @param {number[] | undefined} p1
     * @param {number[] | undefined} p2
     * @param {any} epsilon
     * @param {any} delta_hildr
     */
    function make_hildr_proj(values, p1, p2, epsilon, delta_hildr) {
        const result = d3.zip(
            isildr.one_d_projection(values, b, p1).map((d) => d.d * Math.SQRT1_2),
            isildr.one_d_projection(values, b, p2).map((d) => d.d * Math.SQRT1_2),
        );
        /** @type {[number, number][]} */
        const output = [];
        for (const row of result) {
            output.push([row[0], row[1]]);
        }
        return output;
    }
    $: hildr_D = distance_matrix(Matrix.from(hildr_proj));
    $: hildr_max_D = Number(d3.max(hildr_D.values, (d) => d));
    $: hildr_mst = MST(Matrix.from(hildr_proj));
    $: hildr_cluster_graph = EBG(hildr_D.to2dArray, { metric: "precomputed", epsilon: delta_hildr });
    $: hildr_clusters = new Clusters(clusters_to_labels(count_components(hildr_cluster_graph).clusters), {
        color_scale,
    });

    /**
     * @param {number[][]} values
     * @param {{ x: number[]; y: number[] }} sub_axis
     */
    function make_hildr_sub_proj(values, sub_axis) {
        if (!sub_axis || sub_axis.x.length === 0 || sub_axis.y.length === 0) return [];
        const result = isildr
            .hildr_projection(values, b, [sub_axis.x, sub_axis.y], "subspace")
            .map((d) => d.map((v) => v.d));
        return result;
    }
    $: hildr_sub_proj = make_hildr_sub_proj(selected_data.values, sub_axis);
    $: hildr_sub_D = distance_matrix(Matrix.from(hildr_sub_proj));
    $: hildr_sub_max_D = Number(d3.max(hildr_sub_D.values, (d) => d));
    $: hildr_sub_mst = MST(Matrix.from(hildr_sub_proj));
    $: hildr_sub_cluster_graph = EBG(hildr_sub_D.to2dArray, { metric: "precomputed", epsilon: delta_hildr_sub });
    $: hildr_sub_clusters = new Clusters(clusters_to_labels(count_components(hildr_sub_cluster_graph).clusters), {
        color_scale,
    });
    $: all_hildr_sub_link_types = get_link_types(hd_D, hildr_sub_D, hildr_sub_clusters, epsilon);
    $: mst_hildr_sub_link_types = get_link_types_on_MST(
        hd_D,
        hildr_sub_D,
        hildr_sub_clusters,
        show_mst == "hd" ? hd_mst : hildr_sub_mst,
        delta_hildr,
    );

    $: all_hildr_link_types = get_link_types(hd_D, hildr_D, hildr_clusters, epsilon);
    $: mst_hildr_link_types = get_link_types_on_MST(
        hd_D,
        hildr_D,
        hildr_clusters,
        show_mst == "hd" ? hd_mst : hildr_mst,
        delta_hildr,
    );

    $: all_link_types = [
        { name: "PCA", link_types: all_pca_link_types, order: 2 },
        { name: "GSP", link_types: all_gsp_link_types, order: 3 },
        { name: "HilDR", link_types: all_hildr_link_types, order: 4 },
        { name: "HilDRsub", link_types: all_hildr_sub_link_types, order: 5 },
        { name: "TSNE", link_types: all_tsne_link_types, order: 6 },
        { name: "TopoMap", link_types: all_topomap_link_types, order: 7 },
        { name: "UMAP", link_types: all_umap_link_types, order: 8 },
    ];

    /** @param {import("$lib/ebg.ts").Graph} graph */
    function count_components(graph) {
        const N = graph.length;
        const visited = new Set();
        let components = 0;
        let clusters = [];
        for (let i = 0; i < N; ++i) {
            if (visited.has(i)) {
                continue;
            }
            components++;
            /** @type {number[]} */
            let cluster = [];
            depth_first_search(graph, i, visited, cluster);
            clusters.push(cluster);
        }
        return { components, clusters };
    }

    /** @param {number[][]} clusters */
    function clusters_to_labels(clusters) {
        const labels = []; //Array.from({ length: N });
        let i = 1;
        for (const cluster of clusters) {
            for (const index of cluster) {
                labels[index] = String(i);
            }
            i++;
        }
        return labels;
    }

    /**
     * @param {import("$lib/ebg.ts").Graph} graph
     * @param {number} i
     * @param {Set<number>} visited
     * @param {number[]} cluster
     */
    function depth_first_search(graph, i, visited, cluster) {
        visited.add(i);
        cluster.push(i);
        for (const j of graph.edge(i)) {
            if (!visited.has(j)) {
                depth_first_search(graph, j, visited, cluster);
            }
        }
    }

    let show_colors = true;
    let show_hd_clusters = false;

    /** @type {boolean[]} */
    $: selection = selected_data.values.map(() => true);

    /// HILDR SECTION

    $: D = selected_data.columns.length;
    $: perm_axis = { x: [1, 2], y: [3] };
    // subspace HILDR
    /** @type {{ x: number[]; y: number[] }} */
    $: sub_axis = { x: [1, 2], y: [3] };

    // GSP
    $: s1 = Math.floor((selected_data.values.length - 1) * 0.25);
    $: s2 = Math.floor((selected_data.values.length - 1) * 0.75);
    $: indices = d3.range(0, selected_data.values.length);
    $: indices_y = indices.filter((d) => d != s1);

    /** @type {HTMLDialogElement} */
    let hd_modal;

    /** @type {Set<string>} */
    let invisible = new Set(["PCA\\&HilDR", "UMAP", "TopoMap"]); //all_link_types.map((d) => d.name);

    /** @param {number[][]} proj */
    function scale_for_tikz(proj) {
        const [min_x, max_x] = d3.extent(proj, (d) => d[0]);
        const mean_x = (max_x + min_x) / 2; // d3.mean(proj, (d) => d[0]);
        const [min_y, max_y] = d3.extent(proj, (d) => d[1]);
        const mean_y = (max_y + min_y) / 2; //d3.mean(proj, (d) => d[1]);
        const new_proj = proj.map(([x, y]) => [x - mean_x, y - mean_y]);
        const max_r = d3.max(new_proj, (d) => Math.hypot(d[0], d[1]));
        return new_proj.map(([x, y]) => [x / max_r, y / max_r].map((v) => v.toFixed(4)));
    }

    function to_tikz(selection) {
        let tikzdata = "";
        const pca_scaled = scale_for_tikz(pca_proj);
        const hildr_scaled = scale_for_tikz(gsp_proj);
        const tsne_scaled = scale_for_tikz(tsne_proj);

        const pca_color = pca_clusters.point_colors();
        const hildr_color = gsp_clusters.point_colors();
        const tsne_color = tsne_clusters.point_colors();
        const hd_color = hd_clusters.point_colors();

        for (let i = 0; i < selected_data.values.length; i++) {
            //tikzdata += `${pca_scaled[i].join("/")}/${hildr_scaled[i].join("/")}/${tsne_scaled[i].join("/")}/${selection[i] ? "1" : "0.1"}/${pca_color[i]}/${hildr_color[i]}/${tsne_color[i]}/${hd_color[i]},%\n`;
            tikzdata += `${pca_scaled[i].join(",")},${hildr_scaled[i].join(",")},${tsne_scaled[i].join(",")},${selection[i] ? "1" : "0.1"},${pca_color[i]},${hildr_color[i]},${tsne_color[i]},${hd_color[i]}\n`;
        }
        console.log(tikzdata);
    }

    //$: to_tikz(selection);

    let show_hulls = true;

    /** @type {number | null} */
    let draggeditem = null;

    /**
     * @param {DragEvent & { currentTarget: HTMLElement }} e
     * @param {number} index
     */
    function dragstart(e, index) {
        draggeditem = index;
    }

    /**
     * @param {DragEvent & { currentTarget: HTMLElement }} e
     * @param {number} index
     */
    function dragover(e, index) {
        e.preventDefault();
        e.stopPropagation();
        if (index == draggeditem) return;
        if (!draggeditem) return;
        const current = all_link_types.find((d) => d.order == index);
        if (!current) return;
        if (current.order == draggeditem) return;
        const dragged = all_link_types.find((d) => d.order == draggeditem);
        if (!dragged) return;
        current.order = draggeditem;
        dragged.order = index;
        draggeditem = index;
        all_link_types = all_link_types;
    }

    /** @param {DragEvent & { currentTarget: HTMLElement }} e */
    function dragend(e) {
        draggeditem = null;
    }

    let grid_columns = 3;

    /** @type {Clusters | null} */
    let labels_of_projection = null;
    /** @type {string | null} */
    let labels_masterview = null;

    $: {
        if (labels_masterview) {
            switch (labels_masterview) {
                case "HD":
                    labels_of_projection = hd_clusters;
                    break;
                case "PCA":
                    labels_of_projection = pca_clusters;
                    break;
                case "GSP":
                    labels_of_projection = gsp_clusters;
                    break;
                case "HilDR":
                    labels_of_projection = hildr_clusters;
                    break;
                case "TopoMap":
                    labels_of_projection = topomap_clusters;
                    break;
                case "TSNE":
                    labels_of_projection = tsne_clusters;
                    break;
                case "UMAP":
                    labels_of_projection = umap_clusters;
            }
        }
    }

    let show_controls = true;
    let border_indicators = false;

    /** @param {KeyboardEvent} event */
    function keyboard_shortcuts(event) {
        if (event.code === "KeyH" && event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            show_hulls = !show_hulls;
        } else if (event.code === "KeyC" && event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            show_controls = !show_controls;
        } else if (event.code === "KeyF" && event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            border_indicators = !border_indicators;
        }
    }

    /** @type {HTMLDialogElement} */
    let hd_color_dialog;

    let show_table = false;

    let hd_in_line = true;

    let settings_expanded = false;
</script>

<svelte:window on:keydown={keyboard_shortcuts} />

<div class="px-4 grid gap-4 w-full" style="grid-template-columns: 350px auto">
    <aside class="flex gap-y-4 flex-col">
        <section class="rounded-box shadow-md border">
            <header class="rounded-t-box border-b bg-base-300/70">
                <h2 class="py-4 mx-4 flex gap-2 items-center text-2xl font-black">
                    <Settings /> Settings
                    <div class="flex-1"></div>
                    <button class="btn btn-ghost" on:click={() => (settings_expanded = !settings_expanded)}>
                        {#if settings_expanded}
                            <ChevronsDownUp />
                        {:else}
                            <ChevronsUpDown />
                        {/if}
                    </button>
                </h2>
            </header>
            <div class="flex flex-col p-4 bg-base-200/70">
                <label class="form-control">
                    <div class="label">
                        <span class="label-text">Pick dataset</span>
                    </div>
                    <select
                        class="select select-sm select-bordered"
                        bind:value={selected_data_index}
                        on:change={() => {
                            selection = selected_data.values.map(() => true);
                        }}
                    >
                        {#each datasets as dataset, i}
                            <option value={i}>{dataset?.name}</option>
                        {/each}
                    </select>
                </label>
            </div>
            <div class="divider my-0 py-0"></div>
            <div class="px-4">
                <div class="form-control">
                    <label class="label cursor-pointer gap-2">
                        <span class="label-text w-fit text-right">radius</span>
                        <input type="range" class="range range-sm" min="0" max="20" step="1" bind:value={radius} />
                        <span class="label-text-alt w-20 font-mono">
                            <input class="input input-xs w-full" type="number" bind:value={radius} />
                        </span>
                    </label>
                </div>
            </div>
            <div class="divider my-0 py-0"></div>
            {#if settings_expanded}
                <div class="px-4">
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">MST from projection</span>
                            <input type="radio" class="radio radio-sm" value="proj" bind:group={show_mst} />
                        </label>
                    </div>
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">MST from input-data</span>
                            <input type="radio" class="radio radio-sm" value="hd" bind:group={show_mst} />
                        </label>
                    </div>
                </div>
                <div class="divider my-0 py-0"></div>
                <div class="px-4">
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">Cluster colors</span>
                            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={show_colors} />
                        </label>
                    </div>
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">Show HD clusters</span>
                            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={show_hd_clusters} />
                        </label>
                    </div>
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">Show Hulls (<kbd>Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>H</kbd>)</span>
                            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={show_hulls} />
                        </label>
                    </div>
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text"
                                >Show border indicators (<kbd>ctrl</kbd>+<kbd>⇧</kbd>+<kbd>F</kbd>)</span
                            >
                            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={border_indicators} />
                        </label>
                    </div>
                </div>

                <div class="divider my-0 py-0"></div>
            {/if}
            <div class="px-4 relative">
                <span
                    class="tooltip absolute top-0 right-3"
                    data-tip="drag&drop to change order, click to toggle visibility of a projection."
                >
                    <HelpCircle />
                </span>
                <ul class="mt-5 mx-2 gap-0.5 menu menu-horizontal">
                    {#each all_link_types as { name, order } (name)}
                        <li class="" style="order: {order};">
                            <button
                                draggable="true"
                                on:dragstart={(ev) => dragstart(ev, order)}
                                on:dragover={(ev) => dragover(ev, order)}
                                on:dragend={dragend}
                                class="btn"
                                class:btn-neutral={!invisible.has(name)}
                                class:active={!invisible.has(name)}
                                on:click={() => {
                                    if (invisible.has(name)) {
                                        invisible.delete(name);
                                    } else {
                                        invisible.add(name);
                                    }
                                    invisible = invisible;
                                }}>{name}</button
                            >
                        </li>
                    {/each}
                </ul>
            </div>
            <div class="divider my-0 py-0"></div>
            <div class="px-4">
                <label class="">
                    <div class="label-text">Number of columns: {grid_columns}</div>
                    <input type="range" min="1" max="10" class="range range-sm" step="1" bind:value={grid_columns} />
                    <div class="flex w-full justify-between px-2 font-mono text-xs text-neutral-content">
                        {#each d3.range(0, 10) as i}
                            <span>|</span>
                        {/each}
                    </div>
                </label>
            </div>
            {#if settings_expanded}
                <div class="divider my-0 py-0"></div>

                <div class="px-4 mb-2">
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">Show Controls (<kbd>ctrl</kbd>+<kbd>⇧</kbd>+<kbd>C</kbd>)</span>
                            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={show_controls} />
                        </label>
                    </div>
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">Show Table</span>
                            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={show_table} />
                        </label>
                    </div>
                    <div class="form-control hover:bg-base-200/70 rounded-box -m-1 p-1 -mx-2 px-2">
                        <label class="label cursor-pointer">
                            <span class="label-text">Show SPLOM inline</span>
                            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={hd_in_line} />
                        </label>
                    </div>
                </div>
            {/if}
        </section>
    </aside>
    <article>
        <section class="flex gap-4">
            <dialog bind:this={hd_modal} id="hd_modal" class="modal">
                <div class="modal-box w-max max-w-full">
                    <div class="form-control w-full">
                        <label class="label cursor-pointer gap-2 w-full px-2">
                            <span class="label-text w-max text-right"><Katex math="\varepsilon" /></span>
                            <input
                                type="range"
                                class="range range-sm w-full"
                                disabled={true}
                                min="0.001"
                                max={hd_max_D}
                                step="0.001"
                                bind:value={epsilon}
                            />
                            <span class="label-text-alt font-mono w-36">
                                <input class="input w-full" type="number" step="0.001" bind:value={epsilon} />
                            </span>
                        </label>
                    </div>
                    {#if selected_data.values[0].length == 2}
                        <Scatterplot
                            width={2.5 * hd_width}
                            height={2.5 * hd_height}
                            projection={selected_data.values}
                            clusters={labels_of_projection ?? hd_clusters}
                            original_clusters={hd_clusters}
                            {border_indicators}
                            {radius}
                            mode="none"
                            selection={selected_data.values.map(() => true)}
                            show_ground_truth={false}
                        >
                            <g slot="bg" let:scales>
                                {#each hd_mst as [source, target, weight]}
                                    {@const p_s = selected_data.values[source]}
                                    {@const p_t = selected_data.values[target]}
                                    {@const d = `M ${scales.x(p_s[0])} ${scales.y(p_s[1])} L ${scales.x(p_t[0])} ${scales.y(p_t[1])}`}
                                    <path
                                        {d}
                                        fill="none"
                                        stroke="#3336"
                                        stroke-dasharray={weight < epsilon ? null : "2 2"}
                                    />
                                {/each}
                            </g>
                        </Scatterplot>
                    {:else if selected_data.values[0].length > 2}
                        <SPLOM
                            {radius}
                            data={selected_data}
                            width={3 * hd_width}
                            height={3 * hd_height}
                            clusters={labels_of_projection ?? hd_clusters}
                            monochrome={!show_colors}
                            {selection}
                        >
                            <g slot="bg" let:points>
                                {#each hd_mst as [source, target, weight]}
                                    {@const p_s = points[source]}
                                    {@const p_t = points[target]}
                                    {@const d = `M ${p_s[0]} ${p_s[1]} L ${p_t[0]} ${p_t[1]}`}
                                    <path
                                        {d}
                                        fill="none"
                                        stroke="#3336"
                                        stroke-dasharray={weight < epsilon ? null : "2 2"}
                                    />
                                {/each}
                            </g>
                        </SPLOM>
                    {/if}
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
            {#if !hd_in_line}
                <section
                    class="rounded-box shadow-md border outline-2 outline-offset-4 outline-primary"
                    class:outline={labels_masterview == "HD"}
                    class:border-primary={labels_masterview == "HD"}
                >
                    <header class="rounded-t-box border-b bg-base-300/70">
                        <h2 class="py-4 mx-4 flex gap-2 items-center text-2xl font-black">
                            <ChartScatter />HD
                            <div class="flex-1"></div>
                            <button
                                class="btn btn-sm btn-outline btn-square border-neutral-content tooltip"
                                class:bg-primary={labels_masterview == "HD"}
                                class:text-primary-content={labels_masterview == "HD"}
                                data-tip="Color other views with the same colors!"
                                on:click={() => {
                                    if (labels_masterview == "HD") {
                                        labels_of_projection = null;
                                        labels_masterview = null;
                                    } else {
                                        labels_of_projection = hd_clusters;
                                        labels_masterview = "HD";
                                    }
                                }}
                            >
                                <View class="ml-1" />
                            </button>
                            <ColorDialog bind:element={hd_color_dialog} clusters={hd_clusters} />
                            <button
                                class="btn btn-sm btn-outline btn-square border-neutral-content"
                                on:click={() => hd_color_dialog?.show()}
                            >
                                <Palette />
                            </button>
                            <button
                                class="btn btn-sm btn-square btn-outline border-neutral-content"
                                on:click={() => hd_modal?.showModal()}
                            >
                                <PictureInPicture2 />
                            </button>
                        </h2>
                    </header>

                    <div class="form-control w-full bg-base-200/70 border-b">
                        <label class="label cursor-pointer gap-2 w-full px-2">
                            <span class="label-text w-max text-right"><Katex math="\varepsilon" /></span>
                            <input
                                type="range"
                                class="range range-sm w-full disabled:[--range-shdw:oklch(var(--b3))] disabled:cursor-not-allowed"
                                disabled={labels_masterview != null && labels_masterview != "HD"}
                                min=".001"
                                max={hd_max_D}
                                step="0.001"
                                bind:value={epsilon}
                            />
                            <span class="label-text-alt font-mono w-36">
                                <input class="input input-xs w-full" type="number" step="0.001" bind:value={epsilon} />
                            </span>
                        </label>
                    </div>
                    {#if selected_data.values[0].length == 2}
                        <Scatterplot
                            width={hd_width}
                            height={hd_height}
                            projection={selected_data.values}
                            clusters={labels_of_projection ?? hd_clusters}
                            original_clusters={labels_of_projection ?? hd_clusters}
                            {border_indicators}
                            {radius}
                            mode="none"
                            selection={selected_data.values.map(() => true)}
                            show_ground_truth={false}
                        >
                            <g slot="bg" let:scales>
                                {#each hd_mst as [source, target, weight]}
                                    {@const p_s = selected_data.values[source]}
                                    {@const p_t = selected_data.values[target]}
                                    {@const d = `M ${scales.x(p_s[0])} ${scales.y(p_s[1])} L ${scales.x(p_t[0])} ${scales.y(p_t[1])}`}
                                    <path
                                        {d}
                                        fill="none"
                                        stroke="#3336"
                                        stroke-dasharray={weight < epsilon ? null : "2 2"}
                                    />
                                {/each}
                            </g>
                        </Scatterplot>
                    {:else if selected_data.values[0].length > 2}
                        <SPLOM
                            {radius}
                            data={selected_data}
                            width={hd_width}
                            height={hd_height}
                            clusters={labels_of_projection ?? hd_clusters}
                            monochrome={!show_colors}
                            {selection}
                        >
                            <g slot="bg" let:points>
                                {#each hd_mst as [source, target, weight]}
                                    {@const p_s = points[source]}
                                    {@const p_t = points[target]}
                                    {@const d = `M ${p_s[0]} ${p_s[1]} L ${p_t[0]} ${p_t[1]}`}
                                    <path
                                        {d}
                                        fill="none"
                                        stroke="#3336"
                                        stroke-dasharray={weight < epsilon ? null : "2 2"}
                                    />
                                {/each}
                            </g>
                        </SPLOM>
                    {/if}
                </section>
            {/if}
            {#if show_table}
                <section class="rounded-box shadow-md border">
                    <table class="table table-sm w-max">
                        <thead>
                            <tr class="bg-base-300/70">
                                <th class="rounded-tl-box"></th>
                                <th rowspan="1" colspan="2"> </th>
                                <th
                                    class="text-center text-lg"
                                    colspan={all_link_types.filter(({ name }) => !invisible.has(name)).length}
                                >
                                    between clusters
                                </th>
                                <th rowspan="1" colspan="2"> </th>
                                <th
                                    class="text-center text-lg rounded-tr-box"
                                    colspan={all_link_types.filter(({ name }) => !invisible.has(name)).length}
                                >
                                    within clusters
                                </th>
                            </tr>
                            <tr class="bg-base-200/70">
                                <th>condition</th>
                                <th colspan="2">
                                    <label>
                                        <input
                                            type="checkbox"
                                            class="checkbox"
                                            checked={table_types_selection_between?.length === 6}
                                            indeterminate={table_types_selection_between?.length > 0 &&
                                                table_types_selection_between?.length < 6}
                                            on:click={() => {
                                                if (table_types_selection_between.length === 6) {
                                                    table_types_selection_between = [];
                                                } else {
                                                    table_types_selection_between = [0, 1, 2, 3, 4, 5];
                                                }
                                            }}
                                        />
                                    </label>
                                </th>
                                {#each all_link_types as { name }}
                                    {#if !invisible.has(name)}
                                        <th>{name}</th>
                                    {/if}
                                {/each}
                                <th colspan="2">
                                    <label>
                                        <input
                                            type="checkbox"
                                            class="checkbox"
                                            checked={table_types_selection_within?.length === 6}
                                            indeterminate={table_types_selection_within?.length > 0 &&
                                                table_types_selection_within?.length < 6}
                                            on:click={() => {
                                                if (table_types_selection_within.length === 6) {
                                                    table_types_selection_within = [];
                                                } else {
                                                    table_types_selection_within = [0, 1, 2, 3, 4, 5];
                                                }
                                            }}
                                        />
                                    </label>
                                </th>
                                {#each all_link_types as { name }}
                                    {#if !invisible.has(name)}
                                        <th>{name}</th>
                                    {/if}
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each table_types as type, i}
                                <tr>
                                    <td><Katex math={type.latex} /></td>
                                    <td>
                                        <label>
                                            <input
                                                type="checkbox"
                                                class="checkbox"
                                                value={i}
                                                bind:checked={type.checked["between"]}
                                                bind:group={table_types_selection_between}
                                            />
                                        </label>
                                    </td>
                                    <td>
                                        <div class="avatar placeholder">
                                            <div
                                                class="w-6 rounded-full"
                                                style:background-color={link_color(type.name)}
                                            ></div>
                                        </div>
                                    </td>
                                    {#each all_link_types as { name, link_types }}
                                        {#if !invisible.has(name)}
                                            <td class="text-right">
                                                <span class="font-mono">
                                                    {link_types[type.name]["between"].length}
                                                </span>
                                            </td>
                                        {/if}
                                    {/each}
                                    <td>
                                        <label>
                                            <input
                                                type="checkbox"
                                                class="checkbox"
                                                value={i}
                                                bind:checked={type.checked["within"]}
                                                bind:group={table_types_selection_within}
                                            />
                                        </label>
                                    </td>
                                    <td>
                                        <div class="avatar placeholder">
                                            <div
                                                class="w-4 rounded-full outline outline-black outline-2 outline-offset-2"
                                                style:background-color={link_color(type.name)}
                                            ></div>
                                        </div>
                                    </td>
                                    {#each all_link_types as { name, link_types }}
                                        {#if !invisible.has(name)}
                                            <td class="text-right">
                                                <span class="font-mono">
                                                    {link_types[type.name]["within"].length}
                                                </span>
                                            </td>
                                        {/if}
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </section>
            {/if}
        </section>

        <section
            class="
            grid
            gap-x-4
            grid-rows-[min-content_min-content_min-content_min-content]"
            style="grid-template-columns: repeat({grid_columns}, 1fr);"
        >
            {#if hd_in_line}
                <section
                    class="rounded-box shadow-md mb-4 border border-neutral outline-2 outline-offset-4 outline-primary grid grid-cols-1 row-span-4 grid-rows-subgrid"
                    class:outline={labels_masterview == "HD"}
                    class:border-primary={labels_masterview == "HD"}
                >
                    <header class="rounded-t-box border-b bg-base-300/70">
                        <h2 class="py-4 mx-4 flex gap-2 items-center text-2xl font-black">
                            <ChartScatter />HD
                            <div class="flex-1"></div>
                            <button
                                class="btn btn-sm btn-outline btn-square border-neutral-content tooltip"
                                class:bg-primary={labels_masterview == "HD"}
                                class:text-primary-content={labels_masterview == "HD"}
                                data-tip="Color other views with the same colors!"
                                on:click={() => {
                                    if (labels_masterview == "HD") {
                                        labels_of_projection = null;
                                        labels_masterview = null;
                                    } else {
                                        labels_of_projection = hd_clusters;
                                        labels_masterview = "HD";
                                    }
                                }}
                            >
                                <View class="ml-1" />
                            </button>
                        </h2>
                    </header>

                    <div class="form-control w-full bg-base-200/70 border-b">
                        <label class="label cursor-pointer gap-2 w-full px-2">
                            <span class="label-text w-max text-right"><Katex math="\varepsilon" /></span>
                            <input
                                type="range"
                                class="range range-sm w-full disabled:[--range-shdw:oklch(var(--b3))] disabled:cursor-not-allowed"
                                disabled={labels_masterview != null && labels_masterview != "HD"}
                                min=".001"
                                max={hd_max_D}
                                step="0.001"
                                bind:value={epsilon}
                            />
                            <span class="label-text-alt font-mono w-36">
                                <input class="input input-xs w-full" type="number" step="0.001" bind:value={epsilon} />
                            </span>
                        </label>
                    </div>
                    {#if selected_data.values[0].length == 2}
                        <Scatterplot
                            {width}
                            {height}
                            projection={selected_data.values}
                            clusters={labels_of_projection ?? hd_clusters}
                            original_clusters={labels_of_projection ?? hd_clusters}
                            {border_indicators}
                            {radius}
                            mode="none"
                            selection={selected_data.values.map(() => true)}
                            show_ground_truth={false}
                        >
                            <g slot="bg" let:scales>
                                {#each hd_mst as [source, target, weight]}
                                    {@const p_s = selected_data.values[source]}
                                    {@const p_t = selected_data.values[target]}
                                    {@const d = `M ${scales.x(p_s[0])} ${scales.y(p_s[1])} L ${scales.x(p_t[0])} ${scales.y(p_t[1])}`}
                                    <path
                                        {d}
                                        fill="none"
                                        stroke="#3336"
                                        stroke-dasharray={weight < epsilon ? null : "2 2"}
                                    />
                                {/each}
                            </g>
                        </Scatterplot>
                    {:else if selected_data.values[0].length > 2}
                        <SPLOM
                            {radius}
                            data={selected_data}
                            {width}
                            {height}
                            clusters={labels_of_projection ?? hd_clusters}
                            monochrome={!show_colors}
                            {selection}
                        >
                            <g slot="bg" let:points>
                                {#each hd_mst as [source, target, weight]}
                                    {@const p_s = points[source]}
                                    {@const p_t = points[target]}
                                    {@const d = `M ${p_s[0]} ${p_s[1]} L ${p_t[0]} ${p_t[1]}`}
                                    <path
                                        {d}
                                        fill="none"
                                        stroke="#3336"
                                        stroke-dasharray={weight < epsilon ? null : "2 2"}
                                    />
                                {/each}
                            </g>
                        </SPLOM>
                    {/if}
                    <footer class="flex p-2 gap-2 rounded-b-box bg-base-200/70">
                        <div class="flex-1"></div>
                        <ul class="menu menu-xs menu-horizontal bg-base-100 rounded-box">
                            <li>
                                <button on:click={() => hd_color_dialog?.show()}>
                                    <Palette />
                                </button>
                            </li>
                            <li>
                                <button on:click={() => hd_modal?.showModal()}>
                                    <PictureInPicture2 />
                                </button>
                            </li>
                        </ul>
                    </footer>
                    <ColorDialog bind:element={hd_color_dialog} clusters={hd_clusters} />
                </section>
            {/if}
            {#if !invisible.has("PCA")}
                <EnrichedCard
                    style="order: {all_link_types.find((d) => d.name === 'PCA')?.order};"
                    class={labels_masterview === "PCA"
                        ? "outline outline-2 outline-offset-2 outline-primary border-primary"
                        : null}
                    name="PCA"
                    bind:clientWidth={width}
                    projection={pca_proj}
                    own_clusters={pca_clusters}
                    clusters={labels_of_projection ?? pca_clusters}
                    original_clusters={hd_clusters}
                    link_types={mst_pca_link_types}
                    max_D={pca_max_D}
                    bind:delta={delta_pca}
                    bind:selection
                    {labels_masterview}
                    {show_hd_clusters}
                    {show_hulls}
                    {show_colors}
                    {table_types_selection_between}
                    {table_types_selection_within}
                    {link_color}
                    {radius}
                    {width}
                    {height}
                    {show_controls}
                    {border_indicators}
                >
                    <svelte:fragment slot="actions">
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            class:bg-primary={labels_masterview == "PCA"}
                            class:text-primary-content={labels_masterview == "PCA"}
                            on:click={() => {
                                if (labels_masterview == "PCA") {
                                    labels_of_projection = null;
                                    labels_masterview = null;
                                } else {
                                    labels_of_projection = pca_clusters;
                                    labels_masterview = "PCA";
                                }
                            }}
                        >
                            <View />
                        </button>
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            on:click={() => {
                                invisible.add("PCA");
                                invisible = invisible;
                            }}><Minus /></button
                        >
                    </svelte:fragment>
                </EnrichedCard>
            {/if}
            {#if !invisible.has("TopoMap")}
                <EnrichedCard
                    style="order: {all_link_types.find((d) => d.name === 'TopoMap')?.order};"
                    class={labels_masterview == "TopoMap"
                        ? "outline outline-2 outline-offset-2 outline-primary border-primary"
                        : null}
                    name="TopoMap"
                    projection={topomap_proj}
                    own_clusters={topomap_clusters}
                    clusters={labels_of_projection ?? topomap_clusters}
                    original_clusters={hd_clusters}
                    link_types={mst_topomap_link_types}
                    max_D={topomap_max_D}
                    bind:delta={delta_topomap}
                    bind:selection
                    {labels_masterview}
                    {show_hd_clusters}
                    {show_hulls}
                    {show_colors}
                    {table_types_selection_between}
                    {table_types_selection_within}
                    {link_color}
                    {radius}
                    {width}
                    {height}
                    {show_controls}
                    {border_indicators}
                >
                    <svelte:fragment slot="actions">
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            class:bg-primary={labels_masterview == "TopoMap"}
                            class:text-primary-content={labels_masterview == "TopoMap"}
                            on:click={() => {
                                if (labels_masterview == "TopoMap") {
                                    labels_of_projection = null;
                                    labels_masterview = null;
                                } else {
                                    labels_of_projection = topomap_clusters;
                                    labels_masterview = "TopoMap";
                                }
                            }}
                        >
                            <View />
                        </button>
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            on:click={() => {
                                invisible.add("TopoMap");
                                invisible = invisible;
                            }}><Minus /></button
                        >
                    </svelte:fragment>
                </EnrichedCard>
            {/if}

            {#if !invisible.has("TSNE")}
                <EnrichedCard
                    style="order: {all_link_types.find((d) => d.name === 'TSNE')?.order};"
                    class={labels_masterview === "TSNE"
                        ? "outline outline-2 outline-offset-2 outline-primary border-primary"
                        : null}
                    name="TSNE"
                    projection={tsne_proj}
                    own_clusters={tsne_clusters}
                    clusters={labels_of_projection ?? tsne_clusters}
                    original_clusters={hd_clusters}
                    link_types={mst_tsne_link_types}
                    max_D={tsne_max_D}
                    bind:delta={delta_tsne}
                    bind:selection
                    {labels_masterview}
                    {show_hd_clusters}
                    {show_hulls}
                    {show_colors}
                    {table_types_selection_between}
                    {table_types_selection_within}
                    {link_color}
                    {radius}
                    {width}
                    {height}
                    {show_controls}
                    {border_indicators}
                >
                    <svelte:fragment slot="settings">
                        <label class="label cursor-pointer gap-2 w-full">
                            <!-- <span class="label-text w-max text-right">ẟ<sub>{sub_name ?? name}</sub></span> -->
                            <span class="label-text w-max text-right">scale</span>
                            <input
                                type="range"
                                class="range range-sm w-full disabled:[--range-shdw:oklch(var(--b3))] disabled:cursor-not-allowed"
                                min={10e-5}
                                max={2}
                                step={10e-5}
                                bind:value={tsne_scale}
                            />
                            <span class="label-text-alt w-36 font-mono">
                                <input
                                    class="input input-xs w-full"
                                    type="number"
                                    step={10e-5}
                                    bind:value={tsne_scale}
                                />
                            </span>
                        </label>
                        <label class="label cursor-pointer gap-2 w-full">
                            <!-- <span class="label-text w-max text-right">ẟ<sub>{sub_name ?? name}</sub></span> -->
                            <span class="label-text w-max text-right">perplexity</span>
                            <input
                                type="range"
                                class="range range-sm w-full disabled:[--range-shdw:oklch(var(--b3))] disabled:cursor-not-allowed"
                                min={2}
                                max={100}
                                step={1}
                                bind:value={tsne_parameters.perplexity}
                            />
                            <span class="label-text-alt w-36 font-mono">
                                <input
                                    class="input input-xs w-full"
                                    type="number"
                                    step={0.001}
                                    bind:value={tsne_parameters.perplexity}
                                />
                            </span>
                        </label>
                    </svelte:fragment>
                    <svelte:fragment slot="actions">
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            class:bg-primary={labels_masterview == "TSNE"}
                            class:text-primary-content={labels_masterview == "TSNE"}
                            on:click={() => {
                                if (labels_masterview == "TSNE") {
                                    labels_of_projection = null;
                                    labels_masterview = null;
                                } else {
                                    labels_of_projection = tsne_clusters;
                                    labels_masterview = "TSNE";
                                }
                            }}
                        >
                            <View />
                        </button>
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            on:click={() => {
                                invisible.add("TSNE");
                                invisible = invisible;
                            }}><Minus /></button
                        >
                    </svelte:fragment>
                </EnrichedCard>
            {/if}

            {#if !invisible.has("UMAP")}
                <EnrichedCard
                    style="order: {all_link_types.find((d) => d.name === 'UMAP')?.order};"
                    class={labels_masterview === "UMAP"
                        ? "outline outline-2 outline-offset-2 outline-primary border-primary"
                        : null}
                    name="UMAP"
                    projection={umap_proj}
                    own_clusters={umap_clusters}
                    clusters={labels_of_projection ?? umap_clusters}
                    original_clusters={hd_clusters}
                    link_types={mst_umap_link_types}
                    max_D={umap_max_D}
                    bind:delta={delta_umap}
                    bind:selection
                    {labels_masterview}
                    {show_hd_clusters}
                    {show_hulls}
                    {show_colors}
                    {table_types_selection_between}
                    {table_types_selection_within}
                    {link_color}
                    {radius}
                    {width}
                    {height}
                    {show_controls}
                    {border_indicators}
                >
                    <svelte:fragment slot="actions">
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            class:bg-primary={labels_masterview == "UMAP"}
                            class:text-primary-content={labels_masterview == "UMAP"}
                            on:click={() => {
                                if (labels_masterview == "UMAP") {
                                    labels_of_projection = null;
                                    labels_masterview = null;
                                } else {
                                    labels_of_projection = umap_clusters;
                                    labels_masterview = "UMAP";
                                }
                            }}
                        >
                            <View />
                        </button>
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            on:click={() => {
                                invisible.add("UMAP");
                                invisible = invisible;
                            }}><Minus /></button
                        >
                    </svelte:fragment>
                </EnrichedCard>
            {/if}

            {#if !invisible.has("GSP")}
                <EnrichedCard
                    style="order: {all_link_types.find((d) => d.name === 'GSP')?.order};"
                    class={labels_masterview === "GSP"
                        ? "outline outline-2 outline-offset-2 outline-primary border-primary"
                        : null}
                    name="GSP"
                    projection={gsp_proj}
                    own_clusters={gsp_clusters}
                    clusters={labels_of_projection ?? gsp_clusters}
                    original_clusters={hd_clusters}
                    link_types={mst_gsp_link_types}
                    max_D={gsp_max_D}
                    bind:delta={delta_gsp}
                    bind:selection
                    {labels_masterview}
                    {show_hd_clusters}
                    {show_hulls}
                    {show_colors}
                    {table_types_selection_between}
                    {table_types_selection_within}
                    {link_color}
                    {radius}
                    {width}
                    {height}
                    {show_controls}
                    {border_indicators}
                >
                    <svelte:fragment slot="settings">
                        {#if show_controls}
                            <div class="w-full grid grid-cols-2 gap-2 p-2">
                                <label class="form-control w-full">
                                    <div class="label block py-0 whitespace-nowrap overflow-y-clip">First Start</div>
                                    <select class="select select-xs select-bordered" bind:value={s1}>
                                        {#each indices as i}
                                            <option value={i}>{i}</option>
                                        {/each}
                                    </select>
                                </label>
                                <label class="form-control w-full">
                                    <div class="label block py-0 whitespace-nowrap overflow-y-clip w-full">
                                        Second Start
                                    </div>
                                    <select class="select select-xs select-bordered" bind:value={s2}>
                                        {#each indices_y as i}
                                            <option value={i}>{i}</option>
                                        {/each}
                                    </select>
                                </label>
                            </div>
                        {/if}
                    </svelte:fragment>
                    <svelte:fragment slot="actions">
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            class:bg-primary={labels_masterview == "GSP"}
                            class:text-primary-content={labels_masterview == "GSP"}
                            on:click={() => {
                                if (labels_masterview == "GSP") {
                                    labels_of_projection = null;
                                    labels_masterview = null;
                                } else {
                                    labels_of_projection = gsp_clusters;
                                    labels_masterview = "GSP";
                                }
                            }}
                        >
                            <View />
                        </button>
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            on:click={() => {
                                invisible.add("GSP");
                                invisible = invisible;
                            }}><Minus /></button
                        >
                    </svelte:fragment>
                </EnrichedCard>
            {/if}

            {#if !invisible.has("HilDR")}
                <EnrichedCard
                    style="order: {all_link_types.find((d) => d.name === 'HilDR')?.order};"
                    class={labels_masterview === "HilDR"
                        ? "outline outline-2 outline-offset-2 outline-primary border-primary"
                        : null}
                    name="HilDR"
                    projection={hildr_proj}
                    own_clusters={hildr_clusters}
                    clusters={labels_of_projection ?? hildr_clusters}
                    original_clusters={hd_clusters}
                    link_types={mst_hildr_link_types}
                    max_D={hildr_max_D}
                    bind:delta={delta_hildr}
                    bind:selection
                    {labels_masterview}
                    {show_hulls}
                    {show_hd_clusters}
                    {show_colors}
                    {table_types_selection_between}
                    {table_types_selection_within}
                    {link_color}
                    {radius}
                    {width}
                    {height}
                    {show_controls}
                    {border_indicators}
                >
                    <svelte:fragment slot="settings">
                        {#if show_controls}
                            <HilDrSubspaceSelector {D} bind:axis={perm_axis} />
                        {/if}
                    </svelte:fragment>

                    <svelte:fragment slot="actions">
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            class:bg-primary={labels_masterview == "HilDR"}
                            class:text-primary-content={labels_masterview == "HilDR"}
                            on:click={() => {
                                if (labels_masterview == "HilDR") {
                                    labels_of_projection = null;
                                    labels_masterview = null;
                                } else {
                                    labels_of_projection = hildr_clusters;
                                    labels_masterview = "HilDR";
                                }
                            }}
                        >
                            <View />
                        </button>
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            on:click={() => {
                                invisible.add("HilDR");
                                invisible = invisible;
                            }}><Minus /></button
                        >
                    </svelte:fragment>
                </EnrichedCard>
            {/if}

            {#if !invisible.has("HilDRsub")}
                <EnrichedCard
                    style="order: {all_link_types.find((d) => d.name === 'HilDRsub')?.order};"
                    class={labels_masterview === "HilDRsub"
                        ? "outline outline-2 outline-offset-2 outline-primary border-primary"
                        : null}
                    name="HilDRsub"
                    projection={hildr_sub_proj}
                    own_clusters={hildr_sub_clusters}
                    clusters={labels_of_projection ?? hildr_sub_clusters}
                    original_clusters={hd_clusters}
                    link_types={mst_hildr_sub_link_types}
                    max_D={hildr_sub_max_D}
                    bind:delta={delta_hildr_sub}
                    bind:selection
                    {labels_masterview}
                    {show_hulls}
                    {show_hd_clusters}
                    {show_colors}
                    {table_types_selection_between}
                    {table_types_selection_within}
                    {link_color}
                    {radius}
                    {width}
                    {height}
                    {show_controls}
                    {border_indicators}
                >
                    <svelte:fragment slot="settings">
                        {#if show_controls}
                            <HilDrSubspaceSelector {D} bind:axis={sub_axis} />
                        {/if}
                    </svelte:fragment>

                    <svelte:fragment slot="actions">
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            class:bg-primary={labels_masterview == "HilDRsub"}
                            class:text-primary-content={labels_masterview == "HilDRsub"}
                            on:click={() => {
                                if (labels_masterview == "HilDRsub") {
                                    labels_of_projection = null;
                                    labels_masterview = null;
                                } else {
                                    labels_of_projection = hildr_sub_clusters;
                                    labels_masterview = "HilDRsub";
                                }
                            }}
                        >
                            <View />
                        </button>
                        <button
                            class="btn btn-sm btn-outline btn-square border-neutral-content"
                            on:click={() => {
                                invisible.add("HilDRsub");
                                invisible = invisible;
                            }}><Minus /></button
                        >
                    </svelte:fragment>
                </EnrichedCard>
            {/if}
        </section>
    </article>
</div>
