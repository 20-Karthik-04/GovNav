const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gov-notifications');
    console.log('Connected to MongoDB');

    // Delete existing admin if exists (to fix isAdmin property)
    const existingAdmin = await User.findOne({ email: 'admin@govnav.com' });
    if (existingAdmin) {
      await User.deleteOne({ email: 'admin@govnav.com' });
      console.log('Existing admin user deleted');
    }

    // Create admin user with correct properties
    const adminUser = new User({
      email: 'admin@govnav.com',
      password: 'admin123', // This will be hashed automatically
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isAdmin: true  // This is crucial for frontend routing
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@govnav.com');
    console.log('Password: admin123');
    console.log('isAdmin:', adminUser.isAdmin);
    console.log('role:', adminUser.role);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createAdminUser();
