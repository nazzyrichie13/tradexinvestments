const express = require('express');
const app = express();

const routes = [
  '/api/users/:id',
  '/some/route/:',                // invalid — colon with no param name
  'https://git.new/pathToRegexpError', // invalid — full URL, not a path
];

routes.forEach(route => {
  try {
    console.log('Registering route:', route);
    app.get(route, (req, res) => res.send('ok'));
  } catch (err) {
    console.error('Error registering route:', route, err.message);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test app listening on port ${PORT}`);
});
