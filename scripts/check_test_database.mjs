import { databaseUrlWasExplicit } from './lib/test-database.mjs';

if (!databaseUrlWasExplicit) throw new Error('DATABASE_URL_MUST_MATCH_QWEN_TEST_DATABASE_URL');
console.log('OK: PostgreSQL checks target the explicit loopback test database');
