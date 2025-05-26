async function loginRedirect(response, returnUrlFromSession) {
  console.log("🔄 [LOGIN REDIRECT] Starting redirect logic");
  const responseData = response.data;
  console.log("🔄 [LOGIN REDIRECT] Response received:", responseData);

  // Priority:
  // 1. poolMetadata.target_page from login response (should be set by backend for validated client app returns)
  // 2. returnUrl passed to login function (and stored in session)
  // 3. Fallback to /home or /owner for owners

  let finalReturnUrl = null;

  if (responseData?.poolMetadata?.target_page) {
    finalReturnUrl = responseData.poolMetadata.target_page;
    console.log(`🔄 [LOGIN REDIRECT] Using target_page from poolMetadata: ${finalReturnUrl}`);
  } else if (returnUrlFromSession) {
    finalReturnUrl = returnUrlFromSession;
    console.log(`🔄 [LOGIN REDIRECT] Using returnUrlFromSession: ${finalReturnUrl}`);
  } else {
    // Fallback if no specific target_page or session returnUrl
    if (responseData?.poolMetadata?.user_role === 'owner') {
      finalReturnUrl = '/owner';
      console.log(`🔄 [LOGIN REDIRECT] Fallback for owner: ${finalReturnUrl}`);
    } else {
      finalReturnUrl = '/home';
      console.log(`🔄 [LOGIN REDIRECT] Fallback for user/default: ${finalReturnUrl}`);
    }
  }

  console.log("🔄 [LOGIN REDIRECT] Current Browser URL:", window.location.href);
  console.log("🔄 [LOGIN REDIRECT] Final return URL to use:", finalReturnUrl);
  
  sessionStorage.removeItem('return_url'); // Clean up

  if (finalReturnUrl) {
    if (finalReturnUrl.startsWith('http')) {
      console.log(`🔄 [LOGIN REDIRECT] External URL detected, redirecting browser to: ${finalReturnUrl}`);
      window.location.href = finalReturnUrl;
    } else {
      console.log(`🔄 [LOGIN REDIRECT] Internal path detected, navigating to: ${finalReturnUrl}`);
      navigate(finalReturnUrl, { replace: true });
    }
  } else {
    console.error("🔄 [LOGIN REDIRECT] No valid return URL could be determined. Staying on page or default Svelte behavior.");
    // Default to /home if truly nothing else, though authStore update might trigger ProtectedRoute
    navigate('/home', { replace: true }); 
  }
} 