#!/usr/bin/env node
/*
Usage:
  node scripts/createAdmin.js --name "Admin" --email admin@example.com --password "Secret123" --phone 9999999999 --mongo "mongodb://localhost:27017/farmconnect"
*/
const mongoose = require('mongoose');
const User = require('../models/User');

function getArg(flag, def = undefined) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : def;
}

(async () => {
  try {
    const name = getArg('--name');
    const email = getArg('--email');
    const password = getArg('--password');
    const phone = getArg('--phone');
    const mongo = getArg('--mongo', process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');

    if (!name || !email || !password || !phone) {
      console.error('Missing required args: --name --email --password --phone');
      process.exit(1);
    }

    await mongoose.connect(mongo);

    const exists = await User.findOne({ role: 'admin' });
    if (exists) {
      console.log('Admin already exists:', exists.email);
      process.exit(0);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      console.error('User with this email already exists.');
      process.exit(1);
    }

    const admin = new User({ name, email, password, phone, role: 'admin' });
    await admin.save();
    console.log('Admin created:', admin.email);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  }
})();


