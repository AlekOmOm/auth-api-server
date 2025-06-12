<script>
  import { Router, Route, navigate, Link } from 'svelte-routing';
  // import authApi from '../../services/authApi.js' // No longer directly used
  import { authStore } from '../../stores/authStore.js'; // Import and use authStore
  import { loginRedirect } from '../../util/loginRedirect.js';
  import { extractAndStoreReturnUrl, getStoredReturnUrl, buildUrlWithReturnUrl } from '../../util/returnUrlHandler.js';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let errorMessage = $state('');
  let isLoading = $state(false); // Added for consistency

  // console.log("🔍 [LOGIN COMPONENT] Component initialized with Svelte 5");
  // console.log("🔍 [LOGIN COMPONENT] authStore imported:", typeof authStore);

  // Debug: Check URL on component load
  // console.log("🔍 Component loaded - URL:", window.location.href, "Search:", window.location.search);
  
  // Store return_url in sessionStorage if present in URL
  let storedReturnUrl = extractAndStoreReturnUrl();

  async function handleLogin(event) {
    // console.log("🔍 [LOGIN COMPONENT] handleLogin called");
    // console.log("🔍 [LOGIN COMPONENT] Event:", event);
    // console.log("🔍 [LOGIN COMPONENT] Form data - email:", email, "password length:", password.length);
    
    event.preventDefault();

    const credentials = {
      email: email.trim(),
      password: password.trim()
    }
    
    // console.log("🔍 [LOGIN COMPONENT] Credentials prepared:", { email: credentials.email, passwordLength: credentials.password.length });
    
    // Always get the most current return URL from sessionStorage
    // This ensures we use the one stored when Login.svelte first loaded with query params
    // or the one from a previous attempt if the user re-submits the form.
    let currentReturnUrl = getStoredReturnUrl();
    
    // console.log("🔍 [LOGIN] Before authStore.login - sessionStorage auth_return_url:", currentReturnUrl);
    // console.log("🔍 [LOGIN COMPONENT] About to call authStore.login");

    errorMessage = '';
    isLoading = true;

    try {
      // console.log("🔍 [LOGIN COMPONENT] Calling authStore.login...");
      const response = await authStore.login(credentials); // Pass only credentials
      
      // console.log("🔍 [LOGIN] After authStore.login - sessionStorage auth_return_url remains:", sessionStorage.getItem('auth_return_url'));
      // console.log("🔍 [LOGIN] Login API response:", response);
      // console.log("🔍 [LOGIN COMPONENT] Response received:", response);
      
      if (response.success) { 
        // console.log("🔍 [LOGIN] Login successful, calling loginRedirect utility");
        // console.log("🔍 [LOGIN COMPONENT] Login successful, calling loginRedirect");
        // Pass the API response and the returnUrl that was active for this login attempt
        loginRedirect(response, currentReturnUrl); 
        // sessionStorage.removeItem('auth_return_url'); // Moved to loginRedirect or handled if redirect is external
      } else {
        // console.log("🔍 [LOGIN COMPONENT] Login failed with response:", response);
        errorMessage = response.message || 'Login failed.';
      }
    } catch (error) {
      console.error('🔍 [LOGIN COMPONENT] Login error caught:', error);
      errorMessage = 'Login failed. Please check your credentials and try again.';
    } finally {
      // console.log("🔍 [LOGIN COMPONENT] Setting isLoading to false");
      isLoading = false;
    }
  }
</script>

<div>

  <h2>Login</h2>

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
      const registerUrl = buildUrlWithReturnUrl('/register');
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
