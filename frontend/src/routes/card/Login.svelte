<script>
  import { Router, Route, navigate, Link } from 'svelte-routing';
  // import authApi from '../../services/authApi.js' // No longer directly used
  import { authStore } from '../../stores/authStore.js'; // Import and use authStore

  let name = '';
  let email = '';
  let password = '';
  let errorMessage = '';
  let isLoading = false; // Added for consistency

  async function handleLogin(event) {
    event.preventDefault();

    const credentials = {
      // name: name.trim(), // Name is not used for login in authApi or authStore
      email: email.trim(),
      password: password.trim()
    }

    errorMessage = '';
    isLoading = true;

    try {
      /**
       * authStore login
       * - response.success = true if login is successful
       * - response.message = error message if login fails
      */
      const response = await authStore.login(credentials);
      
      if (response.success) { 
        /**
         * two cases:
         * - client frontend has redirect
         * - client frontend does not have redirect
         */
        const currentUrl = window.location.href;
        if (currentUrl.includes('return_url=')) {
          // extract return_url from window.location.href
          const encodedReturnUrl = currentUrl.split('return_url=')[1].split('&')[0]; 
          const decodedReturnUrl = decodeURIComponent(encodedReturnUrl);
          console.log('Redirecting to returnUrl:', decodedReturnUrl);
          // redirect to return_url
          window.location.href = decodedReturnUrl;
        } else {
          // redirect to home
          console.log('Redirecting to /home');
          navigate('/home', { replace: true });
        }
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
