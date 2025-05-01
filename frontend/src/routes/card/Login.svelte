<script>
  import { Router, Route, navigate, Link } from 'svelte-routing';
  import authApi from '../../services/authApi.js'
  import { authStore } from '../../stores/authStore.js';

  let name = '';
  let email = '';
  let password = '';
  let errorMessage = '';

  async function handleLogin(event) {
    event.preventDefault();

    const credentials = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim()
    }
    console.log(credentials);

    try {
      const response = await authApi.login(credentials);
      console.log(response);
      if (response.success && response.data) {
        authStore.login(response.data);
        navigate('/home', { replace: true });
      } else {
        errorMessage = response.message || 'Login failed.';
        console.log(response.message);
      }
    } catch (error) {
      console.error('Login failed:', error);
      errorMessage = 'Login failed. Please check your credentials and try again.';
    }
  }
</script>

<div>

  <h2> ___ </h2>

  <form onsubmit={handleLogin}>
    <input id="name" bind:value={name} name="name" placeholder="name" required autocomplete="username"/>
    <input id="email" bind:value={email} name="email" placeholder="email" required autocomplete="email"/>
    <input id="password" bind:value={password} name="password" type="password" placeholder="password" required autocomplete="current-password"/>
    
    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}

    <button type="submit">login</button>
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
