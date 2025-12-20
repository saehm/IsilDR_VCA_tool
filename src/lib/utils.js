import { extent, scaleLinear, ascending, difference, greatest } from "d3";
import { Matrix, distance_matrix, euclidean } from "@saehrimnir/druidjs";
/**
 * Returns a new array with only the unique elements from the input array.
 *
 * @param {any[]} arr - The input array.
 * @returns {any[]} A new array with only the unique elements.
 */
export function unique(arr) {
    return Array.from(new Set(arr));
}

/**
 * @param {[[number, number], [number, number]]} domain - Domain for the scales.
 * @param {[[number, number], [number, number]]} range - Range of the scales.
 * @returns {{ x: (d: number) => number; y: (d: number) => number }}
 */
export function get_scales(domain, range) {
    return {
        x: scaleLinear().domain(domain[0]).range(range[0]),
        y: scaleLinear().domain(domain[1]).range(range[1]),
    };
}

/**
 * @param {number[][]} data
 * @param {{ keep_aspect_ratio?: boolean }} param1
 * @returns {[[number, number], [number, number]]}
 */
export function get_domains(data, { keep_aspect_ratio = true }) {
    let [x_min, x_max] = extent(data, (d) => d[0]);
    let [y_min, y_max] = extent(data, (d) => d[1]);

    if (
        x_max == undefined ||
        y_max == undefined ||
        x_min == undefined ||
        y_min == undefined ||
        isNaN(x_max) ||
        isNaN(y_max) ||
        isNaN(x_min) ||
        isNaN(y_min)
    ) {
        throw "no extents found";
    }

    if (keep_aspect_ratio) {
        let x_span = x_max - x_min;
        let y_span = y_max - y_min;

        const delta = Math.abs(x_span - y_span) / 2;
        if (x_span > y_span) {
            y_min -= delta;
            y_max += delta;
        } else {
            x_min -= delta;
            x_max += delta;
        }
    }
    return [
        [x_min, x_max],
        [y_min, y_max],
    ];
}

/**
 * Calculates the number of false missing neighbors and missing neighbors based on a given distance matrix.
 *
 * @param {Matrix} hd - The distance matrix representing the high-dimensional space.
 * @param {Matrix} ld - The distance matrix representing the low-dimensional space.
 * @param {number} epsilon - The threshold value for considering a neighbor missing.
 * @param {number} delta - The threshold value for considering a neighbor false.
 * @returns {{ fn: number; mn: number }} An object containing the number of false missing neighbors (fn) and missing
 *   neighbors (mn).
 */
export function fmn(hd, ld, epsilon, delta) {
    const N = hd.shape[0];
    let fn = 0;
    let mn = 0;

    for (let i = 0; i < N; ++i) {
        const hd_i = hd.row(i);
        const ld_i = ld.row(i);
        for (let j = i + 1; j < N; ++j) {
            const hd_ij = hd_i[j];
            const ld_ij = ld_i[j];
            if (hd_ij < epsilon && ld_ij > delta) {
                mn++;
            }
            if (hd_ij > epsilon && ld_ij < delta) {
                fn++;
            }
        }
    }

    return { fn, mn };
}

/** @type {(a: number[], b: number[]) => number} */
const comp = (a, b) => ascending(a[0], b[0]);

/**
 * Calculates the number of false missing neighbors and missing neighbors based on a given distance matrix.
 *
 * @param {Matrix} hd - The distance matrix representing the high-dimensional space.
 * @param {Matrix} ld - The distance matrix representing the low-dimensional space.
 * @param {number} k - The number of neighbors to consider.
 * @param {any[]} labels - The labels of the datapoints.
 * @returns {{ fn: number; mn: number; fn_by_label: Map<any, number>; mn_by_label: Map<any, number> }}
 */
export function rfmn(hd, ld, k, labels) {
    const { count: fn, by_label: fn_by_label } = count_rankwise_distortion(ld, hd, k, labels);
    const { count: mn, by_label: mn_by_label } = count_rankwise_distortion(hd, ld, k, labels);

    return { fn, mn, fn_by_label, mn_by_label };
}

/**
 * @param {Matrix} source
 * @param {Matrix} target
 * @param {number} k
 * @param {any[]} labels
 * @returns {{ count: number; by_label: Map<any, number> }}
 */
function count_rankwise_distortion(source, target, k, labels) {
    const N = source.shape[0];
    let count = 0;

    const by_label_map = new Map();
    for (const label of labels) {
        if (!by_label_map.has(label)) {
            by_label_map.set(label, 0);
        }
    }

    for (let i = 0; i < N; ++i) {
        const source_row = Array.from(source.row(i));
        const source_area = source_row
            .map((d, j) => [d, j])
            .filter(([d, j]) => i != j)
            .sort(comp)
            .slice(0, k);
        const source_indices = source_area.map(([_, j]) => j);
        const source_set = new Set(source_indices);
        const target_row = Array.from(target.row(i));
        const target_distances = source_indices.map((j) => target_row[j]);
        const target_area_size = greatest(target_distances);
        const target_area = target_row.map((d, j) => [d, j]).filter(([d]) => d <= target_area_size);
        const target_indices = target_area.map(([d, j]) => j);
        const target_set = new Set(target_indices);

        const distortions = difference(target_set, source_set).size;
        count += distortions;
        by_label_map.set(labels[i], by_label_map.get(labels[i]) + distortions);
    }
    return { count, by_label: by_label_map };
}

