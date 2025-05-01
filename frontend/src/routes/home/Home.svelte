<script>
  import { onMount } from "svelte";
  import { Router, Link } from "svelte-routing";
  import authApi from "../../services/authApi";

  import osho from "../../assets/osho-4o.png";

  let users = $state([]);

/**
 * @description populate the users list
 */
  async function populate() {
    const usersData = (await authApi.testApi()).data.users;
    
    usersData.forEach(user => {
      users.push(user.name);
    }); 
  }

</script>

<h1>Home</h1>

<div class="osho-pic">
  <img src={osho} alt="osho" style="width: 15vh; height: 15vh;"/>
</div>

<h2> Hi there !</h2>

<div class="users-container">
   <div class="users-header">
      
      <h3>Users:</h3>
      <button onclick={populate}>See other users</button>
   </div>
   

   <div class="users-list">
      <ul>
         {#each users as user}
            <li>{user}</li>
         {/each}
      </ul>
   </div>
</div>

<style>
  button {
   font-size: 0.5rem;
   padding: 0.5rem;
   border-radius: 1rem;
   border: 1px solid #ccc;
   background-color: #ccc;
   color: #000;
  }

  .osho-pic {
      padding: 2rem;
  }

  .users-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .users-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
</style>
