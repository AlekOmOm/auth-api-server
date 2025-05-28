<script>
  import { authStore } from '../stores/authStore.js';
  import { navigate } from 'svelte-routing';
  import { onMount } from 'svelte';

  let { path = "", location, children } = $props(); // The path this route protects and location from Router

  let isAuthenticated = $state(false);
  let loading = $state(true);
  let hasAttemptedRedirect = $state(false);

  const unsubscribe = authStore.subscribe(value => {
    isAuthenticated = value.isAuthenticated;
    loading = value.loading;

    console.log("🔍 [ProtectedRoute] AuthStore update:", { 
      isAuthenticated: value.isAuthenticated, 
      loading: value.loading, 
      path, 
      currentPath: location?.pathname 
    });

    // Only act if this protected route is the current active route
    if (location && location.pathname === path) {
      // Wait for authStore to finish loading AND give it a moment to settle
      if (!loading && !isAuthenticated && !hasAttemptedRedirect) {
          console.log("🔍 [ProtectedRoute] User not authenticated after loading complete, redirecting...");
          hasAttemptedRedirect = true;
          const currentFullPath = location.pathname + location.search + location.hash;
          sessionStorage.setItem('auth_return_url', currentFullPath);
          console.log("🔍 [ProtectedRoute] Storing return URL:", currentFullPath, " (for active protected path:", path, ")");
          
          setTimeout(() => {
              console.log("🔍 [ProtectedRoute] Navigating to /login from protected path:", path);
              navigate('/login', { replace: true });
          }, 0);
      } else if (!loading && isAuthenticated) {
          console.log("🔍 [ProtectedRoute] ✅ User authenticated, allowing access to:", path);
      }
    } else if (location && location.pathname !== path) {
      console.log("🔍 [ProtectedRoute] Unsubscribing from authStore");
        hasAttemptedRedirect = false;
    }
  });

  onMount(() => {
    console.log("🔍 [ProtectedRoute] onMount - location:", location, "path:", path);
    console.log("🔍 [ProtectedRoute] onMount - loading:", loading, "isAuthenticated:", isAuthenticated);
    
    // Don't make any redirect decisions in onMount - let the authStore subscription handle it
    // This prevents race conditions where we redirect before the session check completes
    
    return () => {
      unsubscribe();
    };
  });
</script>

{#if !isAuthenticated && loading && location && location.pathname === path}
  <p>Loading...</p>
{:else if isAuthenticated && location && location.pathname === path}
  {@render children()}
{:else if !location || location.pathname !== path}
  <!-- This ProtectedRoute instance is not for the current path, render nothing -->
  {@html ""}
{:else}
  <!-- Fallback for unauthenticated on current path, typically shows Loading... briefly -->
  <p>Loading...</p> 
{/if} 