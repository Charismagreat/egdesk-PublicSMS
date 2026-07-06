const { getTableSchema } = require('../egdesk-helpers');

getTableSchema('crm_partner_contacts')
  .then(schema => console.log('Schema:', JSON.stringify(schema, null, 2)))
  .catch(console.error);
