/**
 * Delay execution for a random duration between minMs and maxMs
 * Requirement: 1-3 seconds between individual listings
 * 
 * @param {number} minMs - Minimum delay in milliseconds (default: 1000)
 * @param {number} maxMs - Maximum delay in milliseconds (default: 3000)
 * @returns {Promise<number>} Returns actual milliseconds waited
 */
export async function randomDelay(minMs = 1000, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}
