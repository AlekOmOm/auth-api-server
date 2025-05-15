import fs, { copyFile } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// consts
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env');
const ENV_TEMPLATE_FILE = path.join(ROOT, '.env.template');

// logic
if (fs.existsSync(ENV_FILE)) {
   process.exit(0);
}

if (fs.existsSync(ENV_TEMPLATE_FILE)) {
      try {
         fs.copyFileSync(ENV_TEMPLATE_FILE, ENV_FILE);
      } catch (error) {
         console.error(`Error copying file: ${error}`);
         process.exit(1);
      }
   
} else {
   console.error(`File ${ENV_TEMPLATE_FILE} does not exist`);
   process.exit(1);
}

