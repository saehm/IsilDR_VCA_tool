import { Randomizer } from "@saehrimnir/druidjs";
import * as d3 from "d3";
import { unique } from "./utils";

const R = new Randomizer(1212);

export class Clusters {
    /**
     * Constructs a new instance of the Clusters class.
     *
     * @param {string[]} labels - An array of labels used to initialize the clusters.
     * @param {object} options - The options for the Clusters constructor.
     * @param {d3.ScaleOrdinal<string, string>?} options.color_scale - The color scale function.
     */
    constructor(labels, { color_scale }) {
        if (color_scale == null) {
            // @ts-ignore
            this.color_scale = d3.scaleOrdinal(d3.schemeObservable10);
        } else {
            this.color_scale = color_scale;
        }

        /** @type {Map<string, { indices: Set<number>; info: any; color: string }>} */
        this.clusters = new Map();
        const unique_labels = unique(labels);
        const clusters_to_add = [];
        for (const label of unique_labels) {
            let indices = new Set();
            for (let i = 0; i < labels.length; ++i) {
                if (labels[i] == label) indices.add(i);
            }
            clusters_to_add.push({ key: label, value: { indices, info: "initial", color: this.color_scale(label) } });
        }

        const interpolator = d3.piecewise(d3.interpolateRgb.gamma(1.4), [
            "indianred",
            "gold",
            "mediumseagreen",
            "rebeccapurple",
        ]);

        if (clusters_to_add.length > 1) {
            const colors = d3
                .quantize(interpolator, clusters_to_add.length)
                .sort(() => R.random - 0.5)
                .map((c) => {
                    const hsl = d3.hsl(c);
                    hsl.l *= 0.9;
                    return hsl.formatHex();
                });
            this.color_scale = d3.scaleOrdinal(colors);
        } else {
            this.color_scale = d3.scaleOrdinal(["black"]);
        }

        for (const { key, value } of clusters_to_add) {
            this.add_cluster(key, { ...value, color: this.color_scale(key) });
        }
    }

    /**
     * Adds a new cluster to the clusters map.
     *
     * @param {string} label - The label of the cluster.
     * @param {Object} options - The options for the cluster.
     * @param {Set<number>} options.indices - The indices of the cluster.
     * @param {string | null} options.color - The color of the cluster.
     * @param {any} options.info - The additional information of the cluster.
     * @returns {void}
     */
    add_cluster(label, { indices, info, color }) {
        if (this.clusters.has(label)) throw new Error(`Cluster ${label} already exists in the clusters map`);
        for (const [cluster, { indices: other_indices }] of this.clusters) {
            for (const index of indices) {
                other_indices.delete(index);
            }
            if (other_indices.size == 0) {
                this.clusters.delete(cluster);
            }
        }

        this.clusters.set(label, { indices, info, color: color ?? this.color_scale(String(label)) });
    }

    /**
     * Finds the cluster that contains the given index.
     *
     * @param {number} index - The index to search for.
     * @returns {{ label: string; indices: Set<number>; info: any; color: string }} The cluster object that contains the
     *   index, or null if not found.
     */
    find_cluster_by_index(index) {
        for (const [label, cluster] of this.clusters) {
            if (cluster.indices.has(index)) return { label, ...cluster };
        }
        throw new Error("not found");
    }

    /**
     * Merges two clusters with the given labels into a new cluster.
     *
     * @param {string} a - The label of the first cluster to merge.
     * @param {string} b - The label of the second cluster to merge.
     * @returns {void}
     * @throws {Error} If either label does not exist in the clusters map.
     */
    merge_clusters(a, b) {
        if (!this.clusters.has(a)) throw new Error(`Cluster ${a} does not exist in the clusters map`);
        if (!this.clusters.has(b)) throw new Error(`Cluster ${b} does not exist in the clusters map`);

        const cluster_a = this.clusters.get(a);
        const cluster_b = this.clusters.get(b);
        if (!cluster_a) throw new Error(`Cluster ${a} does not exist in the clusters map`);
        if (!cluster_b) throw new Error(`Cluster ${b} does not exist in the clusters map`);

        const merged_indices = cluster_a.indices.union(cluster_b.indices);

        const new_cluster = {
            indices: merged_indices,
            info: [cluster_a.info, cluster_b.info].join("\n"),
            color: cluster_a.color,
        };

        this.clusters.delete(a);
        this.clusters.delete(b);
        this.clusters.set(`${a} ∪ ${b}`, new_cluster);
    }

    get size() {
        let sum = 0;
        for (const [_, { indices }] of this.clusters) {
            sum += indices.size;
        }
        return sum;
    }

    /**
     * Returns an array of labels based on the clusters map.
     *
     * @returns {string[]} An array of labels, where the index corresponds to the index in the clusters map.
     */
    as_labels() {
        const size = this.size;
        const labels = new Array(size);
        for (const [label, { indices }] of this.clusters) {
            for (const index of indices) {
                labels[index] = label;
            }
        }
        return labels;
    }

    point_colors() {
        const size = this.size;
        const labels = new Array(size);
        for (const [label, { indices, color }] of this.clusters) {
            const c = d3.rgb(color);
            const s = `${c.r},${c.g},${c.b}`;
            for (const index of indices) {
                labels[index] = s;
            }
        }
        return labels;
    }

    all_labels() {
        return new Set(this.as_labels());
    }
}
