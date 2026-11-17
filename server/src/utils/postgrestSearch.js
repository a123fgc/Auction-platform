function escapeLikePattern(value) {
  return String(value).replace(/[\\%_]/g, (character) => `\\${character}`);
}

function quoteFilterValue(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function containsPattern(value) {
  return `%${escapeLikePattern(value)}%`;
}

module.exports = { escapeLikePattern, quoteFilterValue, containsPattern };
