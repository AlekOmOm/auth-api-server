<!-- src/components/ErrorMessage.svelte -->
<script>
   export let errors = [];
 </script>
 
 {#if errors.length > 0}
   <div class="error-message-container">
     {#each errors as error (error)}
       <p class="error-message">{error}</p>
     {/each}
   </div>
 {/if}
 
 <style>
   .error-message-container {
     display: flex;
     flex-direction: column;
     max-width: 30vw;
     gap: 0.5rem;
     margin-bottom: 1rem;
     align-items: center;
   }

   .error-message {
     color: rgb(175, 97, 97);
     font-size: 0.8rem;
     font-weight: bold;
     text-align: center;
     margin-bottom: 1rem;
     /* box with grey background, text color black and rounded corners */

     padding: 1rem;
     border-radius: 0.5rem;
     padding: 1rem;
     border-radius: 0.5rem;
     background-color: rgb(24, 23, 23);
   }
 </style>