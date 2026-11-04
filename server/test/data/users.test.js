const { useTestDatabase } = require('../helpers/database');
const { createUser, findLoginByEmail, findUserById } = require('../../src/data/users');
const { DuplicateEmailError } = require('../../src/data/errors');

useTestDatabase();

const newUser = { email: 'Mira@Example.com', passwordHash: 'hash', displayName: 'Mira' };

test('finds a login by email in any letter case', async () => {
  const user = await createUser(newUser);
  const login = await findLoginByEmail('  mira@example.COM ');
  expect(login.user).toEqual(user);
  expect(login.passwordHash).toBe('hash');
});

test('user records never include the password hash', async () => {
  const user = await createUser(newUser);
  expect(user).not.toHaveProperty('passwordHash');
  expect(await findUserById(user.id)).not.toHaveProperty('passwordHash');
});

test('rejects a second account with the same email', async () => {
  await createUser(newUser);
  await expect(createUser({ ...newUser, email: 'mira@example.com' })).rejects.toBeInstanceOf(DuplicateEmailError);
});

test('returns undefined for an unknown email', async () => {
  expect(await findLoginByEmail('nobody@example.com')).toBeUndefined();
});

test('rejects a display name longer than 40 characters', async () => {
  await expect(createUser({ ...newUser, displayName: 'x'.repeat(41) })).rejects.toMatchObject({ code: '23514' });
});
