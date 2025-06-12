<script>
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore.js';
  import clientServerApi from '../../services/clientServerApi.js';
  import ClientServerCard from './components/ClientServerCard.svelte';
  import CreateClientModal from './components/CreateClientModal.svelte';
  import UserManagementModal from './components/UserManagementModal.svelte';
  import OwnerStats from './components/OwnerStats.svelte';

  // Backend URL configuration - No longer directly needed here for these calls
  // const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";

  let clientServers = $state([]);
  let loading = $state(true);
  let error = $state('');
  let showCreateModal = $state(false);
  let showUserModal = $state(false);
  let selectedClientServer = $state(null);
  let userRole = $state('');
  let ownerStats = $state(null);

  // Operation specific feedback messages
  let actionError = $state('');
  let actionSuccessMessage = $state('');

  // Make component reactive to authStore changes
  $effect(() => {
    const currentStoreState = $authStore;
    // console.log('🔍 [OWNER PANEL] AuthStore changed:', currentStoreState);
    
    if (!currentStoreState.loading) {
      // Always reload data when auth state changes and is not loading
      loadOwnerData();
    }
  });

  onMount(() => {
    // console.log('🔍 [OWNER PANEL] Component mounted');
  });

  async function loadOwnerData() {
    loading = true; // Show loading for the overall process initially
    error = '';     // Clear previous errors

    try {
      const currentStoreState = $authStore;

      if (!currentStoreState.isAuthenticated || !currentStoreState.session) {
         console.log('🔍 [OWNER PANEL] Authentication check failed:', { 
          isAuthenticated: currentStoreState.isAuthenticated, 
          hasSession: !!currentStoreState.session 
        });
        throw new Error('Authentication required to access owner panel.');
      }

      const userRoleFromSession = currentStoreState.session?.role || 'user';
      console.log('🔍 [OWNER PANEL] User role from session:', userRoleFromSession);
      
      if (userRoleFromSession !== 'owner' && userRoleFromSession !== 'admin') {
        throw new Error(`Owner or Admin privileges required to access this panel. Detected role: ${userRoleFromSession}`);
      }

      userRole = userRoleFromSession;

      await loadClientServers();
      
      loading = false; 

      try {
        await loadOwnerStats();
      } catch (statsError) {
        console.warn('[OwnerPanel] Further error during background load of owner stats:', statsError);
      }

    } catch (err) { // Catches errors from auth checks or loadClientServers
      console.error('[OwnerPanel] Failed to load primary owner panel data:', err);
      error = err.message || 'Unknown error loading owner panel.'; // Set $error
      loading = false; // Ensure loading is false to display the error message
    }
  }

  async function loadClientServers() {
    try {
      const response = await clientServerApi.getClientServers();
      if (response.success) {
        clientServers = response.data || [];
      } else {
        throw new Error(response.message || 'Failed to load client servers from API.');
      }
    } catch (err) {
      console.error('Error loading client servers:', err);
      throw err;
    }
  }

  async function loadOwnerStats() {
    try {
      const response = await clientServerApi.getOwnerStats();
      if (response.success) {
        ownerStats = response.data;
      } else {
        console.warn('Failed to load owner stats from API:', response.message);
        ownerStats = null;
      }
    } catch (err) {
      console.error('Error loading owner stats via API:', err);
      ownerStats = null;
    }
  }

  function handleCreateClient() {
    showCreateModal = true;
  }

  function handleManageUsers(clientServer) {
    selectedClientServer = clientServer;
    showUserModal = true;
  }

  function handleEditClient(clientServer) {
    selectedClientServer = clientServer;
    showCreateModal = true;
  }

  async function handleDeleteClient(clientServer) {
    if (!confirm(`Are you sure you want to delete "${clientServer.app_name}"? This action cannot be undone.`)) {
      return;
    }

    actionError = '';
    actionSuccessMessage = '';
    loading = true; // Indicate an operation is in progress

    try {
      const response = await clientServerApi.deleteClientServer(clientServer.client_id);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete client server via API.');
      }

      actionSuccessMessage = `Successfully deleted client server: ${clientServer.app_name}`;
      await loadClientServers();
      await loadOwnerStats();
      
    } catch (err) {
      console.error('Error deleting client server:', err);
      actionError = 'Failed to delete client server: ' + (err.message || 'Unknown error');
    } finally {
      loading = false;
      // Optional: Clear messages after a delay
      setTimeout(() => {
        actionError = '';
        actionSuccessMessage = '';
      }, 5000);
    }
  }

  async function handleClientCreated() {
    showCreateModal = false;
    selectedClientServer = null;
    actionError = ''; // Clear previous action errors
    actionSuccessMessage = 'Client server operation successful!'; // Generic success for create/update
    await loadClientServers();
    await loadOwnerStats();
    setTimeout(() => {
        actionSuccessMessage = '';
      }, 5000);
  }

  function handleModalClose() {
    showCreateModal = false;
    showUserModal = false;
    selectedClientServer = null;
  }
</script>

