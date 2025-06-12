<script>
  import { Link } from "svelte-routing";
  import { authStore } from "../../stores/authStore";
  import osho from "../../assets/osho-4o.png";

  // Reactive derivations based on the authStore
  let currentUser = $derived($authStore.session);
  let isAuthenticated = $derived($authStore.isAuthenticated);
  let isLoading = $derived($authStore.loading);

  let userRole = $derived(currentUser ? (currentUser.role || 'user') : ''); // Default to 'user' if role is missing but authenticated
  let clientReturnUrl = $derived(
    currentUser && userRole === 'user' ? (currentUser.allowedUrls?.[0] || '/') : ''
  );

  // Optional: Replicate console logging if necessary for debugging using $effect
  $effect(() => {
    if (!isLoading) { // Log only when loading is complete
      if (currentUser) {
        console.log('🔍 [HOME] User role (derived):', userRole, 'User details (derived):', currentUser);
        if (userRole === 'user') {
          console.log('🔍 [HOME] User clientReturnUrl (derived):', clientReturnUrl);
        }
      } else {
        console.warn('[HOME] No current user found in authStore (derived) after loading.');
      }
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
  <!-- Removed logout button from here, assuming it's part of a global header or per-page context if needed -->
</div>

<div class="osho-pic">
  <img src={osho} alt="osho" style="width: 15vh; height: 15vh;" />
</div>

<div class="apps-container">
  {#if isLoading}
    <p>Loading user information...</p>
  {:else if isAuthenticated && currentUser}
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
    {:else}
      <!-- Fallback for authenticated user but unrecognized role or missing details -->
      <p>User authenticated, but role not recognized or application details are missing.</p>
    {/if}
  {:else} <!-- Not loading, Not authenticated -->
    <p>Please <Link to="/login" class="link">login</Link> to continue.</p>
  {/if}
</div>

{#if isAuthenticated && currentUser}
  <div style="margin-top: 2rem; text-align: center;">
    <button on:click={handleLogout} class="btn btn-secondary">Logout</button>
  </div>
{/if}

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .osho-pic {
    padding: 1rem 0; /* Adjusted padding */
    text-align: center; /* Center the image */
    margin-bottom: 1rem;
  }

  .apps-container {
    text-align: center; /* Center content within apps-container */
  }

  .apps-container h2 {
    margin-bottom: 0.5rem;
  }

  .apps-container p {
    margin-bottom: 1rem;
  }

  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    text-decoration: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    border: 1px solid transparent; /* Base border */
  }

  .btn-primary {
    background-color: #646cff;
    color: white;
    border-color: #646cff;
  }

  .btn-primary:hover {
    background-color: #535bf2;
  }
  
  .btn-secondary {
    background-color: #454545; /* Darker grey */
    color: white;
    border: 1px solid #555555; 
  }

  .btn-secondary:hover {
    background-color: #5a5a5a;
  }

  .link {
    color: #646cff;
    text-decoration: none;
  }
  .link:hover {
    text-decoration: underline;
  }

  /* Ensure styles for h1, h2, p are pleasant */
  h1 {
    font-size: 2em;
    margin-bottom: 0.5em; /* From original global or reset */
  }
  /* Other global styles would apply */
</style>
