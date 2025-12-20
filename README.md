# IsilDR: Isometric-Seriation-Based Dimensionality Reduction

This tool allows for a visual cluster analysis using various dimensionality reduction methods and IsilDR ([https://github.com/saehm/IsilDR]). This tool is used for the paper "IsilDR – Isometric‑Seriation‑Based Dimensionality Reduction for Visual Cluster Analysis".

While all dimensionality techniques produce distortions, false- and missing neighbors --- Points which are neighbors in the input data but not in the projection or vice versa. Until now, only orthogonal linear projection techniques like PCA are producing exclusivly false neighbors, while other techniques like t-SNE or UMAP produce both types of distortions. With IsilDR we have now a new class of dimensionality reduction techniques which only produce missing neighbors.
