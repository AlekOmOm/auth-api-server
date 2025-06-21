<script>
  import { onMount } from 'svelte';
  import clientServerApi from '../../../services/clientServerApi.js'; // Import the API service
  
  let { clientServer, onClose } = $props();
  
  let users = $state([]);
  let loading = $state(true);
  let error = $state('');
  let showCreateUser = $state(false);
  let editingUser = $state(null);
  
  // Create/Edit user form
  let userName = $state('');
  let userEmail = $state('');
  let userPassword = $state('');
  let userRoleInForm = $state('user'); // Renamed to avoid conflict with user.role in table
  let formLoading = $state(false);
  let formError = $state('');
  
  const userRoles = [
    { value: 'user', label: 'User', description: 'Standard user access' },
    { value: 'admin', label: 'Admin', description: 'Administrative access within this client' }
  ];
  
  onMount(async () => {
    await loadUsers();
  });
  
  async function loadUsers() {
    loading = true;
    error = '';
    if (!clientServer || !clientServer.client_id) {
      error = 'Client server information is not available to load users.';
      loading = false;
      users = [];
      return;
    }
    try {
      const response = await clientServerApi.getClientUsers(clientServer.client_id);
      if (response.success) {
        users = response.data || [];
      } else {
        error = response.message || 'Failed to load users.';
        users = []; // Clear users on error
      }
    } catch (err) {
      console.error('Error loading users (unexpected):', err);
      error = 'An unexpected error occurred while loading users: ' + (err.message || 'Unknown error');
      users = [];
    } finally {
      loading = false;
    }
  }
  
  function handleCreateUser() {
    resetForm();
    showCreateUser = true;
  }
  
  function handleEditUser(user) {
    editingUser = user;
    userName = user.name;
    userEmail = user.email;
    userPassword = '';
    userRoleInForm = user.role;
    formError = ''; // Clear previous form errors
    showCreateUser = true;
  }
  
  function resetForm() {
    editingUser = null;
    userName = '';
    userEmail = '';
    userPassword = '';
    userRoleInForm = 'user';
    formError = '';
  }
  
  function cancelForm() {
    resetForm();
    showCreateUser = false;
  }
  
  async function handleSubmitUser() {
    formLoading = true;
    formError = '';
    if (!clientServer || !clientServer.client_id) {
      formError = 'Client server information is missing for submitting user data.';
      formLoading = false;
      return;
    }
    try {
      if (!userName.trim() || !userEmail.trim()) {
        formError = 'Name and email are required';
        formLoading = false; // Ensure loading is false
        return;
      }
      
      if (!editingUser && !userPassword.trim()) {
        formError = 'Password is required for new users';
        formLoading = false; // Ensure loading is false
        return;
      }
      
      const userData = {
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRoleInForm
      };
      
      if (userPassword.trim()) {
        userData.password = userPassword.trim();
      }
      
      let response;
      if (editingUser) {
        if (!editingUser.user_id) {
          formError = 'User ID is missing for update.';
          formLoading = false; // Ensure loading is false
          return;
        }
        response = await clientServerApi.updateClientUser(clientServer.client_id, editingUser.user_id, userData);
      } else {
        response = await clientServerApi.createClientUser(clientServer.client_id, userData);
      }
      
      if (response.success) {
        await loadUsers();
        cancelForm();
      } else {
        if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
          formError = response.errors.map(e => e.msg || String(e)).join('; ');
        } else {
          formError = response.message || (editingUser ? 'Failed to update user.' : 'Failed to create user.');
        }
      }
    } catch (err) {
      console.error('Error saving user (unexpected):', err);
      formError = 'An unexpected error occurred: ' + (err.message || 'Unknown error');
    } finally {
      formLoading = false;
    }
  }
  
  async function handleDeleteUser(user) {
    if (!clientServer || !clientServer.client_id || !user || !user.user_id) {
      alert('Cannot delete user: required information is missing.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const response = await clientServerApi.deleteClientUser(clientServer.client_id, user.user_id);
      if (response.success) {
        await loadUsers();
      } else {
        alert(response.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Error deleting user (unexpected):', err);
      alert('An unexpected error occurred while deleting user: ' + (err.message || 'Unknown error'));
    }
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
  
  function getRoleColor(role) {
    switch (role) {
      case 'admin':
        return '#e74c3c';
      case 'user':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  }
</script>

<div class="modal-overlay" 
     onclick={() => onClose?.()}
     onkeydown={(e) => { if (e.key === 'Escape') onClose?.(); }}
     role="dialog" 
     aria-labelledby="userManagementModalTitle" 
     tabindex="-1">
  <div class="modal" 
       onclick={(e) => e.stopPropagation()}
       onkeydown={(e) => { if (e.key === 'Escape') onClose?.(); }}
       role="document"
       aria-modal="true">
    <div class="modal-header">
      <h2 id="userManagementModalTitle">👥 Manage Users - {clientServer?.app_name}</h2>
      <button class="close-btn" onclick={() => onClose?.()} aria-label="Close user management dialog">✕</button>
    </div>
    
    <div class="modal-content">
      {#if showCreateUser}
        <!-- Create/Edit User Form -->
        <div class="user-form">
          <h3>{editingUser ? '✏️ Edit User' : '➕ Create New User'}</h3>
          
          <form onsubmit={(e) => { e.preventDefault(); handleSubmitUser(); }}>
            <div class="form-row">
              <div class="form-group">
                <label for="userName">Name *</label>
                <input 
                  id="userName"
                  type="text" 
                  bind:value={userName}
                  placeholder="User's full name"
                  required
                  disabled={formLoading}
                  aria-required="true"
                />
              </div>
              
              <div class="form-group">
                <label for="userEmail">Email *</label>
                <input 
                  id="userEmail"
                  type="email" 
                  bind:value={userEmail}
                  placeholder="user@example.com"
                  required
                  disabled={formLoading}
                  aria-required="true"
                />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="userPassword">Password {editingUser ? '(leave blank to keep current)' : '*'}</label>
                <input 
                  id="userPassword"
                  type="password" 
                  bind:value={userPassword}
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                  required={!editingUser}
                  disabled={formLoading}
                  aria-required={!editingUser}
                />
              </div>
              
              <div class="form-group">
                <label for="userRoleInForm">Role *</label>
                <select id="userRoleInForm" bind:value={userRoleInForm} disabled={formLoading} aria-required="true">
                  {#each userRoles as roleOpt}
                    <option value={roleOpt.value}>{roleOpt.label}</option>
                  {/each}
                </select>
                <small class="help-text">
                  {userRoles.find(r => r.value === userRoleInForm)?.description}
                </small>
              </div>
            </div>
            
            {#if formError}
              <div class="error-message" role="alert">
                ❌ {formError}
              </div>
            {/if}
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick={cancelForm} disabled={formLoading}>
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" disabled={formLoading}>
                {#if formLoading}
                  <span class="spinner-sm"></span>
                  {editingUser ? 'Updating...' : 'Creating...'}
                {:else}
                  {editingUser ? 'Update User' : 'Create User'}
                {/if}
              </button>
            </div>
          </form>
        </div>
      {:else}
        <!-- Users List -->
        <div class="users-section">
          <div class="section-header">
            <h3>Users in {clientServer?.assigned_schema_name}</h3>
            <button class="btn btn-primary" onclick={handleCreateUser}>
              ➕ Add User
            </button>
          </div>
          
          {#if loading}
            <div class="loading" role="status" aria-live="polite">
              <div class="spinner"></div>
              <p>Loading users...</p>
            </div>
          {:else if error}
            <div class="error" role="alert">
              <p>{error}</p>
              <button class="btn btn-primary" onclick={loadUsers}>Retry</button>
            </div>
          {:else if users.length === 0}
            <div class="empty-state">
              <h4>No Users Found</h4>
              <p>This client server doesn't have any users yet.</p>
              <button class="btn btn-primary" onclick={handleCreateUser}>
                Create First User
              </button>
            </div>
          {:else}
            <div class="users-table" role="table" aria-label="Client Server Users">
              <div class="table-header" role="rowgroup">
                <div class="col-name" role="columnheader">Name</div>
                <div class="col-email" role="columnheader">Email</div>
                <div class="col-role" role="columnheader">Role</div>
                <div class="col-created" role="columnheader">Created</div>
                <div class="col-actions" role="columnheader">Actions</div>
              </div>
              
              {#each users as user (user.user_id)}
                <div class="table-row" role="row">
                  <div class="col-name" role="cell">
                    <div class="user-name">{user.name}</div>
                  </div>
                  <div class="col-email" role="cell">
                    <div class="user-email">{user.email}</div>
                  </div>
                  <div class="col-role" role="cell">
                    <span class="role-badge" style="background-color: {getRoleColor(user.role)}">
                      {user.role}
                    </span>
                  </div>
                  <div class="col-created" role="cell">
                    {formatDate(user.created_at)}
                  </div>
                  <div class="col-actions" role="cell">
                    <button 
                      class="btn-icon btn-edit"
                      onclick={() => handleEditUser(user)}
                      title="Edit user {user.name}"
                      aria-label="Edit user {user.name}"
                    >
                      ✏️
                    </button>
                    <button 
                      class="btn-icon btn-delete"
                      onclick={() => handleDeleteUser(user)}
                      title="Delete user {user.name}"
                      aria-label="Delete user {user.name}"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Styles remain largely the same, but ensure they are theme-aware if using CSS vars from CreateClientModal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--modal-overlay-bg, rgba(0, 0, 0, 0.5)); /* Added fallback */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal {
    background: var(--modal-bg, white); /* Added fallback */
    color: var(--text-color, #2c3e50); /* Added fallback */
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--modal-header-border, #e1e8ed); /* Added fallback */
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
    color: var(--help-text-color, #7f8c8d); /* Added fallback */
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  
  .close-btn:hover {
    background: var(--button-bg-color, #f8f9fa); /* Added fallback */
    color: var(--link-hover-color, #3498db); /* Added fallback */
  }
  
  .modal-content {
    padding: 1.5rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .section-header h3 {
    margin: 0;
    /* color: var(--text-color); Inherited */
  }
  
  .loading, .error, .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .loading .spinner {
    /* Basic spinner, can be replaced with global one if available */
    border: 4px solid var(--spinner-bg-color, rgba(0, 0, 0, 0.1));
    border-left-color: var(--spinner-color, #3498db);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem auto;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error {
    color: var(--error-text-color, #e74c3c); /* Added fallback */
    background-color: var(--error-bg, #fff5f5); /* Added fallback */
    border: 1px solid var(--error-border-color, #fed7d7); /* Added fallback */
    padding: 1rem;
    border-radius: 8px;
  }
  
  .empty-state h4 {
    color: var(--help-text-color, #7f8c8d);
    margin-bottom: 0.5rem;
  }
  
  .empty-state p {
    color: var(--help-text-color, #95a5a6);
    margin-bottom: 1.5rem;
  }
  
  .users-table {
    border: 1px solid var(--table-border-color, #e1e8ed); /* Added fallback */
    border-radius: 8px;
    overflow: hidden;
  }
  
  .table-header, .table-row {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1fr 1fr;
    gap: 1rem;
    padding: 1rem;
    align-items: center;
  }
  
  .table-header {
    background: var(--table-header-bg, #f8f9fa); /* Added fallback */
    font-weight: 600;
    /* color: var(--text-color); Inherited */
    border-bottom: 1px solid var(--table-border-color, #e1e8ed);
  }
  
  .table-row {
    border-bottom: 1px solid var(--table-row-border-color, #f1f3f4); /* Added fallback */
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .table-row:hover {
    background: var(--table-row-hover-bg, #f8f9fa); /* Added fallback */
  }
  
  .user-name {
    font-weight: 600;
    /* color: var(--text-color); Inherited */
  }
  
  .user-email {
    color: var(--help-text-color, #7f8c8d);
    font-size: 0.9rem;
  }
  
  .role-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .col-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-icon {
    background: none;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    font-size: 1rem; /* Ensure icons are reasonably sized */
  }
  
  .btn-icon:hover {
    background: var(--button-bg-hover, #f0f0f0); /* Added fallback */
  }
  
  .btn-edit:hover {
    background: var(--button-edit-hover-bg, #e3f2fd); /* Added fallback */
  }
  
  .btn-delete:hover {
    background: var(--button-delete-hover-bg, #ffebee); /* Added fallback */
  }
  
  /* User Form Styles */
  .user-form {
    background: var(--form-bg, #f8f9fa); /* Added fallback */
    border-radius: 8px;
    padding: 1.5rem;
  }
  
  .user-form h3 {
    margin: 0 0 1.5rem 0;
    /* color: var(--text-color); Inherited */
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
  }
  
  .form-group label {
    font-weight: 600;
    /* color: var(--text-color); Inherited */
    margin-bottom: 0.5rem;
  }
  
  .form-group input,
  .form-group select {
    padding: 0.75rem;
    border: 1px solid var(--input-border-color, #dee2e6); /* Added fallback */
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
    background-color: var(--input-bg, white); /* Added fallback */
    color: var(--input-text-color, #2c3e50); /* Added fallback */
    font-family: inherit;
  }
  
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--input-focus-border-color, #3498db); /* Added fallback */
    box-shadow: 0 0 0 3px var(--input-focus-shadow, rgba(52, 152, 219, 0.1)); /* Added fallback */
  }
  
  .form-group input:disabled,
  .form-group select:disabled {
    background: var(--input-disabled-bg, #f8f9fa);
    color: var(--input-disabled-text-color, #6c757d);
  }
  
  .help-text {
    margin-top: 0.25rem;
    color: var(--help-text-color, #6c757d);
    font-size: 0.875rem;
  }
  
  .error-message {
    background: var(--error-bg, #fff5f5);
    border: 1px solid var(--error-border-color, #fed7d7);
    border-radius: 6px;
    padding: 1rem;
    color: var(--error-text-color, #c53030);
    margin-bottom: 1rem;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  /* Consistent button styling (can be from global styles) */
  .btn {
    display: inline-flex; /* For aligning spinner and text */
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    text-decoration: none;
    border: 1px solid transparent;
  }

  .btn-primary {
    background-color: var(--button-primary-bg, #3498db);
    color: var(--button-primary-text, white);
    border-color: var(--button-primary-bg, #3498db);
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--button-primary-hover-bg, #2980b9);
    border-color: var(--button-primary-hover-bg, #2980b9);
  }

  .btn-secondary {
    background-color: var(--button-secondary-bg, #ecf0f1);
    color: var(--button-secondary-text, #34495e);
    border-color: var(--button-secondary-border, #bdc3c7);
  }
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--button-secondary-hover-bg, #dadedf);
    border-color: var(--button-secondary-hover-border, #abb0b2);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner-sm {
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    margin-right: 0.5em;
  }
  
  @media (max-width: 768px) {
    .modal {
      margin: 1rem;
      max-height: calc(100vh - 2rem);
    }
    
    .table-header, .table-row {
      grid-template-columns: 1fr; /* Stack columns on small screens */
      gap: 0.5rem;
      padding: 0.75rem;
    }
    
    .table-header {
      display: none; /* Hide header row, use labels in data rows */
    }
    
    .table-row {
      display: block; /* Make rows block elements */
      margin-bottom: 1rem;
      border: 1px solid var(--table-border-color, #e1e8ed);
      border-radius: 8px;
    }
    
    .col-name, .col-email, .col-role, .col-created, .col-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--table-row-border-color, #f1f3f4); /* Separator inside stacked row */
    }
    .col-actions {
      border-bottom: none; /* No border for the last item in a stacked row */
    }
    
    /* Commented out to simplify and check for linter error source 
    .col-name::before, 
    .col-email::before, 
    .col-role::before, 
    .col-created::before, 
    .col-actions::before {
      content: attr(aria-label);
      font-weight: 600;
      margin-right: 0.5rem;
    }
    */
    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-direction: column;
    }
    .form-actions .btn {
      width: 100%;
    }
  }
</style> 