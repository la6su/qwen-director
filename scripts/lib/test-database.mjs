const value = process.env.QWEN_TEST_DATABASE_URL;
if (!value) throw new Error('QWEN_TEST_DATABASE_URL_REQUIRED');
export const databaseUrlWasExplicit = Boolean(process.env.DATABASE_URL);

let url;
try { url = new URL(value); } catch { throw new Error('QWEN_TEST_DATABASE_URL_INVALID'); }
const databaseName = decodeURIComponent(url.pathname.slice(1));
if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new Error('QWEN_TEST_DATABASE_URL_INVALID');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('QWEN_TEST_DATABASE_MUST_BE_LOOPBACK');
if (!/_test$/i.test(databaseName)) throw new Error('QWEN_TEST_DATABASE_NAME_MUST_END_IN_TEST');
if (process.env.DATABASE_URL && process.env.DATABASE_URL !== value) throw new Error('DATABASE_URL_MUST_MATCH_QWEN_TEST_DATABASE_URL');

// Keep API storage and direct smoke queries on the same isolated database.
process.env.DATABASE_URL = value;
