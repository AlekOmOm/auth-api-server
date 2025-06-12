<script>
  import { navigate, Route, Link } from 'svelte-routing';
  import { authStore } from '../../stores/authStore.js'; // Import authStore
  import ErrorMessage from '../../components/ErrorMessage.svelte';
  import { extractAndStoreReturnUrl, getStoredReturnUrl, buildUrlWithReturnUrl } from '../../util/returnUrlHandler.js';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let userType = $state('client'); // Default to 'client' or 'auth' based on return_url
  let errorMessages = $state([]);
  let successMessage = $state('');
  let isLoading = $state(false);

  // Debug: Check URL on component load
  // console.log("🔍 Register component loaded - URL:", window.location.href, "Search:", window.location.search);
  
  // Store return_url in sessionStorage if present in URL
  let storedReturnUrl = extractAndStoreReturnUrl();
  
  // Set userType based on whether we have a return URL (client app redirect) or not (direct auth system registration)
  if (storedReturnUrl) {
    userType = 'client';
  } else {
    userType = 'auth';
  }

  async function register(event) {
    event.preventDefault();

    const credentials = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      userType: userType // Add user type to registration data
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
          const loginUrl = buildUrlWithReturnUrl('/login');
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

  <h2>Create Account</h2>

  <form onsubmit={register}>
      <!-- User Type Selector -->
      <div class="user-type-selector">
        <fieldset>
          <legend>Account Type:</legend>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" bind:group={userType} value="client" disabled={isLoading}/>
              <span class="radio-label">
                <strong>Client App User</strong>
                <small>For using client applications (Trading Simulator, etc.)</small>
              </span>
            </label>
            <label class="radio-option">
              <input type="radio" bind:group={userType} value="auth" disabled={isLoading}/>
              <span class="radio-label">
                <strong>Auth System Owner</strong>
                <small>For managing client applications and users</small>
              </span>
            </label>
          </div>
        </fieldset>
      </div>

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
      const loginUrl = buildUrlWithReturnUrl('/login');
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

    .user-type-selector {
        margin-bottom: 1rem;
    }

    .user-type-selector fieldset {
        border: none;
        padding: 0;
        margin: 0;
    }

    .user-type-selector legend {
        font-weight: 600;
        margin-bottom: 0.5rem;
        padding: 0;
        color: inherit;
    }

    .radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .radio-option {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: normal;
        background-color: rgba(255, 255, 255, 0.05);
    }

    .radio-option:hover {
        border-color: #646cff;
        background-color: rgba(255, 255, 255, 0.1);
    }

    .radio-option input[type="radio"] {
        margin: 0;
        margin-top: 0.1rem;
    }

    .radio-option input[type="radio"]:checked + .radio-label {
        color: #646cff;
    }

    .radio-option:has(input[type="radio"]:checked) {
        border-color: #646cff;
        background-color: rgba(100, 108, 255, 0.1);
    }

    .radio-label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .radio-label strong {
        font-weight: 600;
        color: inherit;
    }

    .radio-label small {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.875rem;
        line-height: 1.3;
    }

    @media (prefers-color-scheme: light) {
        .radio-option {
            border-color: rgba(0, 0, 0, 0.2);
            background-color: rgba(0, 0, 0, 0.02);
        }

        .radio-option:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }

        .radio-option:has(input[type="radio"]:checked) {
            background-color: rgba(100, 108, 255, 0.1);
        }

        .radio-label small {
            color: rgba(0, 0, 0, 0.6);
        }
    }
</style> 
