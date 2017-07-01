module.exports = {
  // XXX this will probably breal at some point when the
  // rich-text-editor changes.
  has_text: (text) => text && text != "<p><br></p>"
};
