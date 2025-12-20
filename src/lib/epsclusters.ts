import type { ScaleOrdinal } from "d3";
import { get_color_scale } from "./color_scale";
//@ts-ignore
import { euclidean } from "@saehrimnir/druidjs";
import { EBG, type Graph } from "./ebg";

export class OneDEpsilonClustering {
    data: number[];
    ordered_data: { id: number; value: number }[];
    epsilon: number;
    clusters: Map<number, Set<number>>;
    color_scale: ScaleOrdinal<string, any, never> | (() => string);

    constructor(data: number[], epsilon: number) {
        this.data = data;
        this.epsilon = epsilon;
        this.clusters = new Map();

        this.ordered_data = this.data
            .map((d, i) => {
                return {
                    id: i,
                    value: d,
                };
            })
            .sort((a, b) => a.value - b.value);

        let cluster_id = 0;
        const N = this.data.length;

        let cluster_set: Set<number> = new Set();
        cluster_set.add(this.ordered_data[0].id);
        for (let i = 1; i < N; ++i) {
            if (this.ordered_data[i].value - this.ordered_data[i - 1].value < epsilon) {
                cluster_set.add(this.ordered_data[i].id);
            } else {
                this.clusters.set(cluster_id, cluster_set);
                cluster_id++;
                cluster_set = new Set();
                cluster_set.add(this.ordered_data[i].id);
            }
        }
        this.clusters.set(cluster_id, cluster_set);
        this.color_scale = get_color_scale(cluster_id);
    }

    clone() {
        const cloned_clustering = new OneDEpsilonClustering(this.data, this.epsilon);
        //cloned_clustering.data = this.data;
        //cloned_clustering.epsilon = this.epsilon;
        cloned_clustering.clusters = new Map();
        for (const [id, points] of this.clusters) {
            cloned_clustering.clusters.set(id, new Set(points));
        }
        cloned_clustering.ordered_data = this.ordered_data;
        return cloned_clustering;
    }

    cluster_id_by_point_id(id: number): number {
        for (const [cluster_id, set] of this.clusters) {
            if (set.has(id)) {
                return cluster_id;
            }
        }
        throw new Error("could not find id.");
    }

    cluster_list(): number[] {
        const N = this.data.length;
        const result: number[] = new Array(N).fill(0);
        for (const [cluster_id, set] of this.clusters) {
            for (const id of set) {
                result[id] = cluster_id;
            }
        }
        return result;
    }

    merge_clusters(id1: number, id2: number) {
        if (!this.clusters.has(id1)) throw new Error("could not find id1");
        if (!this.clusters.has(id2)) throw new Error("could not find id2");

        const set1 = this.clusters.get(id1);
        const set2 = this.clusters.get(id2);

        if (set1 === undefined || set2 === undefined) throw new Error("should not happen!");

        this.clusters.delete(id1);
        this.clusters.delete(id2);
        this.clusters.set(id1, set1.union(set2));
        return this;
    }
}

export class MDEpsilonClustering {
    data: number[][];
    ebg: Graph;
    epsilon: number;
    clusters: Map<number, Set<number>>;
    color_scale: ScaleOrdinal<string, any, never> | (() => string);

    constructor(data: number[][], epsilon: number) {
        this.data = data;
        this.epsilon = epsilon;
        this.clusters = new Map();
        this.ebg = EBG(this.data, { epsilon, metric: euclidean });

        const { clusters } = this.#count_components(this.ebg);
        let cluster_id = 0;

        for (const cluster of clusters) {
            this.clusters.set(cluster_id++, new Set(cluster));
        }

        this.color_scale = get_color_scale(this.clusters.size);
    }

    clone() {
        const cloned_clustering = new MDEpsilonClustering([], this.epsilon);
        cloned_clustering.ebg = this.ebg;
        cloned_clustering.clusters = this.clusters;
        cloned_clustering.color_scale = this.color_scale;
        return cloned_clustering;
    }

    #count_components(graph: Graph) {
        const N = graph.length;
        const visited: Set<number> = new Set();
        let components = 0;
        let clusters = [];
        for (let i = 0; i < N; ++i) {
            if (visited.has(i)) {
                continue;
            }
            components++;
            let cluster: number[] = [];
            this.#depth_first_search(graph, i, visited, cluster);
            clusters.push(cluster);
        }
        return { components, clusters };
    }

    #depth_first_search(graph: Graph, i: number, visited: Set<number>, cluster: number[]) {
        visited.add(i);
        cluster.push(i);
        for (const j of graph.edge(i)) {
            if (!visited.has(j)) {
                this.#depth_first_search(graph, j, visited, cluster);
            }
        }
    }

    cluster_id_by_point_id(id: number): number {
        for (const [cluster_id, set] of this.clusters) {
            if (set.has(id)) {
                return cluster_id;
            }
        }
        throw new Error("could not find id.");
    }

    cluster_list(): number[] {
        const N = this.data.length;
        const result: number[] = new Array(N).fill(-1);
        for (const [cluster_id, set] of this.clusters.entries()) {
            for (const id of set) {
                result[id] = cluster_id;
            }
        }
        return result;
    }

    merge_clusters(id1: number, id2: number) {
        if (!this.clusters.has(id1)) throw new Error("could not find id1");
        if (!this.clusters.has(id2)) throw new Error("could not find id2");

        const set1 = this.clusters.get(id1);
        const set2 = this.clusters.get(id2);

        if (set1 === undefined || set2 === undefined) throw new Error("should not happen!");

        this.clusters.delete(id1);
        this.clusters.delete(id2);
        this.clusters.set(id1, set1.union(set2));
        return this;
    }
}
