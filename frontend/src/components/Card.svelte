<script>
    import { useLocation } from 'svelte-routing' 
    import Login from '../routes/card/Login.svelte'
    import Register from '../routes/card/Register.svelte'

    const location = useLocation(); 
    $: isRegister = $location.pathname === '/register';
    $: isLogin = $location.pathname === '/login' || $location.pathname === '/';
    
    let showTransition = false;
    $: {
        if (isRegister || isLogin) {
            showTransition = true;
            setTimeout(() => showTransition = false, 100);
        }
    }
</script>

<div class="card-container">
    <div class="card {showTransition ? 'transitioning' : ''}">
        {#if isLogin}
            <div class="card-face">
                <Login />
            </div>
        {:else if isRegister}
            <div class="card-face">
                <Register />
            </div>
        {/if}
    </div>
</div>
        
<style>
  .card-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    margin-top: 10vh;
    width: 100%;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
    min-height: 500px;
  }

  .card {
    position: relative;
    width: 100%;
    height: 100%;
    transition: opacity 0.3s ease;
  }
  
  .card.transitioning {
    opacity: 0.8;
  }
  
  .card-face {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 500px;
  }
  
  /* Ensure forms fit within the card */
  .card-face :global(form) {
    max-height: 100%;
    overflow-y: auto;
  }
</style>