/**
 * @param {Matrix} A
 * @returns {Matrix}
 */
export function normalized_distance_matrix(A) {
    /** @type {Matrix} */
    const D = distance_matrix(A);

    const [min, max] = extent(D.values.filter((/** @type {number} */ d) => d != 0));
    if (!min || !max) throw "no min or max found";

    // @ts-ignore
    const span = max - min;
    for (let i = 0; i < D.values.length; ++i) {
        // @ts-ignore
        D.values[i] = (D.values[i] - min) / span;
    }
    return D;
}

/**
 * Computes the minimum spanning tree with Kruskal algorithm, using a given metric.
 *
 * @param {Matrix} X
 * @param {function} metric
 * @see {@link https://en.wikipedia.org/wiki/Kruskal%27s_algorithm}
 */
export function MST(X, metric = euclidean) {
    const N = X.shape[0];
    const D = distance_matrix(X, metric);
    const X_array = Array.from({ length: N }, (_, i) => i);
    let disjoint_set = new DisjointSet(X_array, "rank");
    /** @type {number[][]} */
    const edges = [];
    for (let i = 0; i < N; ++i) {
        for (let j = i + 1; j < N; ++j) {
            edges.push([i, j, D.entry(i, j)]);
        }
    }
    edges.sort((a, b) => a[2] - b[2]);
    /** @type {number[][]} */
    const mst_tree = [];
    for (const edge of edges) {
        const [u, v] = edge;
        const set_u = disjoint_set.find(u);
        const set_v = disjoint_set.find(v);
        if (set_u !== set_v) {
            mst_tree.push(edge);
            disjoint_set.union(set_u, set_v);
            if (mst_tree.length == N - 1) break; // a MST has N-1 edges
        }
    }
    return mst_tree.sort((a, b) => a[2] - b[2]);
}

/**
 * Computes the minimum spanning tree with Kruskal algorithm, using a given metric.
 *
 * @param {number[][]} X
 * @param {function} metric
 * @see {@link https://en.wikipedia.org/wiki/Kruskal%27s_algorithm}
 */
export function* MST_gen(X, metric = euclidean) {
    const N = X.length;
    const X_array = Array.from({ length: N }, (_, i) => i);
    let disjoint_set = new DisjointSet(X_array, "rank");

    /** @type {number[][]} */
    const edges = [];
    for (let i = 0; i < N; ++i) {
        for (let j = i + 1; j < N; ++j) {
            edges.push([i, j, metric(X[i], X[j])]);
        }
    }
    // sort by distances
    edges.sort((a, b) => a[2] - b[2]);

    /** @type {number[][]} */
    const mst_tree = [];
    for (const edge of edges) {
        const [u, v] = edge;
        const set_u = disjoint_set.find(u);
        const set_v = disjoint_set.find(v);

        if (set_u !== set_v) {
            mst_tree.push(edge);
            yield mst_tree;
            disjoint_set.union(set_u, set_v);
        }
    }
    return mst_tree;
}

/**
 * Computes the minimum spanning tree with Kruskal algorithm, using a given metric.
 *
 * @param {number[][]} X
 * @param {function} metric
 * @see {@link https://en.wikipedia.org/wiki/Kruskal%27s_algorithm}
 */
export function* MST_reverse_delete_gen(X, metric = euclidean) {
    const N = X.length;
    const X_array = Array.from({ length: N }, (_, i) => i);

    /** @type {number[][]} */
    let edges = [];
    for (let i = 0; i < N; ++i) {
        for (let j = i + 1; j < N; ++j) {
            edges.push([i, j, metric(X[i], X[j])]);
        }
    }
    // sort by decreasing distances
    edges.sort((a, b) => b[2] - a[2]);

    let i = 0;
    let steps = 0;
    while (i < edges.length && steps++ < 20_000) {
        console.log(steps);
        let edge = edges[i];
        if (!is_connected(edges.filter((_, index) => index != i))) {
            edges.splice(i, 0, edge);
            ++i;
        } else {
            edges.splice(i, 1);
        }
        yield edges;
    }
    return edges;
}

/**
 * Computes the minimum spanning tree with Kruskal algorithm, using a given metric.
 *
 * @param {number[][]} X
 * @param {function} metric
 * @see {@link https://en.wikipedia.org/wiki/Kruskal%27s_algorithm}
 */
