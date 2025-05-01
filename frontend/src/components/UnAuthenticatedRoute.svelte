<script>
   /**
    * @description This component is used to hide routes for authenticated users
    * - routes: login, register  -  should not be accessible if user is authenticated
    * 
   */
  import { authStore } from '../stores/authStore.js';
  import { navigate } from 'svelte-routing';
  import { onMount } from 'svelte';
  
  // Use $state for reactive variables
  let isAuthenticated = $state(false); // false if user is not authenticated
  let loading = $state(true); // true if loading is in progress

  // subscribe to authStore to get the state
  const unsubscribe = authStore.subscribe(value => {
    isAuthenticated = value.isAuthenticated;
    loading = value.loading;
  });

  // Ensure unsubscribe is called when component is destroyed
  onMount(() => {
    return () => {
      unsubscribe();
    };
  });

  // Reactive effect for navigation using $effect rune
  $effect(() => {
    // if loading is finished and the user is authenticated, redirect to the home page
    if (!loading && isAuthenticated) {
        navigate('/home', { replace: true });
    }
  });

</script>

<!-- Render children if user is NOT authenticated (don't wait for loading) -->
{#if !isAuthenticated}
  <slot></slot>
{/if}

