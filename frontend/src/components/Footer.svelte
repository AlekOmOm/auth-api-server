
<script>
  import { Router, Route, Link } from 'svelte-routing';
  import ProtectedRoute from './ProtectedRoute.svelte';
  import UnAuthenticatedRoute from './UnAuthenticatedRoute.svelte';

  import authApi from '../services/authApi';
</script>

<div class="footer">
   <Router>
   <nav>
      <div class="links">
         <ProtectedRoute path="/home"><Link class="link" id="home" to="/home">home</Link></ProtectedRoute>
         <ProtectedRoute path="/logout"><Link class="link" id="logout" to="/logout" onclick={authApi.logout}>logout</Link></ProtectedRoute>
         <UnAuthenticatedRoute><Link class="link" id="login" to="/login">login</Link></UnAuthenticatedRoute>
         <UnAuthenticatedRoute><Link class="link" id="register" to="/register">register</Link></UnAuthenticatedRoute>
      </div>    
   </nav>
   </Router>
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

