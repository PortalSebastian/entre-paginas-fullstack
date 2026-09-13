'use strict';

const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const environmentFile = resolve('.env.test');
if (!existsSync(environmentFile)) {
  console.error('Create Back/.env.test from .env.test.example before running database integration tests.');
  process.exit(1);
}

dotenv.config({ path: environmentFile, quiet: true });
if (!process.env.DB_NAME?.endsWith('_test')) {
  console.error('DB_NAME in .env.test must end in _test.');
  process.exit(1);
}

const childEnvironment = { ...process.env, NODE_ENV: 'test' };
const sequelizeCli = resolve('node_modules', 'sequelize-cli', 'lib', 'sequelize');

function run(args, { tolerate } = {}) {
  const capture = Boolean(tolerate);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: capture ? 'utf8' : undefined,
  });
  if (result.error) throw result.error;
  const output = capture ? `${result.stdout ?? ''}${result.stderr ?? ''}` : '';
  // El seeder ya aplicado no es un fallo: la base de pruebas conserva su
  // estado entre corridas y el suite debe poder repetirse sin recrearla.
  const tolerated = capture && result.status !== 0 && tolerate.test(output);
  if (capture) {
    if (tolerated) console.log('Seed data already applied, skipping.');
    else process.stdout.write(output);
  }
  if (result.status === 0 || tolerated) return;
  process.exit(result.status ?? 1);
}

run([
  sequelizeCli,
  'db:migrate',
  '--env', 'test',
  '--config', 'config/sequelize-cli.cjs',
  '--migrations-path', 'migrations',
]);
run([
  sequelizeCli,
  'db:seed',
  '--seed', '202609030001-public-data.cjs',
  '--env', 'test',
  '--config', 'config/sequelize-cli.cjs',
  '--seeders-path', 'seeders',
], { tolerate: /Migration is not pending/ });
run(['--test', 'tests/integration/mysql-api.test.js']);
