require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const DispenseHistory = require('./models/dispense_histories');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fuel-dispenser';

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');
    console.log(`✓ Database: ${mongoose.connection.name}\n`);

    // Clear existing mock data
    console.log('🗑️  Clearing all existing data...');
    await User.deleteMany({});
    await DispenseHistory.deleteMany({});
    console.log('✓ Cleared users collection');
    console.log('✓ Cleared dispense_histories collection\n');

    console.log('═══════════════════════════════════════');
    console.log('✅ Database cleared successfully!');
    console.log('═══════════════════════════════════════');
    console.log('\n📝 Database is now empty and ready for real users.');
    console.log('💡 Users will be created automatically when they scan their RFID cards.');
    console.log('💡 Add users via Admin Panel at http://localhost:3000/admin\n');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();
