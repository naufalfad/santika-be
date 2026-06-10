async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('🚀 Starting Users Module Integration Tests...\n');

  // --- STEP 1: LOGIN TO RETRIEVE TOKENS ---
  console.log('--- Step 1: Logging in Pastor and Super Admin ---');
  let pastorToken = '';
  let adminToken = '';
  let adminUserId = '';

  try {
    // Pastor Login
    const pastorRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pastor@santika.org', password: 'password123' }),
    });
    const pastorData = await pastorRes.json();
    pastorToken = pastorData.data.tokens.accessToken;

    // Admin Login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@santika.org', password: 'password123' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.tokens.accessToken;
    adminUserId = adminData.data.user.id;

    console.log('✅ Tokens retrieved successfully');
  } catch (err) {
    console.error('❌ Failed to retrieve tokens:', err);
    return;
  }
  console.log('\n');

  // --- STEP 2: TEST RBAC PROTECTION ---
  console.log('--- Step 2: Querying /users with PASTOR token (Should fail with 403) ---');
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${pastorToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 403 ? '✅ Success: Access denied correctly' : '❌ Failed: Pastor should not have access');
  } catch (err) {
    console.error('Error in Step 2:', err);
  }
  console.log('\n');

  // --- STEP 3: QUERY WITH SUPER ADMIN ---
  console.log('--- Step 3: Querying /users with SUPER_ADMIN token (Should succeed) ---');
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Users returned: ${data.data.users.length}`);
    console.log(res.status === 200 ? '✅ Success: Users queried successfully' : '❌ Failed');
  } catch (err) {
    console.error('Error in Step 3:', err);
  }
  console.log('\n');

  // --- STEP 4: CREATE A NEW USER ---
  console.log('--- Step 4: Registering a new Ketua Komisi user ---');
  let newUserId = '';
  const timestamp = Date.now();
  const newEmail = `test_komisi_${timestamp}@santika.org`;
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        email: newEmail,
        name: 'Test Ketua Komisi',
        role: 'KETUA_KOMISI',
        password: 'password123'
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    if (res.status === 201) {
      newUserId = data.data.user.id;
      console.log('✅ Success: New user registered');
    } else {
      console.log('❌ Failed to register new user');
    }
  } catch (err) {
    console.error('Error in Step 4:', err);
  }
  console.log('\n');

  // --- STEP 5: ATTEMPT TO DUPLICATE EMAIL REGISTRATION ---
  console.log('--- Step 5: Registering duplicate email (Should fail with 400) ---');
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        email: newEmail,
        name: 'Duplicate User',
        role: 'SEKRETARIAT',
        password: 'password123'
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 400 ? '✅ Success: Duplicated email blocked' : '❌ Failed: Allowed duplicate email');
  } catch (err) {
    console.error('Error in Step 5:', err);
  }
  console.log('\n');

  // --- STEP 6: QUERY WITH FILTERS ---
  console.log(`--- Step 6: Querying users with filter parameters (search="test_komisi_${timestamp}" & role="KETUA_KOMISI") ---`);
  try {
    const res = await fetch(`${BASE_URL}/users?search=test_komisi_${timestamp}&role=KETUA_KOMISI`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    const found = data.data.users.find(u => u.id === newUserId);
    console.log(found ? '✅ Success: Filter matches and returns the new user' : '❌ Failed: New user not found under filters');
  } catch (err) {
    console.error('Error in Step 6:', err);
  }
  console.log('\n');

  // --- STEP 7: TOGGLE ACCOUNT STATUS (DEACTIVATE) ---
  console.log(`--- Step 7: Deactivating the new user (id: ${newUserId}) ---`);
  try {
    const res = await fetch(`${BASE_URL}/users/${newUserId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isActive: false }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 200 && data.data.user.isActive === false ? '✅ Success: User account deactivated' : '❌ Failed');
  } catch (err) {
    console.error('Error in Step 7:', err);
  }
  console.log('\n');

  // --- STEP 8: PREVENT SELF-DEACTIVATION ---
  console.log(`--- Step 8: Attempting self-deactivation of logged-in Super Admin (id: ${adminUserId}) (Should fail) ---`);
  try {
    const res = await fetch(`${BASE_URL}/users/${adminUserId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isActive: false }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 400 ? '✅ Success: Self-deactivation blocked' : '❌ Failed: Super Admin deactivated themselves');
  } catch (err) {
    console.error('Error in Step 8:', err);
  }
  console.log('\n');

  // --- STEP 9: QUERY DEACTIVATED USERS ---
  console.log('--- Step 9: Querying for inactive users only (isActive=false) ---');
  try {
    const res = await fetch(`${BASE_URL}/users?isActive=false`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Inactive users count: ${data.data.users.length}`);
    const found = data.data.users.find(u => u.id === newUserId);
    console.log(found ? '✅ Success: Retrieved inactive user list correctly' : '❌ Failed');
  } catch (err) {
    console.error('Error in Step 9:', err);
  }
  console.log('\n');

  console.log('🏁 Users Module Integration Tests Completed.');
}

runTests();
