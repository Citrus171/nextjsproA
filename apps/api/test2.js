const bcrypt = require('bcrypt');

async function test() {
  try {
    const hashed = await bcrypt.hash('pass', 10);
    console.log('Hashed:', hashed);
  } catch (e) {
    console.log('Error:', e);
  }
}

test();