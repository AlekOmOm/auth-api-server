// utils/functional.js - Pure FP Utilities

// --- COMPOSITION FUNCTIONS ---

export const pipe =
   (...fns) =>
   (value) =>
      fns.reduce((acc, fn) => fn(acc), value);

export const compose =
   (...fns) =>
   (value) =>
      fns.reduceRight((acc, fn) => fn(acc), value);

// --- CURRYING ---

export const curry =
   (fn) =>
   (...args) =>
      args.length >= fn.length
         ? fn(...args)
         : (...nextArgs) => curry(fn)(...args, ...nextArgs);

// --- VALIDATION FUNCTIONS ---

export const validate = curry((validator, data) => {
   const errors = validator(data);
   return {
      isValid: errors.length === 0,
      errors,
      data,
   };
});

export const isRequired = (field) => (data) =>
   !data[field] ? [`${field} is required`] : [];

export const isValidEmail = (field) => (data) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return data[field] && !emailRegex.test(data[field])
      ? [`${field} must be a valid email`]
      : [];
};

export const isValidUrl = (field) => (data) => {
   try {
      new URL(data[field]);
      return [];
   } catch {
      return [`${field} must be a valid URL`];
   }
};

// --- ARRAY FUNCTIONS ---

export const mapOver = curry((fn, arr) => arr.map(fn));
export const filterBy = curry((predicate, arr) => arr.filter(predicate));
export const reduceWith = curry((reducer, initial, arr) =>
   arr.reduce(reducer, initial)
);

// --- OBJECT FUNCTIONS ---

export const pick = curry((keys, obj) => {
   const result = {};
   for (const key of keys) {
      if (key in obj) {
         result[key] = obj[key];
      }
   }
   return result;
});

export const omit = curry((keys, obj) => {
   const omitSet = new Set(keys);
   return Object.fromEntries(
      Object.entries(obj).filter(([key]) => !omitSet.has(key))
   );
});

export const mapValues = curry((fn, obj) =>
   Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, fn(value)])
   )
);
