const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test script for delivery partner notifications
async function testNotificationSystem() {
  try {
    console.log('🚀 Testing Delivery Partner Notification System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const User = require('../models/User');
    const Order = require('../models/Order');

    // Test 1: Check for delivery partners
    console.log('\n📋 Test 1: Checking delivery partners...');
    const deliveryPartners = await User.find({ role: 'delivery_partner' });
    console.log(`Found ${deliveryPartners.length} delivery partners`);

    if (deliveryPartners.length === 0) {
      console.log('⚠️  No delivery partners found. Creating test delivery partner...');
      
      const testPartner = new User({
        name: 'Test Delivery Partner',
        email: 'delivery@test.com',
        password: 'password123',
        role: 'delivery_partner',
        phone: '+91-9876543210',
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '123456',
          coordinates: {
            latitude: 28.6139,
            longitude: 77.2090
          }
        },
        deliveryDetails: {
          vehicleType: 'bike',
          vehicleNumber: 'DL01AB1234',
          licenseNumber: 'DL123456789',
          isAvailable: true,
          isOnline: true,
          currentLocation: {
            latitude: 28.6139,
            longitude: 77.2090
          }
        }
      });
      
      await testPartner.save();
      console.log('✅ Test delivery partner created');
    }

    // Test 2: Check location-based query
    console.log('\n📍 Test 2: Testing location-based queries...');
    const nearbyPartners = await User.find({
      role: 'delivery_partner',
      'deliveryDetails.isOnline': true,
      'deliveryDetails.isAvailable': true,
      'deliveryDetails.currentLocation.latitude': { $exists: true },
      'deliveryDetails.currentLocation.longitude': { $exists: true }
    });
    
    console.log(`Found ${nearbyPartners.length} online delivery partners`);
    nearbyPartners.forEach(partner => {
      console.log(`  - ${partner.name} at (${partner.deliveryDetails.currentLocation.latitude}, ${partner.deliveryDetails.currentLocation.longitude})`);
    });

    // Test 3: Distance calculation
    console.log('\n📏 Test 3: Testing distance calculation...');
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const testOrderLocation = { latitude: 28.6200, longitude: 77.2100 };
    nearbyPartners.forEach(partner => {
      const distance = calculateDistance(
        testOrderLocation.latitude,
        testOrderLocation.longitude,
        partner.deliveryDetails.currentLocation.latitude,
        partner.deliveryDetails.currentLocation.longitude
      );
      console.log(`  - Distance to ${partner.name}: ${distance.toFixed(2)} km`);
    });

    // Test 4: Check for test orders
    console.log('\n📦 Test 4: Checking for available orders...');
    const availableOrders = await Order.find({
      orderStatus: { $in: ['confirmed', 'ready_for_pickup'] },
      assignedDeliveryPartner: { $exists: false }
    }).limit(5);
    
    console.log(`Found ${availableOrders.length} available orders`);

    if (availableOrders.length === 0) {
      console.log('⚠️  No available orders found. The notification system is ready but needs orders to test.');
    }

    // Test 5: API endpoint availability
    console.log('\n🌐 Test 5: Testing API endpoints...');
    const baseURL = process.env.API_BASE_URL || 'http://localhost:5000';
    
    try {
      const healthResponse = await axios.get(`${baseURL}/api/health`);
      console.log('✅ Health endpoint working:', healthResponse.data.message);
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.message);
      console.log('⚠️  Make sure the server is running on port 5000');
    }

    console.log('\n🎉 Notification system test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend: cd frontend && npm start');
    console.log('3. Login as a delivery partner');
    console.log('4. Enable location access in browser');
    console.log('5. Toggle online status');
    console.log('6. Place a test order to see notifications');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testNotificationSystem();
}

module.exports = testNotificationSystem;
