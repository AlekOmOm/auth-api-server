export function isAuthenticated(req, res, next) {
  return checkSession(req, res, next);
}

/**
 * @description middleware to check if user is not admin
 * @precondition
 * - isAuthenticated middleware has been called prior to this
 *
 *   @param {*} req
 *   @param {*} res
 *   @param {*} next
 *   @returns
 *   - success: next() is called
 *   - failure: returns 401 with 'Only for current user. Data protected' message
 */
export function isNotAdmin(req, res, next) {
  if (req.session.role === "admin") {
    return res
      .status(401)
      .json({ message: "Only for current user. Data protected" });
  }

  next();
}

/**
 * @description middleware to check if user has a specific role
 * @param {string} role - the role to check for
 * @returns {function} - the middleware function
 */
export function hasRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.session.role !== role && req.session.role !== "admin") {
      return res.status(401).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

// ---------------------
async function checkSession(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  next();
}
