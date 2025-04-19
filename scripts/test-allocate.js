/* js/scripts/test-allocate.js */

import { EphemeralIds } from '../src/index.js';
// import fs from 'fs';

// const MODEL = 'tiiuae/falcon-7b'; // or any other HF-compatible model
const MODEL = 'deepseek-ai/DeepSeek-V3-Base';

console.log(`Testing ID generation with model: ${MODEL}`);

const ephemeralIds = await EphemeralIds.fromRepo(MODEL);

for (let i = 0; i < Object.keys(ephemeralIds.idMap).length; i++) {
  const id = ephemeralIds.create();
  console.log(`Allocated ID: ${id}`);
}

ephemeralIds.reset();

console.log(ephemeralIds.remap([ '1', '2', '3', '4' ]));
console.log(ephemeralIds.remap([ '1', '2', '3', '4' ]));
console.log(ephemeralIds.remap([ '1', '2' ]));
console.log(ephemeralIds.remap([ '1', '2', '3', '4' ]));
console.log(ephemeralIds.remap([ '1', '2', '3', '4', '5' ]));
console.log(ephemeralIds.remap([ '1', '2' ]));

console.log(`\n...done.`);

/* end of file */
