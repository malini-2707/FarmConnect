const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Trichy coordinates
const TRICHY_COORDINATES = {
  latitude: 10.7905,
  longitude: 78.7047
};

async function setupTrichyTestScenario() {
  try {
    console.log('🏙️  Setting up Trichy location test scenario...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const User = require('../models/User');
    const Product = require('../models/Product');
    const Order = require('../models/Order');

    // Step 1: Create/Update delivery partner in Trichy
    console.log('\n👨‍🚚 Step 1: Setting up delivery partner in Trichy...');
    
    let deliveryPartner = await User.findOne({ 
      email: 'delivery.trichy@farmconnect.com',
      role: 'delivery_partner' 
    });

    if (!deliveryPartner) {
      deliveryPartner = new User({
        name: 'Ravi Kumar',
        email: 'delivery.trichy@farmconnect.com',
        password: 'password123',
        role: 'delivery_partner',
        phone: '+91-9876543210',
        address: {
          street: 'Anna Nagar',
          city: 'Trichy',
          state: 'Tamil Nadu',
          zipCode: '620018',
          coordinates: TRICHY_COORDINATES
        },
        deliveryDetails: {
          vehicleType: 'bike',
          vehicleNumber: 'TN45AB1234',
          licenseNumber: 'TN123456789',
          isAvailable: true,
          isOnline: true,
          currentLocation: TRICHY_COORDINATES
        },
        isVerified: true
      });
      await deliveryPartner.save();
      console.log('✅ Created delivery partner: Ravi Kumar in Trichy');
    } else {
      // Update location to ensure they're online and available
      deliveryPartner.deliveryDetails.isOnline = true;
      deliveryPartner.deliveryDetails.isAvailable = true;
      deliveryPartner.deliveryDetails.currentLocation = TRICHY_COORDINATES;
      await deliveryPartner.save();
      console.log('✅ Updated existing delivery partner: Ravi Kumar in Trichy');
    }

    // Step 2: Create/Update customer in Trichy
    console.log('\n👤 Step 2: Setting up customer in Trichy...');
    
    let customer = await User.findOne({ 
      email: 'customer.trichy@farmconnect.com',
      role: 'customer' 
    });

    if (!customer) {
      customer = new User({
        name: 'Priya Sharma',
        email: 'customer.trichy@farmconnect.com',
        password: 'password123',
        role: 'customer',
        phone: '+91-9876543211',
        address: {
          street: 'Cantonment',
          city: 'Trichy',
          state: 'Tamil Nadu',
          zipCode: '620001',
          coordinates: {
            latitude: TRICHY_COORDINATES.latitude + 0.01, // Slightly different location
            longitude: TRICHY_COORDINATES.longitude + 0.01
          }
        },
        isVerified: true
      });
      await customer.save();
      console.log('✅ Created customer: Priya Sharma in Trichy');
    } else {
      console.log('✅ Customer already exists: Priya Sharma in Trichy');
    }

    // Step 3: Create/Update farmer in Trichy
    console.log('\n👨‍🌾 Step 3: Setting up farmer in Trichy...');
    
    let farmer = await User.findOne({ 
      email: 'farmer.trichy@farmconnect.com',
      role: 'farmer' 
    });

    if (!farmer) {
      farmer = new User({
        name: 'Murugan',
        email: 'farmer.trichy@farmconnect.com',
        password: 'password123',
        role: 'farmer',
        phone: '+91-9876543212',
        address: {
          street: 'Srirangam',
          city: 'Trichy',
          state: 'Tamil Nadu',
          zipCode: '620006',
          coordinates: {
            latitude: TRICHY_COORDINATES.latitude - 0.01,
            longitude: TRICHY_COORDINATES.longitude - 0.01
          }
        },
        farmDetails: {
          farmName: 'Murugan Organic Farm',
          farmType: 'organic',
          isVerified: true
        },
        isVerified: true
      });
      await farmer.save();
      console.log('✅ Created farmer: Murugan in Trichy');
    } else {
      console.log('✅ Farmer already exists: Murugan in Trichy');
    }

    // Step 4: Create test products
    console.log('\n🥬 Step 4: Setting up test products...');
    
    let product = await Product.findOne({ name: 'Fresh Tomatoes - Trichy' });
    
    if (!product) {
      product = new Product({
        name: 'Fresh Tomatoes - Trichy',
        description: 'Fresh organic tomatoes from Trichy farms',
        price: 40,
        unit: 'kg',
        category: 'vegetables',
        seller: farmer._id,
        quantity: 100,
        images: ['tomato.jpg'],
        isActive: true
      });
      await product.save();
      console.log('✅ Created product: Fresh Tomatoes');
    } else {
      console.log('✅ Product already exists: Fresh Tomatoes');
    }

    // Step 5: Calculate distance between customer and delivery partner
    console.log('\n📏 Step 5: Calculating distances...');
    
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const distance = calculateDistance(
      customer.address.coordinates.latitude,
      customer.address.coordinates.longitude,
      deliveryPartner.deliveryDetails.currentLocation.latitude,
      deliveryPartner.deliveryDetails.currentLocation.longitude
    );

    console.log(`📍 Customer location: ${customer.address.coordinates.latitude}, ${customer.address.coordinates.longitude}`);
    console.log(`🚚 Delivery partner location: ${deliveryPartner.deliveryDetails.currentLocation.latitude}, ${deliveryPartner.deliveryDetails.currentLocation.longitude}`);
    console.log(`📏 Distance between them: ${distance.toFixed(2)} km`);

    // Step 6: Create test order
    console.log('\n📦 Step 6: Creating test order...');
    
    const testOrder = {
      products: [{
        product: product._id,
        quantity: 2,
        unit: 'kg',
        price: 40
      }],
      deliveryAddress: {
        street: customer.address.street,
        city: customer.address.city,
        state: customer.address.state,
        zipCode: customer.address.zipCode,
        coordinates: customer.address.coordinates
      },
      deliveryInstructions: 'Please call before delivery',
      paymentMethod: 'cod'
    };

    console.log('📋 Test order details:');
    console.log(`   Customer: ${customer.name}`);
    console.log(`   Product: ${product.name} x ${testOrder.products[0].quantity} ${testOrder.products[0].unit}`);
    console.log(`   Delivery: ${testOrder.deliveryAddress.street}, ${testOrder.deliveryAddress.city}`);
    console.log(`   Payment: ${testOrder.paymentMethod.toUpperCase()}`);

    console.log('\n🎯 Test scenario ready!');
    console.log('\n📝 Next steps to test the notification:');
    console.log('1. Start the server: cd backend && node server.js');
    console.log('2. Start the frontend: cd frontend && npm start');
    console.log('3. Login as delivery partner: delivery.trichy@farmconnect.com / password123');
    console.log('4. Go to delivery dashboard and toggle "Online" status');
    console.log('5. In another browser/tab, login as customer: customer.trichy@farmconnect.com / password123');
    console.log('6. Place an order for Fresh Tomatoes');
    console.log('7. The delivery partner should receive a notification immediately!');

    console.log('\n🔍 Test credentials:');
    console.log('Delivery Partner: delivery.trichy@farmconnect.com / password123');
    console.log('Customer: customer.trichy@farmconnect.com / password123');
    console.log('Farmer: farmer.trichy@farmconnect.com / password123');

    return {
      customer,
      deliveryPartner,
      farmer,
      product,
      testOrder,
      distance
    };

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Function to simulate order placement via API
async function simulateOrderPlacement(testData) {
  try {
    console.log('\n🚀 Simulating order placement...');
    
    const baseURL = process.env.API_BASE_URL || 'http://localhost:5001';
    
    // First login as customer to get token
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'customer.trichy@farmconnect.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Customer logged in successfully');
    
    // Place order
    const orderResponse = await axios.post(`${baseURL}/api/orders`, testData.testOrder, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order placed successfully!');
    console.log(`📦 Order ID: ${orderResponse.data.order.id}`);
    console.log(`🔢 Order Number: ${orderResponse.data.order.orderNumber}`);
    console.log('🔔 Notification should be sent to delivery partner now!');
    
    return orderResponse.data.order;
    
  } catch (error) {
    console.error('❌ Order simulation failed:', error.response?.data || error.message);
  }
}

// Run the setup
if (require.main === module) {
  setupTrichyTestScenario()
    .then((testData) => {
      console.log('\n🎉 Trichy test scenario setup completed successfully!');
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupTrichyTestScenario, simulateOrderPlacement };
