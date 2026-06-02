const {
  testPostgresConnection,
  listPostgresSchemas,
  listPostgresTables,
  listPostgresColumns,
  listPostgresIndexes,
  listPostgresFullMetadata,
  listPostgresSchemaMetadata,
  executePostgresQuery,
  validatePostgresSql,
} = require("./postgres.cjs");

const testHandlers = {
  postgres: testPostgresConnection,
};

const schemaHandlers = {
  postgres: listPostgresSchemas,
};

const tableHandlers = {
  postgres: listPostgresTables,
};

const columnHandlers = {
  postgres: listPostgresColumns,
};

const indexHandlers = {
  postgres: listPostgresIndexes,
};

const queryHandlers = {
  postgres: executePostgresQuery,
};

const fullMetadataHandlers = {
  postgres: listPostgresFullMetadata,
};

const schemaMetadataHandlers = {
  postgres: listPostgresSchemaMetadata,
};

const validateSqlHandlers = {
  postgres: validatePostgresSql,
};

module.exports = {
  testHandlers,
  schemaHandlers,
  tableHandlers,
  columnHandlers,
  indexHandlers,
  queryHandlers,
  fullMetadataHandlers,
  schemaMetadataHandlers,
  validateSqlHandlers,
};
