const fs = require('fs');
const path = require('path');

const packsPath = path.join(__dirname, 'public', 'emception', 'packs.mjs');
let code = fs.readFileSync(packsPath, 'utf8');

// Replace standard ES imports with static URL string declarations
code = code.replace(/import (\w+) from ["']\.\/packages\/(.+?)\.pack\.br["'];/g, 'const $1 = "/emception/packages/$2.pack.br";');

fs.writeFileSync(packsPath, code);
console.log("Patched packs.mjs");
