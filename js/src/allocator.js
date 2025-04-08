/* js/src/allocator.js */

import { generateIdMap } from './generator.js';

export class EphemeralIds {
  /**
   * Create a new EphemeralIds instance.
   * @param {Object<string, string[]>} idMap - Map of identifier starters to available suffixes.
   */
  constructor(idMap) {
    this.idMap = idMap;
    this.reset();

    if (this.numAvailable === 0) {
        throw new Error('No available identifiers.');
    }

    // Length of the starter tokens
    this.starterLength = this.starters[0].length;
  }

  reset() {
    // Create an array of all the available starter tokens
    this.starters = [...Object.keys(this.idMap)];
    this.numAvailable = this.starters.length;

    // Set of active identifiers
    this.activeIds = new Set();
  }

  /**
   * Allocates a new ephemeral identifier. This reserves the starter token to this identifier.
   * @returns {string}
   */
  create() {
    // If there are no available identifiers, throw an error
    if (this.numAvailable === 0) {
      throw new Error('No available identifiers.');
    }

    // Random number between 0 and numAvailable - 1
    const randomIndex = Math.floor(Math.random() * this.numAvailable);
    const starter = this.starters[randomIndex];
    const suffixes = this.idMap[starter];
    const suffixIndex = Math.floor(Math.random() * suffixes.length);
    const suffix = suffixes[suffixIndex];
    const id = `${starter}${suffix}`;
    
    // Swap the selected starter to the end of the available entries,
    // and reduce the number of available identifiers
    this.starters[randomIndex] = this.starters[this.numAvailable - 1];
    // this.starters[this.numAvailable - 1] = starter; // Just discard
    this.numAvailable--;

    // Add the identifier to the active set
    this.activeIds.add(id);

    return id;
  }

  /**
   * Releases a previously allocated identifier.
   * @param {string} id
   */
  release(id) {
    // Check if it's actually an active id, and remove it from the set
    if (!this.activeIds.has(id)) {
      return; // Silent skip
    }
    this.activeIds.delete(id);

    // Extract the starter token from the identifier
    // and add it back to the available starters
    const starter = id.slice(0, this.starterLength);
    this.starters[this.numAvailable] = starter;
    this.numAvailable++;
  }

  /**
   * Async factory method to create an EphemeralIds instance from a model repo.
   * @param {string} modelRepo - Hugging Face model repo
   * @param {Object} [options]
   * @param {string} [options.prefix]
   * @param {boolean} [options.long]
   * @param {boolean} [options.cache]
   * @returns {Promise<EphemeralIds>}
   */
  static async fromRepo(modelRepo, options = {}) {
    const idMap = await generateIdMap(modelRepo, options);
    return new EphemeralIds(idMap);
  }
}

/* end of file */
