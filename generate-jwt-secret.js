const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('base64');
console.log('\n✅ JWT_SECRET của bạn:');
console.log(secret);
console.log('\n📋 Copy chuỗi trên và dán vào Vercel Environment Variables với tên: JWT_SECRET\n');
