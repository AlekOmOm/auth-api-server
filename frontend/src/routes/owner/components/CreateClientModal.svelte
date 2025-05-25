<script>
  import { createEventDispatcher } from 'svelte';
  
  export let clientServer = null; // null for create, object for edit
  
  const dispatch = createEventDispatcher();
  
  let isEditing = !!clientServer;
  let loading = false;
  let error = '';
  
  // Form fields
  let appName = (clientServer && clientServer.app_name) || '';
  let schemaName = (clientServer && clientServer.assigned_schema_name) || '';
  let clientMode = (clientServer && clientServer.client_mode) || 'frontend-login-proxy';
  let returnUrls = (clientServer && clientServer.allowed_return_urls && clientServer.allowed_return_urls.join('\n')) || '';
  
  // Generated fields (for display only when editing)
  let clientId = (clientServer && clientServer.client_id) || '';
  let clientSecret = ''; // Will be shown only on creation
  
  const clientModes = [
    { value: 'frontend-login-proxy', label: 'Frontend Login Proxy', description: 'For web applications with user login flows' },
    { value: 'api-auth-server', label: 'API Auth Server', description: 'For server-to-server API authentication' }
  ];
  
  function validateForm() {
    if (!appName.trim()) {
      throw new Error('Application name is required');
    }
    
    if (!schemaName.trim()) {
      throw new Error('Schema name is required');
    }
    
    // Validate schema name format
    if (!/^[a-z][a-z0-9_]*$/.test(schemaName.trim())) {
      throw new Error('Schema name must start with a letter and contain only lowercase letters, numbers, and underscores');
    }
    
    if (!returnUrls.trim()) {
      throw new Error('At least one return URL is required');
    }
    
    // Validate URLs
    const urls = returnUrls.split('\n').map(url => url.trim()).filter(url => url);
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        throw new Error(`Invalid URL: ${url}`);
      }
    }
  }
  
  async function handleSubmit() {
    try {
      loading = true;
      error = '';
      
      validateForm();
      
      const urls = returnUrls.split('\n').map(url => url.trim()).filter(url => url);
      
      const clientData = {
        app_name: appName.trim(),
        assigned_schema_name: schemaName.trim(),
        client_mode: clientMode,
        allowed_return_urls: urls
      };
      
      let response;
      
      if (isEditing) {
        // Update existing client
        response = await fetch(`/api/clientServer/user/clients/${clientId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(clientData)
        });
      } else {
        // Create new client
        response = await fetch('/api/clientServer/user/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(clientData)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // If creating, show the client secret
      if (!isEditing && result.data?.client_secret) {
        clientSecret = result.data.client_secret;
        clientId = result.data.client_id;
      }
      
      if (clientSecret) {
        // Show success with secret, don't close yet
        return;
      }
      
      dispatch('clientCreated');
      
    } catch (err) {
      console.error('Error saving client server:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  function handleClose() {
    dispatch('close');
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  }
</script>

<div class="modal-overlay" on:click={handleClose}>
  <div class="modal" on:click|stopPropagation>
    <div class="modal-header">
      <h2>{isEditing ? '✏️ Edit Client Server' : '➕ Create New Client Server'}</h2>
      <button class="close-btn" on:click={handleClose}>✕</button>
    </div>
    
    <div class="modal-content">
      {#if clientSecret}
        <!-- Success state with client secret -->
        <div class="success-state">
          <div class="success-icon">🎉</div>
          <h3>Client Server Created Successfully!</h3>
          <p>Your client server has been created. Please save these credentials securely:</p>
          
          <div class="credentials">
            <div class="credential-item">
              <label>Client ID:</label>
              <div class="credential-value">
                <code>{clientId}</code>
                <button class="copy-btn" on:click={() => copyToClipboard(clientId)}>📋</button>
              </div>
            </div>
            
            <div class="credential-item">
              <label>Client Secret:</label>
              <div class="credential-value">
                <code class="secret">{clientSecret}</code>
                <button class="copy-btn" on:click={() => copyToClipboard(clientSecret)}>📋</button>
              </div>
            </div>
          </div>
          
          <div class="warning">
            ⚠️ <strong>Important:</strong> The client secret will not be shown again. Please save it securely.
          </div>
          
          <button class="btn btn-primary" on:click={() => dispatch('clientCreated')}>
            Continue to Dashboard
          </button>
        </div>
      {:else}
        <!-- Form state -->
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="appName">Application Name *</label>
            <input 
              id="appName"
              type="text" 
              bind:value={appName}
              placeholder="e.g., Trading Simulator"
              required
              disabled={loading}
            />
          </div>
          
          <div class="form-group">
            <label for="schemaName">Database Schema Name *</label>
            <input 
              id="schemaName"
              type="text" 
              bind:value={schemaName}
              placeholder="e.g., client_trading_sim"
              required
              disabled={loading || isEditing}
              pattern="^[a-z][a-z0-9_]*$"
              title="Must start with a letter and contain only lowercase letters, numbers, and underscores"
            />
            {#if isEditing}
              <small class="help-text">Schema name cannot be changed after creation</small>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="clientMode">Client Mode *</label>
            <select id="clientMode" bind:value={clientMode} disabled={loading}>
              {#each clientModes as mode}
                <option value={mode.value}>{mode.label}</option>
              {/each}
            </select>
            <small class="help-text">
              {clientModes.find(m => m.value === clientMode)?.description}
            </small>
          </div>
          
          <div class="form-group">
            <label for="returnUrls">Allowed Return URLs *</label>
            <textarea 
              id="returnUrls"
              bind:value={returnUrls}
              placeholder="http://localhost:3000&#10;https://myapp.com&#10;https://myapp.com/dashboard"
              rows="4"
              required
              disabled={loading}
            ></textarea>
            <small class="help-text">One URL per line. These are the URLs your application can redirect to after authentication.</small>
          </div>
          
          {#if error}
            <div class="error-message">
              ❌ {error}
            </div>
          {/if}
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" on:click={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={loading}>
              {#if loading}
                <span class="spinner"></span>
                {isEditing ? 'Updating...' : 'Creating...'}
              {:else}
                {isEditing ? 'Update Client Server' : 'Create Client Server'}
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e1e8ed;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #2c3e50;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #7f8c8d;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }
  
  .close-btn:hover {
    background: #f8f9fa;
  }
  
  .modal-content {
    padding: 1.5rem;
  }
  
  .success-state {
    text-align: center;
  }
  
  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .success-state h3 {
    color: #27ae60;
    margin-bottom: 1rem;
  }
  
  .success-state p {
    color: #7f8c8d;
    margin-bottom: 2rem;
  }
  
  .credentials {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    text-align: left;
  }
  
  .credential-item {
    margin-bottom: 1rem;
  }
  
  .credential-item:last-child {
    margin-bottom: 0;
  }
  
  .credential-item label {
    display: block;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }
  
  .credential-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .credential-value code {
    flex: 1;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 0.75rem;
    font-family: 'Courier New', monospace;
    word-break: break-all;
  }
  
  .credential-value code.secret {
    background: #fff3cd;
    border-color: #ffeaa7;
    color: #856404;
  }
  
  .copy-btn {
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .copy-btn:hover {
    background: #2980b9;
  }
  
  .warning {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
    padding: 1rem;
    color: #856404;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }
  
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
  
  .form-group input:disabled,
  .form-group select:disabled,
  .form-group textarea:disabled {
    background: #f8f9fa;
    color: #6c757d;
  }
  
  .help-text {
    display: block;
    margin-top: 0.25rem;
    color: #6c757d;
    font-size: 0.875rem;
  }
  
  .error-message {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 6px;
    padding: 1rem;
    color: #c53030;
    margin-bottom: 1.5rem;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #2980b9, #21618c);
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #5a6268;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    .modal {
      margin: 1rem;
      max-height: calc(100vh - 2rem);
    }
    
    .form-actions {
      flex-direction: column;
    }
    
    .credential-value {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style> 