<script>
  import { onMount } from "svelte";
  import { Link } from "svelte-routing";
  import { authStore } from "../../stores/authStore";
  import { navigate } from "svelte-routing";
  import osho from "../../assets/osho-4o.png";

  let currentUser = $state(null);
  let userRole = $state('');
  let clientReturnUrl = $state('');
  let ownerClientServers = $state([]);

  onMount(async () => {
    const storeState = $authStore;
    currentUser = storeState.user;

    if (currentUser) {
      userRole = currentUser.poolMetadata?.user_role || currentUser.role || 'user';
      console.log('🔍 [HOME] User role:', userRole, 'User details:', currentUser);

      if (userRole === 'owner') {
        if (currentUser.poolMetadata?.owned_clients && parseInt(currentUser.poolMetadata.owned_clients) > 0) {
        }
      } else if (userRole === 'user') {
        clientReturnUrl = currentUser.poolMetadata?.target_page ||
                          currentUser.poolMetadata?.client_app_main_url ||
                          '/';
        console.log('🔍 [HOME] User clientReturnUrl:', clientReturnUrl);
      }
    } else {
      console.warn('[HOME] No current user found in authStore.');
    }
  });

  /**
   * @description logout user and redirect to login
   */
  async function handleLogout() {
    try {
      await authStore.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }
</script>

<div class="header">
  <h1>Home</h1>
</div>

<div class="osho-pic">
  <img src={osho} alt="osho" style="width: 15vh; height: 15vh;"/>
</div>

<div class="apps-container">
  {#if userRole === 'owner'}
    <h2>Owner Dashboard</h2>
    <p>Manage your applications and users.</p>
    <Link to="/owner" class="btn btn-primary">Go to Owner Panel</Link>
  {:else if userRole === 'user'}
    <h2>My Application</h2>
    {#if clientReturnUrl && clientReturnUrl !== '/'}
      <p>Welcome back! Access your application below.</p>
      {#if clientReturnUrl.startsWith('http')}
        <a href={clientReturnUrl} class="btn btn-primary" target="_blank" rel="noopener noreferrer">Go to Application</a>
      {:else}
        <Link to={clientReturnUrl} class="btn btn-primary">Go to Application</Link>
      {/if}
    {:else}
      <p>Your application link is not configured, or you are viewing the Auth System's home page.</p>
    {/if}
  {:else if !$authStore.loading}
    <p>Loading user information...</p>
  {:else if !$authStore.isAuthenticated && !$authStore.loading }
     <p>Please <Link to="/login">login</Link> to continue.</p>
  {/if}
</div>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .osho-pic {
      padding: 2rem;
  }
</style>
