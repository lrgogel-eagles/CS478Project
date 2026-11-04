const { HttpError } = require('./errors');

const NUL = '\u0000';

function checkText(text, label, maxLength) {
  if (text.length > maxLength) {
    throw new HttpError(400, `${label} can't be over ${maxLength} characters`);
  }
  if (text.includes(NUL)) {
    throw new HttpError(400, `${label} has a character that isn't allowed`);
  }
  return text;
}

function readText(value, label, maxLength = Infinity) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${label} is required`);
  }
  return checkText(value.trim(), label, maxLength);
}

function readOptionalText(value, label, maxLength) {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `${label} must be text`);
  }
  return checkText(value.trim(), label, maxLength);
}

module.exports = { readText, readOptionalText };
