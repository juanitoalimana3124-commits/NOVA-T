process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://bc64admin:Bc64Pass123@cluster0.nmp1igk.mongodb.net/bc64?retryWrites=true&w=majority';

async function run() {
  console.log('Intentando conectar a MongoDB Atlas...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    family: 4
  });
  try {
    await client.connect();
    console.log('✅ Conexión exitosa!');
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Ping exitoso!');
    await client.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

run();
