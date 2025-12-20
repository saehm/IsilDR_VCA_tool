<script lang="ts">
    import { resolve } from "$app/paths";
    import "./layout.css";
    import "inter-ui";
    import "katex/dist/katex.min.css";

    import favicon from "$lib/assets/favicon.svg";

    import IsilDRIcon from "$lib/components/IsilDRIcon.svelte";

    import { Palette } from "lucide-svelte";

    import { onMount } from "svelte";
    import { themeChange } from "theme-change";

    onMount(() => {
        themeChange(false);
    });

    const themes = [
        "light",
        "dark",
        "cupcake",
        "bumblebee",
        "emerald",
        "corporate",
        "synthwave",
        "retro",
        "cyberpunk",
        "valentine",
        "halloween",
        "garden",
        "forest",
        "aqua",
        "lofi",
        "pastel",
        "fantasy",
        "wireframe",
        "black",
        "luxury",
        "dracula",
        "cmyk",
        "autumn",
        "business",
        "acid",
        "lemonade",
        "night",
        "coffee",
        "winter",
        "dim",
        "nord",
        "sunset",
    ];

    let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<main>
    <nav class="navbar bg-base-300 w-full mb-4 shadow-md">
        <div class="navbar-start">
            <a href={resolve("/")} tabindex="0" class="btn btn-ghost text-2xl font-black">
                <IsilDRIcon />
                IsilDR
            </a>
        </div>
        <div class="navbar-end">
            <a class="btn btn-ghost" href={resolve("/aggregated")}>Aggregated</a>
            <a class="btn btn-ghost" href={resolve("/2d")}>2D</a>
            <div class="dropdown dropdown-end">
                <div tabindex="0" role="button" class="btn btn-ghost"><Palette />Theme</div>
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <div
                    tabindex="0"
                    class="dropdown-content bg-base-200 text-base-content rounded-box w-56 h-112 overflow-y-auto border shadow-2xl p-3"
                >
                    <div class="grid grid-cols-1 gap-2">
                        {#each themes as theme, i (i)}
                            <button
                                class="btn bg-base-200"
                                data-set-theme={theme}
                                data-act-class="active"
                                data-theme={theme}
                            >
                                {theme[0].toUpperCase() + theme.slice(1)}
                                <span class="w-2 h-3/5 rounded-lg bg-primary"></span>
                                <span class="w-2 h-3/5 rounded-lg bg-secondary"></span>
                                <span class="w-2 h-3/5 rounded-lg bg-accent"></span>
                                <span class="w-2 h-3/5 rounded-lg bg-neutral"></span>
                            </button>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </nav>

    {@render children()}
</main>
