<script>
    import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
    import { scaleBand } from "d3-scale";
    import { BarChart, defaultChartPadding } from "layerchart";
    import { cubicInOut } from "svelte/easing";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Chart from "$lib/components/ui/chart/index.js";

    let chartData = [
        {
            "name": "Angus Overton",
            "target": 1085000,
            "value": 772040,
            "targetPct": 100,
            "valuePct": 71
        },
        {
            "name": "Bradford Overton",
            "target": 2090000,
            "value": 2001600,
            "targetPct": 100,
            "valuePct": 95
        },
        {
            "name": "Chris Power",
            "target": 2900000,
            "value": 2572910,
            "targetPct": 100,
            "valuePct": 88
        },
        {
            "name": "Danny Lawrence",
            "target": 6500000,
            "value": 6900000,
            "targetPct": 100,
            "valuePct": 106
        },
        {
            "name": "Gareth Lacey",
            "target": 2530000,
            "value": 2219000,
            "targetPct": 100,
            "valuePct": 87
        },
        {
            "name": "Gavin Little",
            "target": 2120000,
            "value": 1790340,
            "targetPct": 100,
            "valuePct": 84
        },
        {
            "name": "Jacob Worthington",
            "target": 2500000,
            "value": 2160000,
            "targetPct": 100,
            "valuePct": 86
        },
        {
            "name": "Lars Anderson",
            "target": 5050000,
            "value": 4950000,
            "targetPct": 100,
            "valuePct": 98
        },
        {
            "name": "Michael Kelly",
            "target": 3390000,
            "value": 3300000,
            "targetPct": 100,
            "valuePct": 97
        },
        {
            "name": "Michael Rice",
            "target": 3080000,
            "value": 3000000,
            "targetPct": 100,
            "valuePct": 97
        },
        {
            "name": "Michelle Gounder",
            "target": 1205000,
            "value": 1245000,
            "targetPct": 100,
            "valuePct": 103
        },
        {
            "name": "Olivia Byrne",
            "target": 1525000,
            "value": 1525000,
            "targetPct": 100,
            "valuePct": 100
        },
        {
            "name": "Ricardo Morren",
            "target": 2625000,
            "value": 2210300,
            "targetPct": 100,
            "valuePct": 84
        },
        {
            "name": "Rohan Anderson",
            "target": 790000,
            "value": 450000,
            "targetPct": 100,
            "valuePct": 56
        },
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
    console.log('chartData', chartData);

    const chartConfig = {
        desktop: { label: "Desktop", color: "var(--chart-1)" },
        mobile: { label: "Mobile", color: "var(--chart-2)" },
        target: { label: "Target", color: "var(--muted-foreground)" },
        label: { color: "var(--background)" },
    }

    const BAR_HEIGHT = 30;
    let padding = { top: 4, bottom: 20 };
    let bandPadding = 0.25;
    let chartHeight = $derived(
        (BAR_HEIGHT + BAR_HEIGHT * bandPadding) * chartData.length +
        BAR_HEIGHT * bandPadding +
        padding.top + padding.bottom
    );
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>2026 Sales Revenues vs Targets</Card.Title>
        <Card.Description>This chart shows the individual sales revenue vs targets for each salesperson.</Card.Description>
    </Card.Header>
    <Card.Content>
        <!-- <Chart.Container config={chartConfig} height={chartHeight}> -->
        <BarChart
            // labels={{ offset: 12 }}
            data={chartData}
            orientation="horizontal"
            // yScale={scaleBand().padding(0.25)}
            height={chartHeight}
            y="name"
            axis="y"
            // grid={false}
            // rule={false}
            series={[
                { key: "targetPct", label: "Target", color: chartConfig.target.color, props: { fillOpacity: 0.2 } },
                { key: "valuePct", label: "Revenue", color: chartConfig.desktop.color, props: { insets: { y:6 } } }
            ]}
            seriesLayout="overlap"
            // padding={defaultChartPadding({ left: 30, right: 25 })}
            padding={{ left: 150 }}
            props={{
                bars: {
                    stroke: "none",
                    // radius: 5,
                    // insets: { left: 20 },
                    // rounded: "all",
                    motion: { type: "tween", duration: 500, easing: cubicInOut },
                },
                // highlight: { area: { fill: "none" } },
                // yAxis: {
                    // tickLabelProps: {
                    //     textAnchor: "start",
                    //     dx: 6,
                    //     class: "stroke-none fill-background!",
                    // },
                    // tickLength: 0,
                // },
            }}
        >
            {#snippet tooltip()}
            <Chart.Tooltip />
            {/snippet}
        </BarChart>
        <!-- </Chart.Container> -->
    </Card.Content>
    <Card.Footer>
        <div class="flex w-full items-start gap-2 text-sm">
        <div class="grid gap-2">
            <div class="flex items-center gap-2 leading-none font-medium">
            Trending up by 5.2% this month <TrendingUpIcon class="size-4" />
            </div>
            <div class="flex items-center gap-2 leading-none text-muted-foreground">
            Showing total visitors for the last 6 months
            </div>
        </div>
        </div>
    </Card.Footer>
</Card.Root>