<div class="owner-panel">
  <header class="panel-header">
    <h2>🏢 Owner Panel</h2>
    <p class="subtitle">Manage your client servers and users</p>
    
    {#if userRole === 'admin'}
      <div class="admin-badge">
        🔧 System Administrator
      </div>
    {:else if userRole === 'owner'}
      <div class="owner-badge">
        👑 Client Server Owner
      </div>
    {/if}
  </header>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading owner panel...</p>
    </div>
  {:else if error}
    <div class="error">
      <h3>⚠️ Loading Issue</h3>
      <p>{error}</p>
      <button class="btn btn-primary" onclick={loadOwnerData}>
        🔄 Retry Loading
      </button>
    </div>
  {:else}
    <!-- Owner Statistics -->
    {#if ownerStats}
      <OwnerStats stats={ownerStats} />
    {/if}

    <!-- Action Feedback Messages -->
    {#if actionError}
      <div class="error-message inline-feedback">
        <p>❌ {actionError}</p>
      </div>
    {/if}
    {#if actionSuccessMessage}
      <div class="success-message inline-feedback">
        <p>✅ {actionSuccessMessage}</p>
      </div>
    {/if}

    <!-- Client Servers Section -->
    <section class="client-servers-section">
      <div class="section-header">
        <h2>📱 Your Client Servers</h2>
        <button class="btn btn-primary" onclick={handleCreateClient}>
          ➕ Create New Client Server
        </button>
      </div>

      {#if clientServers.length === 0}
        <div class="empty-state">
          <h3>🚀 Get Started</h3>
          <p>You don't have any client servers yet. Create your first one to start managing users and authentication.</p>
          <button class="btn btn-primary" onclick={handleCreateClient}>
            Create Your First Client Server
          </button>
        </div>
      {:else}
        <div class="client-servers-grid">
          {#each clientServers as clientServer (clientServer.client_id)}
            <ClientServerCard 
              {clientServer}
              onManageUsers={() => handleManageUsers(clientServer)}
              onEditClient={() => handleEditClient(clientServer)}
              onDeleteClient={() => handleDeleteClient(clientServer)}
            />
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<!-- Modals -->
{#if showCreateModal}
  <CreateClientModal 
    clientServer={selectedClientServer}
    onClientCreated={handleClientCreated}
    onClose={handleModalClose}
  />
{/if}

{#if showUserModal && selectedClientServer}
  <UserManagementModal 
    clientServer={selectedClientServer}
    onClose={handleModalClose}
  />
{/if}

<style>
  /* Use consistent styling with app.css */
  .owner-panel {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    text-align: center;
  }

  .panel-header {
    margin-bottom: 3rem;
    position: relative;
  }

  .panel-header h1 {
    font-size: 3.2em;
    line-height: 1.1;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    opacity: 0.8;
  }

  .admin-badge, .owner-badge {
    display: inline-block;
    padding: 0.6em 1.2em;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9rem;
    border: 1px solid transparent;
    transition: border-color 0.25s;
  }

  .admin-badge {
    background-color: #e74c3c;
    color: white;
  }

  .owner-badge {
    background-color: #646cff;
    color: white;
  }

  .admin-badge:hover, .owner-badge:hover {
    border-color: #646cff;
  }

  .loading {
    text-align: center;
    padding: 4rem 2rem;
  }

  /* Spinner styles below are now handled by global app.css */
  /* .spinner { ... } */
  /* @keyframes spin { ... } */

  .error {
    text-align: center;
    padding: 2em;
    background-color: rgba(255, 0, 0, 0.1);
    border: 1px solid rgba(255, 0, 0, 0.3);
    border-radius: 8px;
    margin: 2rem 0;
  }

  .error h3 {
    margin-bottom: 1rem;
    color: #ff6b6b;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    text-align: left;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.8em;
  }

  .empty-state {
    text-align: center;
    padding: 2em;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 2px dashed rgba(255, 255, 255, 0.2);
    margin: 2rem 0;
  }

  .empty-state h3 {
    margin-bottom: 1rem;
  }

  .empty-state p {
    margin-bottom: 2rem;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
    opacity: 0.8;
  }

  .client-servers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 2rem;
    text-align: left;
  }

  .client-servers-section {
    margin-top: 2rem;
  }

  /* Light mode support (matches app.css) */
  @media (prefers-color-scheme: light) {
    .admin-badge {
      background-color: #e74c3c;
    }

    .owner-badge {
      background-color: #747bff;
    }

    .empty-state {
      background-color: rgba(0, 0, 0, 0.05);
      border-color: rgba(0, 0, 0, 0.2);
    }

    .error {
      background-color: rgba(255, 0, 0, 0.1);
      border-color: rgba(255, 0, 0, 0.3);
    }

    /* .spinner { ... } -- Handled globally */
  }

  @media (max-width: 768px) {
    .owner-panel {
      padding: 1rem;
    }

    .panel-header h1 {
      font-size: 2.5em;
    }

    .section-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .client-servers-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Inline feedback messages */
  .inline-feedback {
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 8px;
    text-align: center;
  }

  .error-message.inline-feedback {
    background-color: rgba(255, 0, 0, 0.1);
    border: 1px solid rgba(255, 0, 0, 0.3);
    color: #ff6b6b; /* Or a darker red for better contrast */
  }

  .success-message.inline-feedback {
    background-color: rgba(0, 255, 0, 0.1);
    border: 1px solid rgba(0, 255, 0, 0.3);
    color: #27ae60; /* Or a darker green */
  }
</style> 