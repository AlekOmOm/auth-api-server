<script>
  import { authStore } from '../stores/authStore.js';
  import { navigate } from 'svelte-routing';
  import { onMount } from 'svelte';

  let isAuthenticated = false;
  let loading = true;

  // subscribe to authStore to get the state
  /*
  * @param {Object} value - The state of the authStore
  * @param {Boolean} value.isAuthenticated - Whether the user is authenticated
  * @param {Boolean} value.loading - Whether the user is loading
  */
  const unsubscribe = authStore.subscribe(value => {
    isAuthenticated = value.isAuthenticated;
    loading = value.loading;
    // Redirect if not authenticated and not loading
    if (!loading && !isAuthenticated) {
        // Use timeout to ensure navigation happens after component mounts
        setTimeout(() => navigate('/login', { replace: true }), 0);
    }
  });

  // Ensure unsubscribe is called when component is destroyed
  onMount(() => {
      return () => {
          unsubscribe();
      };
  });

</script>

{#if loading}
  <p>Loading...</p> <!-- Or some loading indicator -->
{:else if isAuthenticated}
  <slot></slot> <!-- Render the wrapped component/content -->
{/if} 