export function* MST_prims_gen(X, metric = euclidean) {
    const N = X.length;

    /**
     * @param {number} i
     * @param {number} j
     * @returns {number}
     */
    const matrix_value = (i, j) => euclidean(X[i], X[j]);
    const D = new Matrix(N, N, matrix_value);
    const parent = new Array(N).fill(null);
    const key = new Array(N).fill(Infinity);
    const mstSet = new Array(N).fill(false);

    key[0] = 0;
    parent[0] = -1;

    for (let count = 0; count < N - 1; ++count) {
        const u = minKey(key, N, mstSet);
        mstSet[u] = true;
        for (let v = 0; v < N; ++v) {
            const D_uv = D.entry(u, v);
            if (!mstSet[v] && D_uv && D_uv < key[v]) {
                parent[v] = u;
                key[v] = D_uv;
            }
        }
    }

    const tree = [];
    for (let i = 1; i < N; ++i) {
        const j = parent[i];
        tree.push([i, j, key[i]]);
        yield tree;
    }
    yield tree;
    return tree;
}

/**
 * @param {number[]} key
 * @param {number} N
 * @param {boolean[]} mstSet
 * @returns
 */
function minKey(key, N, mstSet) {
    // Initialize min value
    let min = Infinity;
    let min_index = -1;

    for (let v = 0; v < N; v++)
        if (!mstSet[v] && key[v] < min) {
            min = key[v];
            min_index = v;
        }

    return min_index;
}

/**
 * @param {number[][]} edges
 * @returns
 */
function is_connected(edges) {
    const N = edges.length;
    const visited = new Set();
    let components = 0;
    for (let i = 0; i < N; ++i) {
        if (visited.has(i)) {
            continue;
        }
        components++;
        if (components > 1) return false;
        traverse(edges, i, visited);
    }
    return true;
}

/**
 * @param {number[][]} edges
 * @param {number} i
 * @param {Set<number>} visited
 */
function traverse(edges, i, visited) {
    visited.add(i);
    for (const [_, target] of edges.filter((d) => d[0] == i)) {
        if (!visited.has(target))
            traverse(
                edges.filter((d) => d[0] == target),
                target,
                visited,
            );
    }
}

/**
 * @template ElementType
 * @typedef DisjointSetElement<ElementType>
 * @property {ElementType} parent
 * @property {Set<ElementType>} children
 * @property {number} size
 * @property {number} rank
 */

/**
 * @template ElementType
 * @class
 * @group Data Structure
 * @see {@link https://en.wikipedia.org/wiki/Disjoint-set_data_structure}
 */
export class DisjointSet {
    /**
     * Creates a disjoint set.
     *
     * @param {ElementType[]?} elements Input to the DisjointSet.
     * @param {"size" | "rank"} [union_by="size"] Union sets by size or by rank. Default is `"size"`
     */
    constructor(elements = null, union_by = "size") {
        /** @type {Map<ElementType, DisjointSetElement<ElementType>>} */
        this._list = new Map();
        this.union_by = union_by;
        if (elements) {
            for (const e of elements) {
                this.make_set(e);
            }
        }
        return this;
    }

    /**
     * @param {ElementType} x
     * @returns {DisjointSet<ElementType>}
     */
    make_set(x) {
        const list = this._list;
        if (!list.has(x)) {
            const element = {
                parent: x,
                children: new Set([x]),
                size: 1,
                rank: 0,
            };
            list.set(x, element);
        }
        return this;
    }

    /**
     * @param {ElementType} x
     * @returns {ElementType}
     */
    find(x) {
        const list = this._list;
        if (list.has(x)) {
            const x_element = list.get(x);
            if (!x_element) throw new Error("should not happen!");
            if (x_element.parent !== x) {
                const parent = this.find(x_element.parent);
                const parent_element = list.get(x_element.parent);
                parent_element?.children.add(x);
                x_element.parent = parent;
                return parent;
            } else {
                return x;
            }
        } else {
            throw new Error("Could not find x");
        }
    }

    /**
     * @param {ElementType} x
     * @returns {Set<ElementType>}
     */
    children_of(x) {
        if (!this._list.has(x)) throw new Error("couldnt find!");
        const element = this._list.get(x);
        if (!element) throw new Error("should not happen!");
        return element.children;
    }

    /**
     * @param {ElementType} x
     * @param {ElementType} y
     * @returns {DisjointSet<ElementType>}
     */
    union(x, y) {
        const union_by = this.union_by;

        // Replace nodes by roots
        let node_x = this.find(x);
        let node_y = this.find(y);

        // if x and y are already in the same set
        if (node_x === node_y) return this;

        let x_element = this._list.get(node_x);
        if (!x_element) throw new Error("should not happen!");
        let y_element = this._list.get(node_y);
        if (!y_element) throw new Error("should not happen!");

        // if necessary, swap to ensure that x_element is the bigger set
        if (x_element[union_by] < y_element[union_by]) {
            [node_x, node_y] = [node_y, node_x];
            [x_element, y_element] = [y_element, x_element];
        }

        // make x the new parent of y
        y_element.parent = node_x;

        // update the size of x and y
        for (const y_child of y_element.children) {
            x_element.children.add(y_child);
        }
        if (union_by == "size") {
            x_element.size += y_element.size;
        } else if (union_by == "rank") {
            if (x_element.rank === y_element.rank) {
                x_element.rank++;
            }
        }
        return this;
    }
}
