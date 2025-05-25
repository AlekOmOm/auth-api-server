<script>
  import { createEventDispatcher } from 'svelte';
  
  export let clientServer;
  
  const dispatch = createEventDispatcher();
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
  
  function getStatusColor(mode) {
    switch (mode) {
      case 'frontend-login-proxy':
        return '#27ae60';
      case 'api-auth-server':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  }
  
  function getModeDisplayName(mode) {
    switch (mode) {
      case 'frontend-login-proxy':
        return 'Frontend Login Proxy';
      case 'api-auth-server':
        return 'API Auth Server';
      default:
        return mode || 'Unknown';
    }
  }
</script>

<div class="client-card">
  <div class="card-header">
    <h3 class="app-name">{clientServer.app_name}</h3>
    <div class="status-badge" style="background-color: {getStatusColor(clientServer.client_mode)}">
      {getModeDisplayName(clientServer.client_mode)}
    </div>
  </div>
  
  <div class="card-content">
    <div class="info-row">
      <span class="label">Client ID:</span>
      <code class="client-id">{clientServer.client_id}</code>
    </div>
    
    <div class="info-row">
      <span class="label">Schema:</span>
      <span class="schema">{clientServer.assigned_schema_name}</span>
    </div>
    
    <div class="info-row">
      <span class="label">Created:</span>
      <span>{formatDate(clientServer.created_at)}</span>
    </div>
    
    <div class="info-row">
      <span class="label">Return URLs:</span>
      <div class="return-urls">
        {#each clientServer.allowed_return_urls || [] as url}
          <span class="url-tag">{url}</span>
        {/each}
      </div>
    </div>
  </div>
  
  <div class="card-actions">
    <button 
      class="btn btn-secondary"
      on:click={() => dispatch('manageUsers')}
      title="Manage users in this client server"
    >
      👥 Manage Users
    </button>
    
    <button 
      class="btn btn-outline"
      on:click={() => dispatch('editClient')}
      title="Edit client server settings"
    >
      ✏️ Edit
    </button>
    
    <button 
      class="btn btn-danger"
      on:click={() => dispatch('deleteClient')}
      title="Delete this client server"
    >
      🗑️ Delete
    </button>
  </div>
</div>

<style>
  .client-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border: 1px solid #e1e8ed;
  }
  
  .client-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }
  
  .app-name {
    margin: 0;
    color: #2c3e50;
    font-size: 1.25rem;
    font-weight: 600;
    flex: 1;
    word-break: break-word;
  }
  
  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }
  
  .card-content {
    margin-bottom: 1.5rem;
  }
  
  .info-row {
    display: flex;
    margin-bottom: 0.75rem;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .info-row:last-child {
    margin-bottom: 0;
  }
  
  .label {
    font-weight: 600;
    color: #7f8c8d;
    min-width: 80px;
    font-size: 0.9rem;
  }
  
  .client-id {
    background: #f8f9fa;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    color: #495057;
    word-break: break-all;
    flex: 1;
  }
  
  .schema {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .return-urls {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }
  
  .url-tag {
    background: #e3f2fd;
    color: #1976d2;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    word-break: break-all;
    border: 1px solid #bbdefb;
  }
  
  .card-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.85rem;
    flex: 1;
    min-width: 0;
  }
  
  .btn-secondary {
    background: linear-gradient(135deg, #6c5ce7, #5f3dc4);
    color: white;
  }
  
  .btn-secondary:hover {
    background: linear-gradient(135deg, #5f3dc4, #4c63d2);
    transform: translateY(-1px);
  }
  
  .btn-outline {
    background: transparent;
    color: #6c757d;
    border: 1px solid #dee2e6;
  }
  
  .btn-outline:hover {
    background: #f8f9fa;
    border-color: #adb5bd;
  }
  
  .btn-danger {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: white;
  }
  
  .btn-danger:hover {
    background: linear-gradient(135deg, #c0392b, #a93226);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    .card-header {
      flex-direction: column;
      align-items: stretch;
    }
    
    .info-row {
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .label {
      min-width: auto;
    }
    
    .card-actions {
      flex-direction: column;
    }
    
    .btn {
      flex: none;
    }
  }
</style> 