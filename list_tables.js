const { listTables } = require('./egdesk-helpers');
listTables().then(console.log).catch(console.error);
