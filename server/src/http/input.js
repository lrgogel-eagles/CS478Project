const { HttpError } = require('./errors');

const NUL = '\u0000';
const MAX_ID = 2147483647;

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

function readWholeNumber(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${label} must be a whole number from ${min} to ${max}`);
  }
  return value;
}

function readBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new HttpError(400, `${label} must be true or false`);
  }
  return value;
}

function readDate(value, label) {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : undefined;
  if (!date || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${label} must be a real date written like 2026-11-06`);
  }
  return value;
}

function readId(text) {
  if (typeof text !== 'string' || !/^\d+$/.test(text)) {
    return undefined;
  }
  const id = Number(text);
  return id >= 1 && id <= MAX_ID ? id : undefined;
}

function readFields(body, readers, recordName) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, `Send the ${recordName} as a JSON object`);
  }
  const fields = {};
  for (const [key, value] of Object.entries(body)) {
    const read = readers.get(key);
    if (read === undefined) {
      throw new HttpError(400, `${key} isn't a ${recordName} field. Use ${[...readers.keys()].join(', ')}`);
    }
    fields[key] = read(value);
  }
  return fields;
}

module.exports = { readText, readOptionalText, readWholeNumber, readBoolean, readDate, readId, readFields };
