/* generator.js */

import { AutoTokenizer } from '@huggingface/transformers';

/**
 * Simple wrapper to extract token IDs without special tokens.
 */
function tokenize(tokenizer, text) {
  const encoded = tokenizer(text, { add_special_tokens: false });
  return Array.from(encoded.input_ids.data, x => Number(x));
}

// Base sentence for token alignment sanity checks
const baseText = "Test Test";

// Test contexts with/without leading whitespace and punctuation
const baseContexts = [
  { prefix: ' ', suffix: '' },
  { prefix: ': ', suffix: '' },
  { prefix: ': ', suffix: '.' },
  { prefix: ': ', suffix: ',' },
  { prefix: ': ', suffix: '!' },
];

const altContexts = [
  { prefix: ' @', suffix: '' },
  { prefix: ' #', suffix: '' },
  { prefix: ' "', suffix: '"' },
  { prefix: " '", suffix: "'" },
];

// Two-letter English words and pronoun-like starters to avoid
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

// Alphabet and numeric components
const alphaUpper = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z
const alphaLower = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)); // a-z
const numeric = Array.from({ length: 10 }, (_, i) => i.toString()); // 0-9

/**
 * Generates a map of valid identifier starters to randomized suffixes.
 *
 * @param {string} modelRepo - Hugging Face tokenizer repo name (e.g. "meta-llama/Llama-3.2-3B").
 * @param {Object} [options]
 * @param {string} [options.prefix] - Optional prefix to prepend to identifiers.
 * @returns {Promise<Object<string, string[]>>} Map of identifier prefix -> list of suffixes.
 */
export async function generateIdMap(modelRepo, { prefix = '' } = {}) {
  const tokenizer = await AutoTokenizer.from_pretrained(modelRepo);

  // Reference tokens for alignment
  const baseTokens = tokenize(tokenizer, prefix ? `${baseText} ${prefix}` : baseText);
  const altTokensCheck = tokenize(tokenizer, `${baseText}${altContexts[0].prefix}${prefix}`);

  // Ensure that alt context still starts with base tokens
  if (!altTokensCheck.slice(0, baseTokens.length).every((t, i) => t === baseTokens[i])) {
    throw new Error("Alt context token mismatch with base token prefix.");
  }

  const result = {};

  // Iterate over all possible two-letter starters (Aa, Ab, ..., Zz)
  for (let au of alphaUpper) {
    for (let al of alphaLower) {
      const starter = au + al;
      if (banned[starter]) continue;

      // Tokenize prefix + starter in both base and alt punctuation contexts
      const testBase = tokenize(tokenizer, `${baseText} ${prefix}${starter}`);
      const testAlt = tokenize(tokenizer, `${baseText}${altContexts[0].prefix}${prefix}${starter}`);

      // Ensure both tokenize to exactly 1 token after base, and match base
      if (
        testBase.length !== baseTokens.length + 1 ||
        testAlt.length !== baseTokens.length + 1 ||
        !testBase.slice(0, baseTokens.length).every((t, i) => t === baseTokens[i]) ||
        !testAlt.slice(0, baseTokens.length).every((t, i) => t === baseTokens[i])
      ) {
        continue;
      }

      const baseStarterToken = testBase.at(-1);
      const altStarterToken = testAlt.at(-1);

      // If we have a prefix, then these should be identical
      if (prefix.length && baseStarterToken !== altStarterToken) {
        continue;
      }

      const suffixes = [];

      // Test all digit+lowercase combos (e.g. 0a, 1b, ..., 9z)
      for (let digit of numeric) {
        for (let lower of alphaLower) {
          const fullId = starter + digit + lower;

          const fullBase = tokenize(tokenizer, `${baseText} ${prefix}${fullId}`);
          const fullAlt = tokenize(tokenizer, `${baseText}${altContexts[0].prefix}${prefix}${fullId}`);

          const expectedLen = baseTokens.length + 2;
          if (
            fullBase.length !== expectedLen ||
            fullAlt.length !== expectedLen ||
            !fullBase.slice(0, baseTokens.length).every((t, i) => t === baseTokens[i]) ||
            !fullAlt.slice(0, baseTokens.length).every((t, i) => t === baseTokens[i])
          ) {
            continue;
          }

          // Extract and verify token triplets
          const tripleBase = fullBase.slice(-3);
          const tripleAlt = fullAlt.slice(-3);

          // The starter tokens in both contexts must match previously observed tokens
          if (
            tripleBase[0] !== baseStarterToken ||
            tripleAlt[0] !== altStarterToken
          ) {
            continue;
          }

          // Verify stability across all test contexts
          let valid = true;
          for (const ctx of [...baseContexts, ...altContexts]) {
            const contextTokens = tokenize(tokenizer, `${baseText}${ctx.prefix}${prefix}${fullId}${ctx.suffix}`);
            const triplet = contextTokens.slice(-3);
            if (
              triplet.length !== 3 ||
              triplet[0] !== baseStarterToken ||
              triplet[1] !== tripleBase[1] ||
              triplet[2] !== tripleBase[2]
            ) {
              valid = false;
              break;
            }
          }

          if (valid) {
            suffixes.push(digit + lower);
          }
        }
      }

      if (suffixes.length > 0) {
        result[prefix + starter] = suffixes;
      }
    }
  }

  return result;
}

/* end of file */
