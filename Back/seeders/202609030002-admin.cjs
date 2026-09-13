'use strict';

require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const firstName = (process.env.ADMIN_FIRST_NAME || 'Administrador').trim();
    const lastName = (process.env.ADMIN_LAST_NAME || 'Principal').trim();
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!email || password.length < 8) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (minimum 8 characters) are required.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { replacements: { email } },
    );
    const values = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: '0000000',
      birth_date: '2000-01-01',
      reading_preference: null,
      newsletter_opt_in: false,
      terms_accepted_at: new Date(),
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
      updated_at: new Date(),
    };

    if (rows.length > 0) {
      await queryInterface.bulkUpdate('users', values, { id: rows[0].id });
    } else {
      await queryInterface.bulkInsert('users', [{ ...values, created_at: new Date() }]);
    }
  },

  async down(queryInterface) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (email) await queryInterface.bulkDelete('users', { email });
  },
};
