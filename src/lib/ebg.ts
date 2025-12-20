//ts-check

/** Possible format for rows of input data. */
type DataRow = number[] | (object & { [key: string]: number });

/** Default accessor function. */
function default_accessor<T extends DataRow>(d: T): number[] {
    if (Array.isArray(d)) {
        return d;
    } else if (typeof d === "object") {
        return Object.values(d);
    } else {
        throw new Error("Input has the wrong format!");
    }
}
/**
 * Calculates the Euclidean distance between two points in a 2D plane.
 *
 * @param {number[]} a - The coordinates of the first point.
 * @param {number[]} b - The coordinates of the second point.
 * @returns {number} The Euclidean distance between the two points.
 */
function euclidean_2d(a: number[], b: number[]): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export class Graph {
    private graph: Set<number>[];

    public constructor(parameters: { size: number }) {
        this.graph = Array.from({ length: parameters.size }, () => new Set<number>());
    }

    public addEdge(i: number, j: number) {
        this.graph[i].add(j);
    }

    public edge(i: number): Set<number> {
        return this.graph[i];
    }

    public edges(): Set<number>[] {
        return this.graph;
    }

    public get length() {
        return this.graph.length;
    }

    /**
     * Makes all edges of the graph symmetrical.
     *
     * @returns {Graph}
     */
    public to_symmetrical(): Graph {
        const g = new Graph({ size: this.graph.length });
        for (let i = 0; i < this.graph.length; i++) {
            for (const j of this.graph[i]) {
                g.addEdge(j, i);
                g.addEdge(i, j);
            }
        }
        return g;
    }

    /**
     * Makes all edges of the graph mutual.
     *
     * @returns {Graph}
     */
    public to_mutual(): Graph {
        const g = new Graph({ size: this.graph.length });
        for (let i = 0; i < this.graph.length; i++) {
            for (const j of this.graph[i]) {
                if (this.edge(j).has(i)) {
                    g.addEdge(j, i);
                    g.addEdge(i, j);
                }
            }
        }
        return g;
    }
}

/** The parameters for generating the EBG. */
export interface EBGParameters<T> {
    /** The accessor function for the x-coordinate. */
    accessors?: ((d: T) => number)[];
    /** The metric to use. */
    metric?: "precomputed" | ((a: number[], b: number[]) => number);
    /** The radius of the ε-ball. */
    epsilon?: number;
}

/**
 * Generates a ε-ball neighbor graph (EBG) based on the input data and parameters.
 *
 * @param data - The input data array.
 * @param parameters - The parameters for generating the EBG.
 * @returns {Graph} The generated ε-ball neighbor graph.
 */
export function EBG<T extends DataRow>(
    data: T[],
    { accessors, metric = euclidean_2d, epsilon }: EBGParameters<T> = {},
): Graph {
    const N = data.length;
    if (N === 0) throw new Error("empty data");

    if (epsilon === undefined || epsilon === null) throw new Error("no epsilon given!");
    if (epsilon <= 0) throw new Error("epsilon need to be bigger than 0!");

    const X = data.map((row) => {
        let converted_row: number[];
        if (accessors === undefined) {
            converted_row = default_accessor(row);
        } else {
            converted_row = accessors.map((accessor) => accessor(row));
        }
        if (converted_row.some((cell) => typeof cell !== "number")) {
            throw new Error("Input needs to be numerical!");
        }
        return converted_row;
    });

    const G = new Graph({ size: N });

    for (let i = 0; i < N; ++i) {
        const X_i = X[i];
        for (let j = i + 1; j < N; ++j) {
            //const X_j = X[j];
            let dist;
            if (metric === "precomputed") {
                dist = /** @type {number} */ X_i[j];
            } else {
                dist = metric(X_i, X[j]);
            }
            if (dist <= epsilon) {
                G.addEdge(i, j);
                G.addEdge(j, i);
            }
        }
    }

    return G;
}
