// Test script for Class Booking System
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test user credentials (you should have these in your system)
const testAdmin = {
  email: 'admin@example.com',
  password: 'admin123'
};

const testUser = {
  email: 'user@example.com', 
  password: 'user123'
};

let adminToken = '';
let userToken = '';

// Helper function to login and get token
async function login(credentials) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
    return response.data.data.token;
  } catch (error) {
    console.log('Login error:', error.response?.data || error.message);
    return null;
  }
}

// Test creating a class with new price field
async function testCreateClass(token) {
  try {
    const classData = {
      name: 'Test Yoga Class with Price',
      description: 'Premium yoga class with pricing',
      capacity: 5,
      duration_minutes: 60,
      schedule_time: '09:00',
      schedule_days: ['Monday', 'Wednesday', 'Friday'],
      price: 25.50
    };

    const response = await axios.post(`${BASE_URL}/classes`, classData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Class Created:', {
      id: response.data.data.class.id,
      name: response.data.data.class.name,
      price: response.data.data.class.price,
      status: response.data.data.class.status,
      capacity: response.data.data.class.capacity,
      registered_users: response.data.data.class.registered_users,
      available_spots: response.data.data.class.available_spots
    });

    return response.data.data.class.id;
  } catch (error) {
    console.log('❌ Create Class Error:', error.response?.data || error.message);
    return null;
  }
}

// Test joining a class
async function testJoinClass(token, classId) {
  try {
    const joinData = {
      booking_date: '2024-12-01',
      notes: 'Looking forward to the class!'
    };

    const response = await axios.post(`${BASE_URL}/classes/${classId}/join`, joinData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Joined Class:', {
      message: response.data.message,
      status: response.data.data.class.status,
      available_spots: response.data.data.available_spots,
      participant: response.data.data.participant.name
    });

    return true;
  } catch (error) {
    console.log('❌ Join Class Error:', error.response?.data || error.message);
    return false;
  }
}

// Test getting class details
async function testGetClassDetails(token, classId) {
  try {
    const response = await axios.get(`${BASE_URL}/classes/${classId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const cls = response.data.data.class;
    const registeredUsers = cls.registered_users || [];

    console.log('✅ Class Details:', {
      name: cls.name,
      price: cls.price,
      status: cls.status,
      capacity: cls.capacity,
      registered_count: registeredUsers.length,
      registered_users: registeredUsers.map(u => ({ name: u.name, registered_at: u.registered_at }))
    });

    return true;
  } catch (error) {
    console.log('❌ Get Class Details Error:', error.response?.data || error.message);
    return false;
  }
}

// Test leaving a class
async function testLeaveClass(token, classId) {
  try {
    const leaveData = {
      reason: 'Schedule conflict'
    };

    const response = await axios.post(`${BASE_URL}/classes/${classId}/leave`, leaveData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Left Class:', {
      message: response.data.message,
      status: response.data.data.class.status,
      available_spots: response.data.data.available_spots
    });

    return true;
  } catch (error) {
    console.log('❌ Leave Class Error:', error.response?.data || error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Class Booking System Tests...\n');

  // Login as admin
  console.log('1. Logging in as admin...');
  adminToken = await login(testAdmin);
  if (!adminToken) {
    console.log('❌ Failed to login as admin. Exiting tests.');
    return;
  }
  console.log('✅ Admin logged in successfully\n');

  // Login as user
  console.log('2. Logging in as user...');
  userToken = await login(testUser);
  if (!userToken) {
    console.log('❌ Failed to login as user. Exiting tests.');
    return;
  }
  console.log('✅ User logged in successfully\n');

  // Test creating class with price
  console.log('3. Creating class with price...');
  const classId = await testCreateClass(adminToken);
  if (!classId) {
    console.log('❌ Failed to create class. Exiting tests.');
    return;
  }
  console.log('');

  // Test joining class
  console.log('4. User joining class...');
  const joinSuccess = await testJoinClass(userToken, classId);
  if (!joinSuccess) {
    console.log('❌ Failed to join class. Continuing tests.');
  }
  console.log('');

  // Test getting class details
  console.log('5. Getting class details...');
  await testGetClassDetails(adminToken, classId);
  console.log('');

  // Test leaving class
  console.log('6. User leaving class...');
  await testLeaveClass(userToken, classId);
  console.log('');

  // Test getting class details after leaving
  console.log('7. Getting class details after leaving...');
  await testGetClassDetails(adminToken, classId);

  console.log('\n🎉 Tests completed!');
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});