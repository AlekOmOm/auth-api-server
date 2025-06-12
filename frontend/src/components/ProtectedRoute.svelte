<script>
  import { authStore } from '../stores/authStore.js';
  import { navigate } from 'svelte-routing';
  import { onMount } from 'svelte';

  let { path = "", location, children } = $props();

  let isAuthenticated = $state(false);
  let loading = $state(true);
  let hasAttemptedRedirect = $state(false);

  const unsubscribe = authStore.subscribe(value => {
    isAuthenticated = value.isAuthenticated;
    loading = value.loading;
  });

  $effect(() => {
    console.log(`🔍 [ProtectedRoute $effect path="${path}"] Evaluating:`, {
      isActive: location?.pathname === path,
      currentLoc: location?.pathname,
      loading: loading,
      isAuthenticated: isAuthenticated,
      hasAttemptedRedirect: hasAttemptedRedirect
    });

    if (location && location.pathname === path) {
      if (!loading && !isAuthenticated) {
        if (!hasAttemptedRedirect) {
          console.log(`🔍 [ProtectedRoute $effect path="${path}"] User not authenticated. Storing return URL and queueing redirect to /login.`);
          hasAttemptedRedirect = true;
          
          const currentFullPath = location.pathname + location.search + location.hash;
          sessionStorage.setItem('auth_return_url', currentFullPath);
          console.log("🔍 [ProtectedRoute $effect] Storing return URL:", currentFullPath, "for active protected path:", path);
          
          console.log(`🔍 [ProtectedRoute $effect path="${path}"] Navigating to /login immediately.`);
          navigate('/login', { replace: true });
        } else {
          console.log(`🔍 [ProtectedRoute $effect path="${path}"] User not authenticated, but redirect already attempted or in progress.`);
        }
      } else if (!loading && isAuthenticated) {
        console.log(`🔍 [ProtectedRoute $effect path="${path}"] ✅ User authenticated. Resetting redirect flag.`);
        hasAttemptedRedirect = false;
      } else if (loading) {
        console.log(`🔍 [ProtectedRoute $effect path="${path}"] Auth state is loading.`);
      }
    } else {
      if (hasAttemptedRedirect) {
        console.log(`🔍 [ProtectedRoute $effect path="${path}"] Route not active. Resetting redirect flag.`);
        hasAttemptedRedirect = false;
      }
    }
  });

  onMount(() => {
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
  {@html ""}
{:else}
  <p>Loading...</p> 
{/if} 