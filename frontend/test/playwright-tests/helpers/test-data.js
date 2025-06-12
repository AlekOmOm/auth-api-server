export const testUsers = {
   owner: {
      name: "Test Owner",
      email: "testowner@example.com",
      password: "TestPassword123!",
      userType: "auth",
   },
   regularUser: {
      name: "Test User",
      email: "testuser@example.com",
      password: "UserPassword123!",
      userType: "user",
   },
   clientUser: {
      name: "Client User",
      email: "clientuser@example.com",
      password: "ClientPassword123!",
      role: "user",
   },
};

export const testClientServers = {
   default: {
      app_name: "Test Client Application",
      authorized_urls: ["http://localhost:4000", "https://testapp.com"],
   },
   updated: {
      app_name: "Updated Test Application",
      authorized_urls: [
         "http://localhost:4000",
         "https://testapp.com",
         "https://updated.com",
      ],
   },
};

export const generateUniqueEmail = (prefix) => {
   const timestamp = Date.now();
   const random = Math.floor(Math.random() * 1000);
   return `${prefix}_${timestamp}_${random}@example.com`;
};

export const generateUniqueAppName = (prefix) => {
   const timestamp = Date.now();
   const random = Math.floor(Math.random() * 1000);
   return `${prefix} ${timestamp}-${random}`;
};
