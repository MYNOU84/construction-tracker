const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const url = process.env.DATABASE_URL || '';
const provider = (url.startsWith('postgresql') || url.startsWith('postgres')) ? 'postgresql' : 'sqlite';

schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${provider}"`);
fs.writeFileSync(schemaPath, schema);

console.log(`Prisma provider set to: ${provider}`);
