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

  // Debug: Check URL on component load
  console.log("🔍 Component loaded - URL:", window.location.href, "Search:", window.location.search);
  
  // Store return_url in sessionStorage if present in URL
  let storedReturnUrl = null;
  if (window.location.search.includes('return_url')) {
    storedReturnUrl = new URL(window.location.href).searchParams.get('return_url');
    if (storedReturnUrl) {
      sessionStorage.setItem('auth_return_url', storedReturnUrl);
      console.log("🔍 Stored return_url in sessionStorage:", storedReturnUrl);
    }
  } else {
    // Check if we have a stored return_url from a previous page load
    storedReturnUrl = sessionStorage.getItem('auth_return_url');
    if (storedReturnUrl) {
      console.log("🔍 Retrieved return_url from sessionStorage:", storedReturnUrl);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const credentials = {
      email: email.trim(),
      password: password.trim()
    }
    
    // Always get the most current return URL from sessionStorage
    let returnUrl = sessionStorage.getItem('auth_return_url');
    
    // If no stored return_url, check current URL as fallback
    if (!returnUrl && window.location.search.includes('return_url')) {
      returnUrl = new URL(window.location.href).searchParams.get('return_url');
      if (returnUrl) {
        returnUrl = decodeURIComponent(returnUrl);
        // Store it for future use
        sessionStorage.setItem('auth_return_url', returnUrl);
      }
    }
    
    console.log("🔍 [LOGIN] Before login - sessionStorage return_url:", sessionStorage.getItem('auth_return_url'));
    console.log("🔍 [LOGIN] Before login - storedReturnUrl:", storedReturnUrl);
    console.log("🔍 [LOGIN] Before login - final returnUrl:", returnUrl);

    errorMessage = '';
    isLoading = true;

    try {
      /**
       * authStore login
       * - response.success = true if login is successful
       * - response.message = error message if login fails
      */
      const response = await authStore.login(credentials, returnUrl);
      
      console.log("🔍 [LOGIN] After authStore.login - sessionStorage return_url:", sessionStorage.getItem('auth_return_url'));
      console.log("🔍 [LOGIN] Login response:", response);
      
      if (response.success) { 
        console.log("🔍 [LOGIN] Login successful, calling loginRedirect");
        loginRedirect(response);
        // Note: sessionStorage.removeItem is called inside loginRedirect after successful redirect
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
    <a href="/register" onclick={(event) => { 
      event.preventDefault(); 
      // Preserve return_url when navigating to register
      const returnUrl = storedReturnUrl || sessionStorage.getItem('auth_return_url');
      const registerUrl = returnUrl ? `/register?return_url=${encodeURIComponent(returnUrl)}` : '/register';
      navigate(registerUrl); 
    }}>
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
