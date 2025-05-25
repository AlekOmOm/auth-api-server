<script>
  export let stats;
  
  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
  
  function getGrowthIcon(growth) {
    if (growth > 0) return '📈';
    if (growth < 0) return '📉';
    return '➖';
  }
  
  function getGrowthColor(growth) {
    if (growth > 0) return '#27ae60';
    if (growth < 0) return '#e74c3c';
    return '#95a5a6';
  }
</script>

<div class="stats-container">
  <h2 class="stats-title">📊 Dashboard Overview</h2>
  
  <div class="stats-grid">
    <!-- Client Servers -->
    <div class="stat-card primary">
      <div class="stat-icon">🏢</div>
      <div class="stat-content">
        <h3 class="stat-value">{formatNumber(stats.totalClientServers || 0)}</h3>
        <p class="stat-label">Client Servers</p>
        {#if stats.clientServerGrowth !== undefined}
          <div class="stat-growth" style="color: {getGrowthColor(stats.clientServerGrowth)}">
            {getGrowthIcon(stats.clientServerGrowth)} {stats.clientServerGrowth > 0 ? '+' : ''}{stats.clientServerGrowth}%
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Total Users -->
    <div class="stat-card success">
      <div class="stat-icon">👥</div>
      <div class="stat-content">
        <h3 class="stat-value">{formatNumber(stats.totalUsers || 0)}</h3>
        <p class="stat-label">Total Users</p>
        {#if stats.userGrowth !== undefined}
          <div class="stat-growth" style="color: {getGrowthColor(stats.userGrowth)}">
            {getGrowthIcon(stats.userGrowth)} {stats.userGrowth > 0 ? '+' : ''}{stats.userGrowth}%
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Active Sessions -->
    <div class="stat-card info">
      <div class="stat-icon">🔐</div>
      <div class="stat-content">
        <h3 class="stat-value">{formatNumber(stats.activeSessions || 0)}</h3>
        <p class="stat-label">Active Sessions</p>
        {#if stats.sessionGrowth !== undefined}
          <div class="stat-growth" style="color: {getGrowthColor(stats.sessionGrowth)}">
            {getGrowthIcon(stats.sessionGrowth)} {stats.sessionGrowth > 0 ? '+' : ''}{stats.sessionGrowth}%
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Monthly Logins -->
    <div class="stat-card warning">
      <div class="stat-icon">📅</div>
      <div class="stat-content">
        <h3 class="stat-value">{formatNumber(stats.monthlyLogins || 0)}</h3>
        <p class="stat-label">Monthly Logins</p>
        {#if stats.loginGrowth !== undefined}
          <div class="stat-growth" style="color: {getGrowthColor(stats.loginGrowth)}">
            {getGrowthIcon(stats.loginGrowth)} {stats.loginGrowth > 0 ? '+' : ''}{stats.loginGrowth}%
          </div>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Additional Stats Row -->
  {#if stats.topClientServer || stats.lastLogin || stats.systemHealth}
    <div class="additional-stats">
      {#if stats.topClientServer}
        <div class="additional-stat">
          <span class="additional-label">🏆 Top Client Server:</span>
          <span class="additional-value">{stats.topClientServer.name} ({stats.topClientServer.users} users)</span>
        </div>
      {/if}
      
      {#if stats.lastLogin}
        <div class="additional-stat">
          <span class="additional-label">🕒 Last Login:</span>
          <span class="additional-value">{new Date(stats.lastLogin).toLocaleString()}</span>
        </div>
      {/if}
      
      {#if stats.systemHealth}
        <div class="additional-stat">
          <span class="additional-label">💚 System Health:</span>
          <span class="additional-value health-{stats.systemHealth.toLowerCase()}">{stats.systemHealth}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .stats-container {
    margin-bottom: 3rem;
  }
  
  .stats-title {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 2rem;
    font-size: 1.5rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-left: 4px solid;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .stat-card.primary {
    border-left-color: #3498db;
  }
  
  .stat-card.success {
    border-left-color: #27ae60;
  }
  
  .stat-card.info {
    border-left-color: #17a2b8;
  }
  
  .stat-card.warning {
    border-left-color: #f39c12;
  }
  
  .stat-icon {
    font-size: 2.5rem;
    opacity: 0.8;
  }
  
  .stat-content {
    flex: 1;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    color: #2c3e50;
  }
  
  .stat-label {
    margin: 0 0 0.5rem 0;
    color: #7f8c8d;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .stat-growth {
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .additional-stats {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .additional-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .additional-label {
    font-weight: 600;
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .additional-value {
    color: #2c3e50;
    font-weight: 500;
  }
  
  .additional-value.health-excellent {
    color: #27ae60;
    font-weight: 600;
  }
  
  .additional-value.health-good {
    color: #f39c12;
    font-weight: 600;
  }
  
  .additional-value.health-poor {
    color: #e74c3c;
    font-weight: 600;
  }
  
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .stat-card {
      flex-direction: column;
      text-align: center;
    }
    
    .stat-icon {
      font-size: 3rem;
    }
    
    .additional-stats {
      grid-template-columns: 1fr;
    }
    
    .additional-stat {
      text-align: center;
    }
  }
</style> 