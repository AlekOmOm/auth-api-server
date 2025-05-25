<script>
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore.js';
  import ClientServerCard from './components/ClientServerCard.svelte';
  import CreateClientModal from './components/CreateClientModal.svelte';
  import UserManagementModal from './components/UserManagementModal.svelte';
  import OwnerStats from './components/OwnerStats.svelte';

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
    try {
      loading = true;
      error = '';

      // Check if user has owner privileges
      const currentUser = await authStore.getCurrentUser();
      if (!currentUser.success) {
        error = 'Authentication required';
        return;
      }

      userRole = currentUser.data?.poolMetadata?.user_role || 'user';
      
      if (userRole !== 'owner' && userRole !== 'admin') {
        error = 'Owner privileges required to access this panel';
        return;
      }

      // Load client servers
      await loadClientServers();
      
      // Load owner statistics
      await loadOwnerStats();

    } catch (err) {
      console.error('Error loading owner data:', err);
      error = 'Failed to load owner panel data';
    } finally {
      loading = false;
    }
  }

  async function loadClientServers() {
    try {
      const response = await fetch('/api/clientServer/user/clients', {
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
      const response = await fetch('/api/owner/stats', {
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
      const response = await fetch(`/api/clientServer/user/clients/${clientServer.client_id}`, {
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
      <h3>❌ Access Denied</h3>
      <p>{error}</p>
      <a href="/home" class="btn btn-primary">Go to Home</a>
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
  .owner-panel {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
  }

  .panel-header {
    text-align: center;
    margin-bottom: 3rem;
    position: relative;
  }

  .panel-header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #2c3e50;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #7f8c8d;
    margin-bottom: 1rem;
  }

  .admin-badge, .owner-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .admin-badge {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: white;
  }

  .owner-badge {
    background: linear-gradient(135deg, #f39c12, #e67e22);
    color: white;
  }

  .loading {
    text-align: center;
    padding: 4rem 2rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
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
    padding: 4rem 2rem;
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 8px;
    color: #c53030;
  }

  .error h3 {
    margin-bottom: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .section-header h2 {
    color: #2c3e50;
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: #f8f9fa;
    border-radius: 12px;
    border: 2px dashed #dee2e6;
  }

  .empty-state h3 {
    color: #495057;
    margin-bottom: 1rem;
  }

  .empty-state p {
    color: #6c757d;
    margin-bottom: 2rem;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .client-servers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 2rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #2980b9, #21618c);
    transform: translateY(-1px);
  }

  .client-servers-section {
    margin-top: 2rem;
  }

  @media (max-width: 768px) {
    .owner-panel {
      padding: 1rem;
    }

    .panel-header h1 {
      font-size: 2rem;
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