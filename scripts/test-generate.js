/* js/scripts/test-generate.js */

import { generateIdMap } from '../src/generator.js';
// import fs from 'fs';

// const MODEL = 'tiiuae/falcon-7b'; // or any other HF-compatible model
const MODEL = 'deepseek-ai/DeepSeek-V3-Base';

console.log(`Testing ID generation with model: ${MODEL}`);

const result = await generateIdMap(MODEL, { prefix: '', long: false, cache: false });

// Print the number of valid starters and a preview
const starters = Object.keys(result);
console.log(`Found ${starters.length} valid identifier starters.\n`);

starters.slice(0, 5).forEach(key => {
console.log(`${key}: [${result[key].slice(0, 5).join(', ')}]`);
});

// Dump into text file
//const outputFile = 'id_map.txt';
//fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

console.log(`\n...done.`);

/* end of file */
