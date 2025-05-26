<script>
  import { Link } from 'svelte-routing';
  import { authStore } from '../stores/authStore.js';
  import authApi from '../services/authApi';

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }


</script>

<div class="footer">
   <nav>
      <div class="links">
         {#if !$authStore.loading}
           {#if $authStore.isAuthenticated}
             <!-- Authenticated user links -->
             <Link class="link" id="home" to="/home">home</Link>
             <button class="link logout-btn" id="logout" on:click={handleLogout}>logout</button>
           {:else}
             <!-- Unauthenticated user links -->
             <Link class="link" id="login" to="/login">login</Link>
             <Link class="link" id="register" to="/register">register</Link>
           {/if}
         {/if}
      </div>    
   </nav>
</div>

<style>
    nav {
        gap: 1rem;
        width: 100%;
        display: flex;
    }
    :global(.links) {
        padding: 1rem;
        border-radius: 4px;
        border: 1px solid #1f1d1d; 
        width: 100vw;
    }
    :global(.link) {
        padding: 0.5rem;
        border-radius: 4px;
        /* border: 1px solid #ccc; */
    }

    .logout-btn {
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
        display: inline;
    }

    .logout-btn:hover {
        color: #646cff;
    }

    .footer {
      position: fixed;
      /* fix left and right */
      left: 0;
      right: 0;
      bottom: 0.15vh;
      width: 100%;
      /* dark grey */
      background: linear-gradient(
            to top,
            #1c1c1f 0%,          /* same solid color you used */
            rgba(28, 28, 31, 0) 80% 
      );
    }

    
</style>

