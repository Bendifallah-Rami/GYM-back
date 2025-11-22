const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT;
console.log('PORT:', PORT);

// Serve static files from `public` directory if present
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Hello from GYM-back Express server');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
