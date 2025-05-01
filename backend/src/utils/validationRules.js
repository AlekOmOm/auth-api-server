export const NAME_RULES = {
  INPUT_TYPE: "string",
  MIN_LENGTH: 3,
  MAX_LENGTH: 50,
  REGEX: /^[a-zA-Z]+$/,
};

export const EMAIL_RULES = {
  INPUT_TYPE: "string",
  MIN_LENGTH: 5,
  MAX_LENGTH: 50,
  REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export const PASSWORD_RULES = {
  INPUT_TYPE: "string",
  MIN_LENGTH: 8,
  MAX_LENGTH: 100,
  UPPER_CASE: 1,
  LOWER_CASE: 1,
  DIGIT: 1,
};

export const FIELD_REQUIRED = (field) => {
  return `${field} is required`;
};

export const ERROR_MESSAGES = {
  NAME: {
    INVALID_NAME: "Name must be a string",
    MAX_LENGTH_ERROR: "Name cannot exceed 50 characters",
  },
  EMAIL: {
    INVALID_EMAIL: "Email must be a valid email address",
    DUPLICATE_EMAIL: "Email already in use",
  },
  PASSWORD: {
    WEAK_PASSWORD: "Password is too weak",
    PASSWORD_MISMATCH: "Password mismatch",
  },
  USER: {
    USER_NOT_FOUND: "User not found",
    INVALID_CREDENTIALS: "Invalid credentials",
    REQUIRED_FIELDS: "Required fields are missing",
    FIELD_REQUIRED: FIELD_REQUIRED,
  },
  SESSION: {
    INVALID_SESSION: "Invalid session",
    SESSION_EXPIRED: "Session expired",
    SESSION_DESTROYED: "Session destroyed",
    SESSION_CREATED: "Session created",
    SESSION_DESTROYED: "Session destroyed",
  },
};
