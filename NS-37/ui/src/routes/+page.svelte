<script>
    import SectionKpi from "@/components/shared/section-kpi.svelte";
    // import QuarterlySales from "@/components/shared/quarterly-sales.svelte";
    import SampleChart from "@/components/shared/sample-chart.svelte";
</script>

<main>
    <SectionKpi />
    <!-- <QuarterlySales /> -->
    <SampleChart />
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        gap: 2em;
    }
</style>