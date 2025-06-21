<script>
    import { Router, Route} from 'svelte-routing'
    // components
    import Card from './components/Card.svelte'
    import Header from './components/Header.svelte'
    import Footer from './components/Footer.svelte'
    import ProtectedRoute from './components/ProtectedRoute.svelte';

    // routes
    import Home from './routes/home/Home.svelte'
    import OwnerPanel from './routes/owner/OwnerPanel.svelte'

    let { url = "" } = $props();
    
</script>

<div class="page">
  <Header />
  <div class="content">
    <Router {url} let:location>
      <Route path="/"><Card /></Route>
      <Route path="/register"><Card /></Route>
      <Route path="/login"><Card /></Route>
      <ProtectedRoute path="/home" {location}><Home /></ProtectedRoute>
      <ProtectedRoute path="/owner" {location}><OwnerPanel /></ProtectedRoute>
    </Router>
    <Footer />
  </div>
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




