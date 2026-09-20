const { MongoClient } = require('mongodb');

// URL encode the password since it contains '@'
const username = 'himanshudu255_db_user';
const rawPassword = 'Himanshu@123';
const encodedPassword = encodeURIComponent(rawPassword);

const uri = `mongodb+srv://${username}:${encodedPassword}@cluster0.7pf5pvc.mongodb.net/onewaytaxibihar?retryWrites=true&w=majority&appName=Cluster0`;

console.log('Connecting to MongoDB Atlas at cluster0.7pf5pvc.mongodb.net...');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

async function run() {
  try {
    await client.connect();
    console.log('✅ SUCCESS: Successfully connected to MongoDB Atlas!');
    const db = client.db('onewaytaxibihar');
    const collections = await db.listCollections().toArray();
    console.log('Collections in onewaytaxibihar:', collections.map(c => c.name));
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  } finally {
    await client.close();
  }
}

run();
