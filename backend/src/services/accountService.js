// to be implemented
// now lets just return a dummy account
/* account different from user
   - account has subscription
   - account has history
   - account has preferences (dark mode, language, etc.)
   - account has settings
*/

const dummyAccount = {
  subscription: {
    type: "free",
    expiresAt: "2025-01-01",
  },
  history: [],
  preferences: {
    darkMode: false,
    language: "en",
  },
  settings: {
    notifications: true,
  },
};

const getAccount = (req, res, next) => {
  return dummyAccount;
};

const updateAccount = (req, res, next) => {
  return dummyAccount;
};

const deleteAccount = (req, res, next) => {
  return dummyAccount;
};

// ---- export ----

export { getAccount, updateAccount, deleteAccount };
