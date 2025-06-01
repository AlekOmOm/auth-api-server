// backend/src/models/session.js

import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import BaseModel from "./base/BaseModel.js";
import { pipe, compose, curry } from "../utils/functional.js";

/**
 * Session Model - Functional + OOP Hybrid
 * Combines OOP structure with functional programming principles
 */
class Session extends BaseModel {
   constructor(
      userId,
      id = null,
      sessionId = null,
      ipAddress = null,
      userAgent = null,
      createdAt = null,
      expiresAt = null
   ) {
      super();

      // Immutable properties after creation
      Object.assign(this, {
         userId,
         id: id || uuidv4(),
         sessionId: sessionId || uuidv4(),
         ipAddress,
         userAgent,
         createdAt: createdAt || new Date(),
         expiresAt: expiresAt || Session.getExpiryTimestamp(),
      });

      // Runtime data (not persisted)
      this.user = null;
      this.schema = null;

      // Validate on construction
      this.validate();
   }

   /**
    * Validate session instance
    */
   validate() {
      this.clearErrors();

      // Required fields
      this.validateRequired(["userId", "sessionId"]);

      // UUID validation
      if (this.userId && !Session.isValidUUID(this.userId)) {
         this.addError("Invalid userId format", "userId");
      }

      // Check if expired
      if (this.isExpired()) {
         this.addError("Session is expired", "expiresAt");
      }

      return this;
   }

   // --- PURE FACTORY FUNCTIONS ---

   /**
    * Create session for login - Pure factory function
    */
   static forLogin = (userId, ipAddress = null, userAgent = null) =>
      new Session(userId, null, null, ipAddress, userAgent);

   /**
    * Create from database row - Pure transformation
    */
   static fromDb = (dbRow) => {
      if (!dbRow) return null;

      return new Session(
         dbRow.user_id,
         dbRow.id,
         dbRow.session_id,
         dbRow.ip_address,
         dbRow.user_agent,
         dbRow.created_at,
         dbRow.expires_at
      );
   };

   /**
    * Create from Express session - Pure transformation
    */
   static fromExpressSession = (expressSession) => {
      if (!expressSession?.sessionId) return null;

      const session = new Session(
         expressSession.userId,
         null,
         expressSession.sessionId
      );

      session.schema = expressSession.schema;
      return session;
   };

   // --- IMMUTABLE TRANSFORMATION METHODS ---

   /**
    * Return new session instance with user attached
    * @param {User} user - User to attach
    * @returns {Session} New session instance
    */
   withUser = (user) => {
      const newSession = Session.fromDb({
         user_id: this.userId,
         id: this.id,
         session_id: this.sessionId,
         ip_address: this.ipAddress,
         user_agent: this.userAgent,
         created_at: this.createdAt,
         expires_at: this.expiresAt,
      });
      newSession.user = user;
      newSession.schema = this.schema;
      return newSession;
   };

   /**
    * Return new session instance with schema attached
    * @param {string} schema - Schema to attach
    * @returns {Session} New session instance
    */
   withSchema = (schema) => {
      const newSession = Session.fromDb({
         user_id: this.userId,
         id: this.id,
         session_id: this.sessionId,
         ip_address: this.ipAddress,
         user_agent: this.userAgent,
         created_at: this.createdAt,
         expires_at: this.expiresAt,
      });
      newSession.user = this.user;
      newSession.schema = schema;
      return newSession;
   };

   /**
    * Return new session with extended expiry
    * @param {number} hours - Hours to extend
    * @returns {Session} New session instance
    */
   withExtendedExpiry = (hours = 24) => {
      const newSession = Session.fromDb({
         user_id: this.userId,
         id: this.id,
         session_id: this.sessionId,
         ip_address: this.ipAddress,
         user_agent: this.userAgent,
         created_at: this.createdAt,
         expires_at: Session.getExpiryTimestamp(hours),
      });
      newSession.user = this.user;
      newSession.schema = this.schema;
      return newSession;
   };

   // --- PURE DATA TRANSFORMERS ---

   /**
    * Convert to database object - Pure transformation
    */
   toDatabaseObject = () => ({
      id: this.id,
      user_id: this.userId,
      session_id: this.sessionId,
      ip_address: this.ipAddress,
      user_agent: this.userAgent,
      expires_at: this.expiresAt,
   });

