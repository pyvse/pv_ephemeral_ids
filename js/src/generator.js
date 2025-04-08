/* generator.js */

import { AutoTokenizer } from '@huggingface/transformers';

const DEBUG_LOG = true;

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
  { prefix: ' ', suffix: '-' },
];

const altContexts = [
  { prefix: ' @', suffix: '' },
  { prefix: ' #', suffix: '' },
  { prefix: ' "', suffix: '"' },
  { prefix: " '", suffix: "'" },
  { prefix: " (", suffix: ")" },
  { prefix: " <", suffix: ">" },
  { prefix: " [", suffix: "]" },
  { prefix: " {", suffix: "}" },
  { prefix: " -", suffix: "-" },
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

function containsTriple(tokens, triple) {
  for (let i = 0; i <= tokens.length - 3; i++) {
    if (
      tokens[i] === triple[0] &&
      tokens[i + 1] === triple[1] &&
      tokens[i + 2] === triple[2]
    ) {
      return true;
    }
  }
  return false;
}

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

  // Reference tokens for base and alt prefix contexts
  const baseTokens = tokenize(tokenizer, prefix ? `${baseText} ${prefix}` : baseText);
  const altTokens = tokenize(tokenizer, `${baseText}${altContexts[0].prefix}${prefix}`);

  // Check that alt context begins the same as base (sanity)
  const partialAltTokens = altTokens.slice(0, prefix ? (baseTokens.length - 1) : baseTokens.length);
  if (!partialAltTokens.every((t, i) => t === baseTokens[i])) {
    // May fail if prefix is more than one token, or if the tokenizer is weird
    throw new Error(`Base and alt contexts do not match: ${baseText}${altContexts[0].prefix}${prefix}, ${baseTokens}, ${altTokens}, ${partialAltTokens}, prefix might be more than one token, or tokenizer is weird`);
  }

  const result = {};

  // Try all two-letter starters
  for (let au of alphaUpper) {
    for (let al of alphaLower) {
      const starter = au + al;
      if (banned[starter]) continue;

      const testBase = tokenize(tokenizer, `${baseText} ${prefix}${starter}`);
      const testAlt = tokenize(tokenizer, `${baseText}${altContexts[0].prefix}${prefix}${starter}`);

      // Validate structure and prefix tokens
      if (
        testBase.length !== baseTokens.length + 1 ||
        !testBase.slice(0, baseTokens.length).every((t, i) => t === baseTokens[i])
      ) {
        if (DEBUG_LOG) console.log(`Base starter mismatch for ${starter}: tokens ${testBase}`);
        continue;
      }

      if (
        testAlt.length !== altTokens.length + 1 ||
        !testAlt.slice(0, altTokens.length).every((t, i) => t === altTokens[i])
      ) {
        if (DEBUG_LOG) console.log(`Alt starter mismatch for ${starter}: tokens ${testAlt}`);
        continue;
      }

      const baseStarterToken = testBase.at(-1);
      const altStarterToken = testAlt.at(-1);

      // If a prefix is used, the starter token should be identical across contexts
      if (prefix && baseStarterToken !== altStarterToken) {
        if (DEBUG_LOG) {
          console.log(`Token mismatch for ${starter}: base ${baseStarterToken}, alt ${altStarterToken}`);
        }
        continue;
      }

      const suffixes = [];

      for (let digit of numeric) {
        for (let lower of alphaLower) {
          const fullId = starter + digit + lower;

          const fullBase = tokenize(tokenizer, `${baseText} ${prefix}${fullId}`);
          const fullAlt = tokenize(tokenizer, `${baseText}${altContexts[0].prefix}${prefix}${fullId}`);

          const basePrefixLen = testBase.length;
          const altPrefixLen = testAlt.length;

          if (
            fullBase.length !== basePrefixLen + 2 ||
            fullAlt.length !== altPrefixLen + 2 ||
            !fullBase.slice(0, basePrefixLen).every((t, i) => t === testBase[i]) ||
            !fullAlt.slice(0, altPrefixLen).every((t, i) => t === testAlt[i])
          ) {
            if (DEBUG_LOG) {
              console.log(`Tokenization mismatch for ${fullId}: base ${fullBase}, alt ${fullAlt}`);
            }
            continue;
          }

          // Extract the token triples correctly, after the known prefix
          const tripleBase = fullBase.slice(basePrefixLen - 1, basePrefixLen + 3);
          const tripleAlt = fullAlt.slice(altPrefixLen - 1, altPrefixLen + 3);

          if (tripleBase.length !== 3 || tripleAlt.length !== 3) {
            if (DEBUG_LOG) {
              console.log(`Incomplete triple for ${fullId}: base ${tripleBase}, alt ${tripleAlt}`);
            }
            continue;
          }

          if (
            tripleBase[0] !== baseStarterToken ||
            tripleAlt[0] !== altStarterToken
          ) {
            if (DEBUG_LOG) {
              console.log(`Starter token mismatch for ${fullId}: base ${tripleBase[0]}, alt ${tripleAlt[0]}`);
            }
            continue;
          }

          let valid = true;

          // Validate against all base contexts
          for (const ctx of baseContexts) {
            const contextTokens = tokenize(tokenizer, `${baseText}${ctx.prefix}${prefix}${fullId}${ctx.suffix}`);
            if (!containsTriple(contextTokens, tripleBase)) {
              valid = false;
              if (DEBUG_LOG) {
                console.log(`Base context mismatch for ${fullId}: ${ctx.prefix}${prefix}${fullId}${ctx.suffix}`);
              }
              break;
            }
          }

          // Validate against all alt contexts
          if (valid) {
            for (const ctx of altContexts) {
              const contextTokens = tokenize(tokenizer, `${baseText}${ctx.prefix}${prefix}${fullId}${ctx.suffix}`);
              if (!containsTriple(contextTokens, tripleAlt)) {
                valid = false;
                if (DEBUG_LOG) {
                  console.log(`Alt context mismatch for ${fullId}: ${ctx.prefix}${prefix}${fullId}${ctx.suffix}`);
                }
                break;
              }
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
