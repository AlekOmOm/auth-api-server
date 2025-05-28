<script lang="ts">
  interface ClientServer {
    app_name: string;
    assigned_schema_name: string;
    client_mode: string;
    allowed_return_urls: string[];
    client_id: string;
    // Define other properties if they exist
  }
  
  interface Props {
    clientServer?: ClientServer | null; // null for create, object for edit
    onClose?: () => void;
    onClientCreated?: () => void;
  }
  
  let { 
    clientServer = null,
    onClose,
    onClientCreated
  }: Props = $props();
  
  let isEditing = !!clientServer;
  let loading = $state(false);
  let error = $state('');
  
  // Form fields
  let appName = $state(clientServer?.app_name || '');
  let schemaName = $state(clientServer?.assigned_schema_name || '');
  let clientMode = $state(clientServer?.client_mode || 'frontend-login-proxy');
  let returnUrls = $state(clientServer?.allowed_return_urls?.join('\n') || '');
  
  // Generated fields (for display only when editing)
  let clientId = $state(clientServer?.client_id || '');
  let clientSecret = $state(''); // Will be shown only on creation
  
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

      console.log("clientData", clientData);
      
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
      
      onClientCreated?.();
      
    } catch (err: any) {
      console.error('Error saving client server:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  function handleClose() {
    onClose?.();
  }
  
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  }
</script>

<div class="modal-overlay" 
     onclick={handleClose}
     onkeydown={(e) => { if (e.key === 'Escape') handleClose(); }}
     role="dialog"
     tabindex="-1">
  <div class="modal" 
       onclick={(e) => e.stopPropagation()}
       onkeydown={(e) => { if (e.key === 'Escape') handleClose(); }}
       role="document">
    <div class="modal-header">
      <h2>{isEditing ? '✏️ Edit Client Server' : '➕ Create New Client Server'}</h2>
      <button class="close-btn" onclick={handleClose}>✕</button>
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
              <span class="credential-label">Client ID:</span>
              <div class="credential-value">
                <code>{clientId}</code>
                <button class="copy-btn" onclick={() => copyToClipboard(clientId)}>📋</button>
              </div>
            </div>
            
            <div class="credential-item">
              <span class="credential-label">Client Secret:</span>
              <div class="credential-value">
                <code class="secret">{clientSecret}</code>
                <button class="copy-btn" onclick={() => copyToClipboard(clientSecret)}>📋</button>
              </div>
            </div>
          </div>
          
          <div class="warning">
            ⚠️ <strong>Important:</strong> The client secret will not be shown again. Please save it securely.
          </div>
          
          <button class="btn btn-primary" onclick={() => onClientCreated?.()}>
            Continue to Dashboard
          </button>
        </div>
      {:else}
        <!-- Form state -->
        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
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
            <button type="button" class="btn btn-secondary" onclick={handleClose} disabled={loading}>
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
  /* Inherit font from global styles */
  :global(body) {
    font-family: var(--font-family);
    line-height: var(--line-height);
    font-weight: var(--font-weight-normal);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.65); /* Slightly darker overlay for better contrast with dark modal */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background: var(--modal-bg);
    color: var(--text-color); /* Ensure text inside modal uses theme color */
    border-radius: 12px; /* Kept original, can be 8px to match buttons */
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
    border-bottom: 1px solid var(--modal-header-border);
  }

  .modal-header h2 {
    margin: 0;
    /* color: var(--text-color); Inherited */
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--help-text-color);
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .close-btn:hover {
    background: var(--button-bg-color);
    color: var(--link-hover-color);
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
    color: var(--success-icon-color);
  }

  .success-state h3 {
    color: var(--success-text-color); /* More specific success text color */
    margin-bottom: 1rem;
  }

  .success-state p {
    color: var(--help-text-color); /* Use help text color for less emphasis */
    margin-bottom: 2rem;
  }

  .credentials {
    background: var(--credentials-bg);
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

  .credential-item label,
  .credential-item .credential-label {
    display: block;
    font-weight: var(--font-weight-medium);
    /* color: var(--text-color); Inherited */
    margin-bottom: 0.5rem;
  }

  .credential-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .credential-value code {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--input-border-color);
    color: var(--input-text-color);
    border-radius: 4px; /* Can be 8px */
    padding: 0.75rem;
    font-family: 'Courier New', monospace;
    word-break: break-all;
  }

  .credential-value code.secret {
    background: var(--secret-code-bg);
    border-color: var(--secret-code-border);
    color: var(--secret-code-text);
  }

  .copy-btn { /* Style like a small utility button */
    background: var(--button-bg-color);
    color: var(--link-color);
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 0.5rem 0.8rem; /* Adjusted padding */
    font-size: 0.9em;
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: border-color 0.25s, background-color 0.2s ease;
  }

  .copy-btn:hover {
    border-color: var(--button-hover-border-color);
    background: var(--button-bg-color); /* Keep bg or slightly change */
  }
   .copy-btn:focus,
   .copy-btn:focus-visible {
    outline: var(--button-focus-outline);
  }


  .warning {
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: 8px; /* Consistent radius */
    padding: 1rem;
    color: var(--warning-text);
    margin-bottom: 1.5rem;
  }
  .warning strong {
    font-weight: var(--font-weight-medium);
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: var(--font-weight-medium);
    /* color: var(--text-color); Inherited */
    margin-bottom: 0.5rem;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--input-border-color);
    border-radius: 8px; /* Match button radius */
    font-size: 1rem;
    background-color: var(--input-bg);
    color: var(--input-text-color);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    font-family: var(--font-family); /* Ensure form elements inherit font */
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--input-focus-border-color);
    box-shadow: 0 0 0 3px rgba(var(--rgb-link-color, 100, 108, 255), 0.25); /* Define --rgb-link-color for this */
  }
  /* You'd need to define --rgb-link-color in :root, e.g. --rgb-link-color: 100, 108, 255; */


  .form-group input:disabled,
  .form-group select:disabled,
  .form-group textarea:disabled {
    background: var(--input-disabled-bg);
    color: var(--input-disabled-text-color);
    cursor: not-allowed;
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    color: var(--help-text-color);
    font-size: 0.875rem;
  }

  .error-message {
    background: var(--error-bg);
    border: 1px solid var(--error-border-color);
    border-radius: 8px; /* Consistent radius */
    padding: 1rem;
    color: var(--error-text-color);
    margin-bottom: 1.5rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  /* General Button Styling (from app.css) */
  .btn {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: var(--font-weight-medium);
    font-family: var(--font-family); /* inherit from :root */
    cursor: pointer;
    transition: border-color 0.25s, background-color 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .btn:hover:not(:disabled) {
    border-color: var(--button-hover-border-color);
  }
  .btn:focus,
  .btn:focus-visible {
    outline: var(--button-focus-outline);
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Specific Button Types */
  .btn-primary {
    background-color: var(--button-primary-bg);
    color: var(--button-primary-text);
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--button-primary-hover-bg);
    border-color: var(--button-primary-hover-bg); /* Or keep transparent/themed border */
  }

  .btn-secondary {
    background-color: var(--button-secondary-bg);
    color: var(--button-secondary-text);
  }
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--button-secondary-hover-bg);
    /* border-color: var(--button-hover-border-color); /* Optional: if secondary should also get accent border on hover */
  }


  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor; /* Will take button's text color */
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
    .form-actions .btn { /* Make buttons full width in column layout */
        width: 100%;
        justify-content: center;
    }
    .credential-value {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style> 