   /**
    * Convert to database array - Pure transformation
    */
   toDatabaseArray = () => [
      this.id,
      this.userId,
      this.sessionId,
      this.ipAddress,
      this.userAgent,
      this.expiresAt,
   ];

   /**
    * Convert to API response - Pure transformation
    */
   toApiResponse = (authorizedUrls = []) => ({
      id: this.user?.id,
      name: this.user?.name,
      role: this.user?.role,
      authorized_urls: authorizedUrls,
      expires_at: this.expiresAt,
   });

   /**
    * Convert to Express session - Pure transformation
    */
   toExpressSession = () => ({
      userId: this.userId,
      schema: this.schema,
      sessionId: this.sessionId,
      role: this.user?.role,
   });

   /**
    * Static factory method to create Session from request body or generic data object
    * Allows flexible parameter shapes depending on the service layer call.
    * @param {Object} requestBody - Should contain at least a userId or sessionId.
    * @param {string|null} userIdFromParam - Optional userId passed separately.
    * @returns {Session}
    */
   static fromRequestBody = (requestBody = {}, userIdFromParam = null) => {
      if (requestBody instanceof Session) return requestBody;

      // If first argument is a primitive (string) treat it as sessionId for lookup
      if (typeof requestBody === "string") {
         return new Session(null, null, requestBody);
      }

      const {
         userId,
         user_id,
         sessionId,
         session_id,
         ipAddress,
         ip_address,
         userAgent,
         user_agent,
         expiresAt,
         expires_at,
         id,
      } = requestBody || {};

      const resolvedUserId = userId || user_id || userIdFromParam;
      const resolvedSessionId = sessionId || session_id || null;
      const resolvedIp = ipAddress || ip_address || null;
      const resolvedUa = userAgent || user_agent || null;
      const resolvedExpires = expiresAt || expires_at || null;

      return new Session(
         resolvedUserId,
         id || null,
         resolvedSessionId,
         resolvedIp,
         resolvedUa,
         null,
         resolvedExpires
      );
   };

   // --- PURE PREDICATES ---

   /**
    * Check if session is expired - Pure predicate
    */
   isExpired = () => {
      if (!this.expiresAt) return false;
      return new Date(this.expiresAt) < new Date();
   };

   /**
    * Check if session has user - Pure predicate
    */
   hasUser = () => this.user !== null;

   /**
    * Check if session has schema - Pure predicate
    */
   hasSchema = () => this.schema !== null;

   /**
    * Check if session is complete - Pure predicate
    */
   isComplete = () => this.hasUser() && this.hasSchema() && !this.isExpired();
}

// --- FUNCTIONAL OPERATIONS FOR SESSION ---

/**
 * Functional operations that work with Session instances
 */
export const SessionOperations = {
   // for repo pipelines
   toDB: (session) => session.toDatabaseObject(),
   fromDB: (dbRow) => Session.fromDb(dbRow),
   fromRequestBody: (...args) => Session.fromRequestBody(...args),

   // Curried enrichment functions
   enrichWithUser: curry((user, session) => session.withUser(user)),
   enrichWithSchema: curry((schema, session) => session.withSchema(schema)),
   extendExpiry: curry((hours, session) => session.withExtendedExpiry(hours)),

   // Transformation pipelines
   prepareForDatabase: (session) => session.toDatabaseObject(),
   prepareForApi: curry((authorizedUrls, session) =>
      session.toApiResponse(authorizedUrls)
   ),
   prepareForExpress: (session) => session.toExpressSession(),

   // Predicates
   isValid: (session) => session.isValid() && !session.isExpired(),
   isExpired: (session) => session.isExpired(),
   hasRequiredData: (session) => session.hasUser() && session.hasSchema(),

   // Composite operations
   createAndEnrich: pipe(Session.forLogin, (session) =>
      session.isValid() ? session : null
   ),

   // Filter operations
   filterExpired: (sessions) =>
      sessions.filter((session) => !session.isExpired()),
   filterValid: (sessions) =>
      sessions.filter((session) => SessionOperations.isValid(session)),

   // Sorting operations
   sortByCreatedAt: (sessions) =>
      [...sessions].sort(
         (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),

   sortByExpiresAt: (sessions) =>
      [...sessions].sort(
         (a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)
      ),
};

export default Session;
