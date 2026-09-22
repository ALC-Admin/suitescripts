<script>
    import * as Card from "@/components/ui/card/index";

    let { data } = $props();
</script>

<Card.Root class="w-full max-w-sm kpi">
    <Card.Header>
        <Card.Title>{data.title}</Card.Title>
        {#if data.desc}
            <Card.Description>{data.desc}</Card.Description>
        {/if}
    </Card.Header>
    <Card.Content class="kpi-content">
        <span class="value">{data.value}</span>
        {#if data.aside}
            <span class="aside">{data.aside}</span>
        {/if}
    </Card.Content>
</Card.Root>

<style>
    /* .kpi {
        border: 1px solid red;
    } */
    :global(.kpi-content) {
        /* border: 1px solid red; */
        display: flex;
        align-items: first baseline;
        justify-content: space-between;
    }
    .value {
        /* display: block; */
        font-size: 2.5rem;
        font-weight: 600;
        color: var(--color-primary);
        /* text-align: ; */
    }
    .aside {
        font-size: 1.125rem;
        font-weight: 600;
        opacity: 0.6;
    }
</style>