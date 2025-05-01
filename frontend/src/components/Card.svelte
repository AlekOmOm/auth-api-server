<script>
    // Removed Router, Route, Link imports
    import { useLocation, navigate } from 'svelte-routing' 
    import Login from '../routes/card/Login.svelte'
    import Register from '../routes/card/Register.svelte'

    const loc = useLocation(); 
    // @ts-ignore
     $: flipped = loc.pathname === '/register';

    // Function to navigate (example if buttons are needed inside)
    function goToRegister() {
        navigate('/register');
    }
    function goToLogin() {
        navigate('/'); // Assuming / is login now
    }

</script>


<div class="scene">
    <div class="card {flipped ? 'is-flipped' : ''}">
        <div class="face front">
            <Login />
            <!-- Removed Route and button here - Login component handles its own form/link -->
        </div>

        <div class="face back">
            <Register />
             <!-- Register component handles its own form/link -->
        </div>
        <!-- Optional: Keep for debugging -->
        <!-- <p>flipped: {flipped}</p> -->
    </div>
</div>
        
<style>
  .scene { perspective: 1000px; }
  .card  { transition: transform .6s; transform-style: preserve-3d; position: relative; }
  .card.is-flipped { transform: rotateY(180deg); }
  .face  { position: absolute; width: 100%; backface-visibility: hidden; }
  .back  { transform: rotateY(180deg); }
</style>
