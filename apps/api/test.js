const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/users/register', {
      email: 'test@example.com',
      password: 'pass',
      name: 'test'
    });
    console.log('Success:', res.data);
  } catch (e) {
    console.log('Error:', e.response?.status, e.response?.data);
  }
}

test();