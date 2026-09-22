<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '@/components/shared/header.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="wrapper">
	<Header />
	{@render children()}
</div>
