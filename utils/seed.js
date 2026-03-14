require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

/**
 * Seed script: Creates an initial admin user.
 * Run once: node utils/seed.js
 */
const seed = async () => {
  await connectDB();

  try {
    const existingAdmin = await User.findOne({ email: 'abhi5@gmail.com' });
    if (existingAdmin) {
      console.log('ℹ️   Admin already exists. Skipping seed.');
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Abhishek Nimmagadda',
      email: 'abhi@gmail.com',
      phone: '9000000000',
      password: 'Abhi@1724',
      role: 'admin',
      status: 'active',
    });

    console.log(`✅  Admin user created: ${admin.email}`);
    console.log(`🔑  Password: Abhi@1724`);
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
