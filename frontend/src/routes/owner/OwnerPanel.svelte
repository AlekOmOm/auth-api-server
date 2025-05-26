<script>
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore.js';
  import { get } from 'svelte/store';
  import ClientServerCard from './components/ClientServerCard.svelte';
  import CreateClientModal from './components/CreateClientModal.svelte';
  import UserManagementModal from './components/UserManagementModal.svelte';
  import OwnerStats from './components/OwnerStats.svelte';

  // Backend URL configuration
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";

  let clientServers = [];
  let loading = true;
  let error = '';
  let showCreateModal = false;
  let showUserModal = false;
  let selectedClientServer = null;
  let userRole = '';
  let ownerStats = null;

  onMount(async () => {
    await loadOwnerData();
  });

  async function loadOwnerData() {
    let localError = '';
    let localLoadingDone = false;

    loading = true;
    error = '';

    try {
      const currentStoreState = get(authStore);

      if (!currentStoreState.isAuthenticated || !currentStoreState.user) {
        localError = 'Authentication required to access owner panel.';
        return;
      }

      const userRoleFromMeta = currentStoreState.user?.poolMetadata?.user_role || 'user';
      
      if (userRoleFromMeta !== 'owner' && userRoleFromMeta !== 'admin') {
        localError = `Owner or Admin privileges required to access this panel. Detected role: ${userRoleFromMeta}`;
        return;
      }

      userRole = userRoleFromMeta;

      await loadClientServers();
      
      // Load owner stats (non-critical, don't fail if it errors)
      try {
        await loadOwnerStats();
      } catch (statsError) {
        console.warn('Owner stats failed to load, continuing without stats:', statsError);
        // Don't throw - continue with the panel even if stats fail
      }

    } catch (err) {
      console.error('Error loading owner data:', err);
      localError = 'Failed to load owner panel data: ' + (err.message || 'Unknown error');
    } finally {
      error = localError;
      loading = false;
    }
  }

  async function loadClientServers() {
    try {
      const response = await fetch(`${BACKEND_URL}/clientServer/user/clients`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      clientServers = result.data || [];
    } catch (err) {
      console.error('Error loading client servers:', err);
      throw err;
    }
  }

  async function loadOwnerStats() {
    try {
      const response = await fetch(`${BACKEND_URL}/owner/stats`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        ownerStats = result.data;
      }
    } catch (err) {
      console.error('Error loading owner stats:', err);
      // Non-critical, continue without stats
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
    showCreateModal = true; // Reuse create modal for editing
  }

  async function handleDeleteClient(clientServer) {
    if (!confirm(`Are you sure you want to delete "${clientServer.app_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/clientServer/user/clients/${clientServer.client_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete client server: ${response.statusText}`);
      }

      // Reload client servers
      await loadClientServers();
      await loadOwnerStats();
      
    } catch (err) {
      console.error('Error deleting client server:', err);
      alert('Failed to delete client server: ' + err.message);
    }
  }

  async function handleClientCreated() {
    showCreateModal = false;
    selectedClientServer = null;
    await loadClientServers();
    await loadOwnerStats();
  }

  function handleModalClose() {
    showCreateModal = false;
    showUserModal = false;
    selectedClientServer = null;
  }
</script>

<div class="owner-panel">
  <header class="panel-header">
    <h1>🏢 Owner Panel</h1>
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
      <button class="btn btn-primary" on:click={loadOwnerData}>
        🔄 Retry Loading
      </button>
    </div>
  {:else}
    <!-- Owner Statistics -->
    {#if ownerStats}
      <OwnerStats stats={ownerStats} />
    {/if}

    <!-- Client Servers Section -->
    <section class="client-servers-section">
      <div class="section-header">
        <h2>📱 Your Client Servers</h2>
        <button class="btn btn-primary" on:click={handleCreateClient}>
          ➕ Create New Client Server
        </button>
      </div>

      {#if clientServers.length === 0}
        <div class="empty-state">
          <h3>🚀 Get Started</h3>
          <p>You don't have any client servers yet. Create your first one to start managing users and authentication.</p>
          <button class="btn btn-primary" on:click={handleCreateClient}>
            Create Your First Client Server
          </button>
        </div>
      {:else}
        <div class="client-servers-grid">
          {#each clientServers as clientServer (clientServer.client_id)}
            <ClientServerCard 
              {clientServer}
              on:manageUsers={() => handleManageUsers(clientServer)}
              on:editClient={() => handleEditClient(clientServer)}
              on:deleteClient={() => handleDeleteClient(clientServer)}
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
    on:clientCreated={handleClientCreated}
    on:close={handleModalClose}
  />
{/if}

{#if showUserModal && selectedClientServer}
  <UserManagementModal 
    clientServer={selectedClientServer}
    on:close={handleModalClose}
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
    /* Uses CSS custom properties from :root */
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

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top: 4px solid #646cff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

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

  /* Use consistent button styling from app.css */
  .btn {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    background-color: #1a1a1a;
    color: rgba(255, 255, 255, 0.87);
    cursor: pointer;
    transition: border-color 0.25s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn:hover {
    border-color: #646cff;
  }

  .btn:focus,
  .btn:focus-visible {
    outline: 4px auto -webkit-focus-ring-color;
  }

  .btn-primary {
    background-color: #646cff;
    color: white;
  }

  .btn-primary:hover {
    background-color: #535bf2;
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

    .btn {
      background-color: #f9f9f9;
      color: #213547;
    }

    .btn-primary {
      background-color: #747bff;
      color: white;
    }

    .btn-primary:hover {
      background-color: #646cff;
    }

    .empty-state {
      background-color: rgba(0, 0, 0, 0.05);
      border-color: rgba(0, 0, 0, 0.2);
    }

    .error {
      background-color: rgba(255, 0, 0, 0.1);
      border-color: rgba(255, 0, 0, 0.3);
    }

    .spinner {
      border-color: rgba(0, 0, 0, 0.1);
      border-top-color: #747bff;
    }
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
</style> 