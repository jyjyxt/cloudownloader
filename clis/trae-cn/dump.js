import { makeDumpCommand } from '../_shared/desktop-commands.js';

export const dumpCommand = makeDumpCommand('trae-cn', {
  example: 'CLOUDL_CDP_ENDPOINT=http://127.0.0.1:39240 CLOUDL_CDP_TARGET=talk cloudl trae-cn dump -f json',
});
