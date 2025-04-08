/* generator.js */

import { AutoTokenizer } from '@huggingface/transformers';

function tokenize(tokenizer, text) {
  // Wrapper to simplify tokenization
  const encoded = tokenizer(text, { add_special_tokens: false });
  const tokens = Array.from(encoded.input_ids.data, x => Number(x));
  return tokens;
}

// Test routine
const baseText = "Test Test";
const baseContexts = [ // Context with leading whitespace
  { prefix: ' ', suffix: '' },
  { prefix: ': ', suffix: '' },
  { prefix: ': ', suffix: '.' },
  { prefix: ': ', suffix: ',' },
  { prefix: ': ', suffix: '!' },
];
const altContexts = [ // Contexts without leading whitespace
  { prefix: ' @', suffix: '' },
  { prefix: ' #', suffix: '' },
  { prefix: ' "', suffix: '"' },
  { prefix: " '", suffix: "'" },
];

// Banned identifiers
const banned = {
  "Aa": true, "Bb": true, "Cc": true, "Dd": true, "Ee": true, "Ff": true, "Gg": true,
  "Hh": true, "Ii": true, "Jj": true, "Kk": true, "Ll": true, "Mm": true, "Nn": true,
  "Oo": true, "Pp": true, "Qq": true, "Rr": true, "Ss": true, "Tt": true, "Uu": true,
  "Vv": true, "Ww": true, "Xx": true, "Yy": true, "Zz": true,
  "Am": true, "An": true, "As": true, "At": true, "Be": true, "By": true, "Do": true,
  "Go": true, "He": true, "If": true, "In": true, "Is": true, "It": true, "Me": true,
  "My": true, "No": true, "Of": true, "On": true, "Or": true, "So": true, "To": true,
  "Up": true, "Us": true, "We": true,
};

const alphaUpper = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G',
  'H', 'I', /* etc TODO */
];

const alphaLower = [
  'a', 'b', 'c', 'd', 'e', /* etc TODO */
];

const numeric = [
  '0', '1', '2', /* etc TODO */
]

/**
 * Generates a map of valid identifier starters to randomized suffixes.
 *
 * @param {string} modelRepo - The Hugging Face model repo name (e.g., "meta-llama/Llama-3.2-3B").
 * @param {Object} [options]
 * @param {string} [options.prefix] - Optional string prefix to prepend to identifiers.
 * @returns {Promise<Object<string, string[]>>} - A Promise that resolves to an object like: { "Aa": ["0a", ...], ... }
 */
export async function generateIdMap(modelRepo, { prefix = '' } = {}) {
  // Load tokenizer from Hugging Face repo
  const tokenizer = await AutoTokenizer.from_pretrained(modelRepo);

  const baseTokens = tokenize(tokenizer, prefix.length ? (baseText + ' ' + prefix) : baseText); // All test outputs should start with these tokens
  const altTokensCheck = tokenize(tokenizer, baseText + altContexts[0].prefix + prefix); // Should start with baseTokens

  // Check altTokensCheck and throw in case of mismatch
  // TODO

  for (let au = 0; au < alphaUpper.length; au++) {
    for (let al = 0; al < alphaLower.length; al++) {
      const identifierPrefix = alphaUpper[au] + alphaLower[al];
      
      const baseTokenRef = tokenize(tokenizer, baseText + ' ' + prefix + identifierPrefix); // Add whitespace
      const altTokenRef = tokenize(tokenizer, baseText + altContexts[0].prefix + prefix + identifierPrefix); // Use prefix

      // Ensure baseTokenRef starts with baseTokens and continues with one token only,
      // same for altTokenRef, otherwise skip this prefix
      // TODO

      const baseToken = baseTokenRef[baseTokenRef.length - 1];
      const altToken = altTokenRef[altTokenRef.length - 1];
      const validSuffixes = [];
      if (!banned[identifierPrefix]) {
        for (let sn = 0; sn < numeric.length; sn++) {
          for (let sa = 0; sa < alphaLower.length; sa++) {
            const identifierSuffix = sn + sa;
            const identifer = identifierPrefix + identifierSuffix;
            
            const baseTokenFullRef = tokenize(tokenizer, baseText + ' ' + prefix + identifier);
            const altTokenFullRef = tokenize(tokenizer, baseText + altContexts[0].prefix + prefix + identifier);

            // Ensure baseTokenFullRef starts with baseTokenRef, and continues with two tokens only,
            // same for altTokenFullRef, otherwise skip this suffix
            // TODO

            // Extract the three tokens from baseTokenFullRef
            // and the three from altTokenFullRef
            // TODO

            // Loop through all baseContexts test cases (surrounding the identifier with prefix and suffix)
            // Ensure we can find the token triple, otherwise skip this whole suffix
            // TODO

            // Loop through all altContexts test cases, same thing
            // TODO
          }
        }
      }
    }
  }
}

/* end of file */
