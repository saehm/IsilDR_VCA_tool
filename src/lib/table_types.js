/**
 * @type {{
 *     name: 1 | 2 | 3 | 4 | 5 | 6;
 *     latex: string;
 *     checked: { between: boolean; within: boolean };
 *     f: (dY: number, dX: number, e: number) => boolean;
 *     info: { pca: { between: string; within: string }; hildr: { between: string; within: string } };
 * }[]}
 */
export const table_types = [
    {
        name: 1,
        latex: "\\varepsilon \\leq \\delta^\\mathbf{Y}_{i,j} \\leq \\delta^\\mathbf{X}_{i,j}",
        checked: { between: false, within: false },
        f: (dY, dX, e) => e <= dY && dY <= dX,
        info: {
            pca: { between: "true_separation", within: "ok" },
            hildr: { between: "ok", within: "dY==dX" },
        },
    },
    {
        name: 2,
        latex: "\\varepsilon \\leq \\delta^\\mathbf{X}_{i,j} \\leq \\delta^\\mathbf{Y}_{i,j}",
        checked: { between: false, within: false },
        f: (dY, dX, e) => e < dX && dX < dY,
        info: {
            pca: { between: "dY==dX", within: "dY==dX" },
            hildr: { between: "true separation", within: "ok" },
        },
    },
    {
        name: 3,
        latex: "\\delta^\\mathbf{X}_{i,j} \\leq \\varepsilon \\leq \\delta^\\mathbf{Y}_{i,j}",
        checked: { between: false, within: false },
        f: (dY, dX, e) => dX <= e && e <= dY,
        info: {
            pca: { between: "dY==dX", within: "dY==dX" },
            hildr: { between: "false separation", within: "ok" },
        },
    },
    {
        name: 4,
        latex: "\\delta^\\mathbf{Y}_{i,j} \\leq \\varepsilon \\leq \\delta^\\mathbf{X}_{i,j}",
        checked: { between: false, within: false },
        f: (dY, dX, e) => dY <= e && e <= dX,
        info: {
            pca: { between: "impossible", within: "possible false overlap" },
            hildr: { between: "impossible", within: "dY==dX" },
        },
    },
    {
        name: 5,
        latex: "\\delta^\\mathbf{Y}_{i,j} \\leq \\delta^\\mathbf{X}_{i,j} \\leq \\varepsilon",
        checked: { between: false, within: false },
        f: (dY, dX, e) => dY <= dX && dX <= e,
        info: {
            pca: { between: "impossible", within: "true overlap" },
            hildr: { between: "impossible", within: "dY==dX" },
        },
    },
    {
        name: 6,
        latex: "\\delta^\\mathbf{X}_{i,j} \\leq \\delta^\\mathbf{Y}_{i,j} \\leq \\varepsilon",
        checked: { between: false, within: false },
        f: (dY, dX, e) => dX <= dY && dY <= e,
        info: {
            pca: { between: "impossible", within: "dY==dX" },
            hildr: { between: "impossible", within: "true overlap" },
        },
    },
];

/**
 * @param {import("@saehrimnir/druidjs").Matrix} hd_D
 * @param {import("@saehrimnir/druidjs").Matrix} ld_D
 * @param {import("./Clusters.js").Clusters} clusters
 * @param {number} epsilon
 */
export function get_link_types(hd_D, ld_D, clusters, epsilon) {
    /** @type {Record<1 | 2 | 3 | 4 | 5 | 6, { within: number[][]; between: number[][] }>} */
    //@ts-ignore
    const res = Object.fromEntries(
        table_types.map((d) => [
            /** @type {1 | 2 | 3 | 4 | 5 | 6} */ d.name,
            /** @type {{ between: number[][]; within: number[][] }} */ ({ between: [], within: [] }),
        ]),
    );
    const N = hd_D.shape[0];
    for (const type of table_types) {
        for (let i = 0; i < N; ++i) {
            const c_i = clusters.find_cluster_by_index(i);
            for (let j = i + 1; j < N; ++j) {
                const c_j = clusters.find_cluster_by_index(j);
                const dY = ld_D.entry(i, j);
                const dX = hd_D.entry(i, j);
                if (type.f(dY, dX, epsilon)) {
                    res[type.name][c_i.label == c_j.label ? "within" : "between"].push([i, j]);
                }
            }
        }
    }
    return res;
}

/**
 * @param {import("@saehrimnir/druidjs").Matrix} hd_D
 * @param {import("@saehrimnir/druidjs").Matrix} ld_D
 * @param {import("./Clusters.js").Clusters} ld_clusters
 * @param {number[][]} mst
 * @param {number} epsilon
 */
export function get_link_types_on_MST(hd_D, ld_D, ld_clusters, mst, epsilon) {
    /** @type {Record<1 | 2 | 3 | 4 | 5 | 6, { within: number[][]; between: number[][] }>} */
    //@ts-ignore
    const res = Object.fromEntries(
        table_types.map((d) => [
            /** @type {1 | 2 | 3 | 4 | 5 | 6} */ d.name,
            /** @type {{ between: number[][]; within: number[][] }} */ ({ between: [], within: [] }),
        ]),
    );

    for (const [i, j] of mst) {
        const cY_i = ld_clusters.find_cluster_by_index(i);
        const cY_j = ld_clusters.find_cluster_by_index(j);
        const dY = ld_D.entry(i, j);
        const dX = hd_D.entry(i, j);
        for (const type of table_types) {
            if (type.f(dY, dX, epsilon)) {
                res[type.name][cY_i.label == cY_j.label ? "within" : "between"].push([i, j]);
            }
        }
    }

    return res;
}
