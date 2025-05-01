<script>
    import { Router, Route, Link} from 'svelte-routing'
    // components
    import Card from './components/Card.svelte'
    import Header from './components/Header.svelte'
    import Footer from './components/Footer.svelte'
    import ProtectedRoute from './components/ProtectedRoute.svelte';
    import UnAuthenticatedRoute from './components/UnAuthenticatedRoute.svelte';

    // routes
    import Home from './routes/home/Home.svelte'
    import Register from './routes/card/Register.svelte'
    import Login from './routes/card/Login.svelte'

    export let url = "";
    
</script>

<div class="page">
  <Header />
  <div class="content">
    <Router {url}>
        
      <div>
                
        <Route path="/"><Card /></Route>
        
        <Route path="/register"><Register /></Route>
        <Route path="/login"><Login /></Route>

        <ProtectedRoute path="/home"><Home /></ProtectedRoute>
      </div>
    </Router>
  </div>
  <Footer />
</div>

<style>
  .page {
    display: grid;
    grid-template-rows: auto 1fr auto; 
    height: 100%;
  }
  .content {
    display: flex;             
    flex-direction: column;
    justify-content: center;
    align-items:   center;
  }
</style>




