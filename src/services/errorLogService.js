import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ERROR_LOG_MESSAGE } from '../constants/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../../log');
const LOG_DIR_FRONTEND = path.join(__dirname, '../../log_front_end');

export async function errorlog(platform, module, error, functionality) {
  try {
    const direction = platform !== ERROR_LOG_MESSAGE.PLAT_FORM_NAME ? LOG_DIR_FRONTEND : LOG_DIR;
    if (!fs.existsSync(direction)) {
      fs.mkdirSync(direction, { recursive: true });
    }
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const fileName = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const format = `\n${timeStr} Platform : ${platform}, Module : ${module}, Error : ${error}, Functionality : ${functionality}`;

    fs.appendFileSync(path.join(direction, `${fileName}_log.txt`), format);
    return true;
  } catch (err) {
    console.error('Error logging failed:', err);
    return false;
  }
}

