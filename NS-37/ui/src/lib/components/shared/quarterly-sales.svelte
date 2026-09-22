<script>
    // import * as Chart from "@/components/ui/chart/index";
    import { scaleBand } from "d3-scale";
    import { BarChart } from "layerchart";
    import { cubicInOut } from "svelte/easing";
    import * as Card from "@/components/ui/card/index";
    import * as Chart from "@/components/ui/card/index";

     let SALES_DATA = [
        { "name": "Angus Overton", "target": 1085000, "value": 772040, "targetPct": 100, "valuePct": 71 },
        { "name": "Bradford Overton", "target": 2090000, "value": 2001600, "targetPct": 100, "valuePct": 95 },
        { "name": "Chris Power", "target": 2900000, "value": 2572910, "targetPct": 100, "valuePct": 88 },
        { "name": "Danny Lawrence", "target": 6500000, "value": 6900000, "targetPct": 100, "valuePct": 106 },
        { "name": "Gareth Lacey", "target": 2530000, "value": 2219000, "targetPct": 100, "valuePct": 87 },
        { "name": "Gavin Little", "target": 2120000, "value": 1790340, "targetPct": 100, "valuePct": 84 },
        { "name": "Jacob Worthington", "target": 2500000, "value": 2160000, "targetPct": 100, "valuePct": 86 },
        { "name": "Lars Anderson", "target": 5050000, "value": 4950000, "targetPct": 100, "valuePct": 98 },
        { "name": "Michael Kelly", "target": 3390000, "value": 3300000, "targetPct": 100, "valuePct": 97 },
        { "name": "Michael Rice", "target": 3080000, "value": 3000000, "targetPct": 100, "valuePct": 97 },
        { "name": "Michelle Gounder", "target": 1205000, "value": 1245000, "targetPct": 100, "valuePct": 103 },
        { "name": "Olivia Byrne", "target": 1525000, "value": 1525000, "targetPct": 100, "valuePct": 100 },
        { "name": "Ricardo Morren", "target": 2625000, "value": 2210300, "targetPct": 100, "valuePct": 84 },
        { "name": "Rohan Anderson", "target": 790000, "value": 450000, "targetPct": 100, "valuePct": 56 },
        {
            "name": "Roxley Little",
            "target": 2020000,
            "value": 1120300,
            "targetPct": 100,
            "valuePct": 55
        },
        {
            "name": "Sam Little",
            "target": 6550000,
            "value": 5950000,
            "targetPct": 100,
            "valuePct": 90
        },
        {
            "name": "Selwyn Cox",
            "target": 750000,
            "value": 740000,
            "targetPct": 100,
            "valuePct": 98
        },
        {
            "name": "Stephen Wallace",
            "target": 3935000,
            "value": 3423000,
            "targetPct": 100,
            "valuePct": 86
        },
        {
            "name": "Tom Aoido",
            "target": 2580000,
            "value": 2500000,
            "targetPct": 100,
            "valuePct": 96
        },
        {
            "name": "Trevor Martin",
            "target": 4120000,
            "value": 4000000,
            "targetPct": 100,
            "valuePct": 97
        },
        {
            "name": "Tristan Anderson",
            "target": 750000,
            "value": 700000,
            "targetPct": 100,
            "valuePct": 93
        },
        {
            "name": "Wyatt Gage",
            "target": 5250000,
            "value": 5000000,
            "targetPct": 100,
            "valuePct": 95
        }
    ];

    const chartConfig = {
        value: { color: "var(--primary)" },
        target: { color: "var(--muted)" },
        label: { color: "var(--background)" }
    };

    const selected = '';
</script>

<div class="quarterly-sales">
    <Card.Root>
        <Card.Header>
            <Card.Title>2026 Sales Revenues vs Targets</Card.Title>
            <Card.Description>This chart shows the individual sales revenue vs targets for each salesperson.</Card.Description>
        </Card.Header>
        <Card.Content>
            <Chart.Container config={chartConfig}>
                <BarChart
                    labels={{ offset: 12 }}
                    data={SALES_DATA}
                    orientation="horizontal"
                    yScale={scaleBand().padding(0.25)}
                    x="target"
                    y="name"
                    axis="y"
                    rule={false}
                    series={[ {key:"value", label:"Revenue", color:chartConfig.value.color} ]}
                    padding={{ right: 16 }}
                    props={{
                        bars: {
                            stroke: "none",
                            radius: 5,
                            rounded: "all",
                            motion: { type: "tween", duration: 500, easing: cubicInOut },
                        },
                        highlight: { area: { fill: "none" }},
                        yAxis: {
                            tickLabelProps: {
                                textAnchor: "start",
                                dx: 6,
                                class: "stroke-none fill-background!",
                            },
                            tickLength: 0,
                        },
                    }}
                >
                    {#snippet tooltip()}
                        <Chart.Tooltip hideLabel />
                    {/snippet}
                </BarChart>
            </Chart.Container>
        </Card.Content>
        <Card.Footer>
            <div class="flex w-full items-start gap-2 text-sm">
                <div class="grid gap-2">
                    <div class="flex items-center gap-2 leading-none font-medium">
                        Trending up by 5.2% this month
                    </div>
                    <div class="flex items-center gap-2 leading-none text-muted-foreground">
                        Showing total revenues for each sales person for the current year
                    </div>
                </div>
            </div>
        </Card.Footer>
    </Card.Root>
</div>

<style>
    .quarterly-sales {}
</style>