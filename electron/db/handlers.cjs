const {
  testPostgresConnection,
  listPostgresSchemas,
  listPostgresTables,
  listPostgresColumns,
  listPostgresIndexes,
  listPostgresFullMetadata,
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
  validateSqlHandlers,
};
