function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function safeSubject(value = '') {
  return String(value).replace(/[\r\n]+/g, ' ').slice(0, 200);
}

module.exports = { escapeHtml, safeSubject };
