function toColumnValues(fields, editableColumns, recordName) {
  const columns = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = editableColumns.get(key);
    if (column === undefined) {
      throw new Error(`${recordName} field "${key}" can't be set. Allowed fields: ${[...editableColumns.keys()].join(', ')}.`);
    }
    columns.push(column);
    values.push(value);
  }
  return { columns, values };
}

function buildUpdate(table, id, fields, editableColumns, recordName) {
  const { columns, values } = toColumnValues(fields, editableColumns, recordName);
  if (columns.length === 0) {
    return undefined;
  }
  const assignments = columns.map((column, index) => `${column} = $${index + 2}`);
  return {
    text: `UPDATE ${table} SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
    values: [id, ...values],
  };
}

module.exports = { toColumnValues, buildUpdate };
