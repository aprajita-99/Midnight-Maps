
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis successfully.'));
redisClient.on('reconnecting', () => console.log('Redis reconnecting...'));

(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;