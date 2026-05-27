const { RouterOSClient } = require('mikro-routeros');

async function testConnection() {
  console.log("Connecting...");
  const client = new RouterOSClient('103.110.112.10', 5153, 5000); // 5 sec timeout
  
  try {
    await client.connect();
    console.log("Connected to API!");
    
    // We don't have the plaintext password, so we just check if it throws during connect (it shouldn't throw an API error until login, unless protocol fails).
    // Actually, `connect()` just establishes TCP. We can try a bad login.
    await client.login('shakil#2025', 'dummy');
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    try {
      await client.close();
    } catch(e) {}
  }
}

testConnection();
