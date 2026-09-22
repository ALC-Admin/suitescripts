<script>
    import KPI from "./kpi.svelte";

    const METRICS = [
        {
            title: "Revenue vs Target",
            desc: "Total revenue compared to the quota",
            value: "$2.4M",
            aside: "/$2.6M"
        },
        {
            title: "% of Target",
            desc: "Revenue vs Target expressed as percentage",
            value: "92%"
        },
        {
            title: "QoQ Growth",
            desc: "Percentage revenue change from previous quarter",
            value: "+8.1%"
        },
        {
            title: "Reps at Quota",
            desc: "Count of salespeople with sales >= 100% of target",
            value: "11/18"
        },
    ];
</script>

<div id="section-kpi">
    {#each METRICS as metric}
        <KPI data={metric} />
    {/each}
</div>

<style>
    #section-kpi {
        /* border: 1px solid red; */
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2rem;
    }
</style>