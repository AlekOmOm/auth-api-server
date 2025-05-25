<script>
  import { navigate, Route, Link } from 'svelte-routing';
  import { authStore } from '../../stores/authStore.js'; // Import authStore
  import ErrorMessage from '../../components/ErrorMessage.svelte';

  let name = '';
  let email = '';
  let password = '';
  let errorMessages = [];
  let successMessage = '';
  let isLoading = false;

  // Debug: Check URL on component load
  console.log("🔍 Register component loaded - URL:", window.location.href, "Search:", window.location.search);
  
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

  async function register(event) {
    event.preventDefault();

    const credentials = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim()
    }

    errorMessages = [];
    successMessage = '';
    isLoading = true;

    try {
      // authStore
      const response = await authStore.register(credentials);

      if(response.success) {
        successMessage = 'Registration successful! Please log in.'; // Updated message
        
        name = '';
        email = '';
        password = '';
        
        // redirect after 2 seconds, preserving return_url
        setTimeout(() => {
          const returnUrl = storedReturnUrl || sessionStorage.getItem('auth_return_url');
          const loginUrl = returnUrl ? `/login?return_url=${encodeURIComponent(returnUrl)}` : '/login';
          navigate(loginUrl);
        }, 2000);
      } else {
        if (response.errors && Array.isArray(response.errors)) {
          errorMessages = response.errors.map(err => err.msg);
        } else if (response.message) {
          errorMessages = [response.message];
        } else {
          errorMessages = ['Registration failed. Please try again.'];
        }
      }

    } catch (error) {
      console.error('Register failed:', error);
      errorMessages = ['An unexpected error occurred. Please try again later.'];
    } finally {
      isLoading = false;
    }
  }
</script>

<div>

  <h2> ___ </h2>

  <form onsubmit={register}>
      <input id="name" bind:value={name} name="name" placeholder="name" required autocomplete="name" disabled={isLoading}/>
      <input id="email" bind:value={email} name="email" placeholder="email" required autocomplete="email" disabled={isLoading}/>
      <input id="password" bind:value={password} name="password" type="password" placeholder="password (must be strong)" required autocomplete="new-password" disabled={isLoading}/>
      
      {#if successMessage}
        <div class="success-message">{successMessage}</div>
      {/if}
          
      {#if errorMessages.length > 0}
        <ErrorMessage errors={errorMessages} />
      {/if}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Registering...' : 'register'}
      </button>
  </form>

  <nav>
    <p>already have an account?</p>
    <a href="/login" onclick={(event) => { 
      event.preventDefault(); 
      // Preserve return_url when navigating to login
      const returnUrl = storedReturnUrl || sessionStorage.getItem('auth_return_url');
      const loginUrl = returnUrl ? `/login?return_url=${encodeURIComponent(returnUrl)}` : '/login';
      navigate(loginUrl); 
    }}>
      login
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
