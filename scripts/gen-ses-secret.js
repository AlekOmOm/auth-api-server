import fs, { copyFile, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// consts
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = path.join(ROOT, '.env') 

// IIFE
const SECRET_KEY_VALUE = crypto.randomBytes(32).toString('hex')

const SECRET_KEY_LINE = `SECRET_KEY=${SECRET_KEY_VALUE}`

writeFileSync(ENV_FILE, SECRET_KEY_LINE, { flag: 'a' }, (err) => {
   if (err) {
      console.error(`Error writing to file: ${err}`);
      process.exit(1);
   }
})
