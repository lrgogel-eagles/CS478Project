const app = require('./app');
const { readJwtSecret } = require('./auth/tokens');

readJwtSecret();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Campaign Keeper API listening on port ${port}`);
});
