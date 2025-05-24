<script>
  import { Router, Route, navigate, Link } from 'svelte-routing';
  // import authApi from '../../services/authApi.js' // No longer directly used
  import { authStore } from '../../stores/authStore.js'; // Import and use authStore
  import { loginRedirect } from '../../util/loginRedirect.js';

  let name = '';
  let email = '';
  let password = '';
  let errorMessage = '';
  let isLoading = false; // Added for consistency

  async function handleLogin(event) {
    event.preventDefault();

    const credentials = {
      email: email.trim(),
      password: password.trim()
    }
    let returnUrl = null;
    if (window.location.search.includes('return_url')) {
      returnUrl = new URL(window.location.href).searchParams.get('return_url');
    }

    errorMessage = '';
    isLoading = true;

    try {
      /**
       * authStore login
       * - response.success = true if login is successful
       * - response.message = error message if login fails
      */
      const response = await authStore.login(credentials, returnUrl);
      if (response.success) { 
        loginRedirect(response);
      } else {
        errorMessage = response.message || 'Login failed.';
      }
    } catch (error) {
      console.error('Login failed:', error);
      errorMessage = 'Login failed. Please check your credentials and try again.';
    } finally {
      isLoading = false;
    }
  }
</script>

<div>

  <h2> ___ </h2>

  <form onsubmit={handleLogin}>
    <input id="email" bind:value={email} name="email" placeholder="email" required autocomplete="email" disabled={isLoading}/>
    <input id="password" bind:value={password} name="password" type="password" placeholder="password" required autocomplete="current-password" disabled={isLoading}/>
    
    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}

    <button type="submit" disabled={isLoading}>
      {isLoading ? 'Logging in...' : 'login'}
    </button>
  </form>

  <nav>
    <p>don't have an account?</p>
    <a href="/register" onclick={(event) => { event.preventDefault(); navigate('/register'); }}>
      register
    </a>
  </nav>

</div>                                        

<style>
      form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
    }
    
    input {
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #ccc;
    }
    
    button {
        margin-top: 1rem;
    }
</style>
