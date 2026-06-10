require('dotenv').config();
const { prisma } = require('./dist/config/database');

async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('🚀 Starting Kas Masuk Module Integration Tests...\n');

  let pastorToken = '';
  let bendaharaToken = '';
  let sekretariatToken = '';

  // --- STEP 1: LOGIN TO RETRIEVE TOKENS ---
  console.log('--- Step 1: Logging in Users ---');
  try {
    // Pastor Login
    const pastorRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pastor@santika.org', password: 'password123' }),
    });
    const pastorData = await pastorRes.json();
    pastorToken = pastorData.data.tokens.accessToken;

    // Bendahara Login
    const bendaharaRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bendahara@santika.org', password: 'password123' }),
    });
    const bendaharaData = await bendaharaRes.json();
    bendaharaToken = bendaharaData.data.tokens.accessToken;

    // Sekretariat Login
    const sekretariatRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sekretariat@santika.org', password: 'password123' }),
    });
    const sekretariatData = await sekretariatRes.json();
    sekretariatToken = sekretariatData.data.tokens.accessToken;

    console.log('✅ Tokens retrieved successfully');
  } catch (err) {
    console.error('❌ Failed to retrieve tokens:', err);
    await prisma.$disconnect();
    return;
  }
  console.log('\n');

  // --- STEP 2: TEST RBAC PROTECTION ---
  console.log('--- Step 2: Querying /kas/masuk with Pastor token (Should fail with 403) ---');
  try {
    const res = await fetch(`${BASE_URL}/kas/masuk`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${pastorToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(res.status === 403 ? '✅ Success: Pastor access denied correctly' : '❌ Failed: Pastor should not have access');
  } catch (err) {
    console.error('Error in Step 2:', err);
  }
  console.log('\n');

  // --- STEP 3: CREATING TRANSACTION (SEKRETARIAT) ---
  console.log('--- Step 3: Recording valid Kas Masuk (Sekretariat) ---');
  let transactionId = '';
  const timestamp = new Date().toISOString();
  try {
    const res = await fetch(`${BASE_URL}/kas/masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sekretariatToken}`
      },
      body: JSON.stringify({
        tanggal: timestamp,
        kategori: 'Kolekte',
        sumber: 'Misa Hari Minggu Pagi',
        jumlah: 2500000,
        keterangan: 'Kolekte Pertama Misa I',
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    if (res.status === 201) {
      transactionId = data.data.transaction.id;
      console.log('✅ Success: Kas Masuk recorded');
    } else {
      console.log('❌ Failed to record Kas Masuk');
    }
  } catch (err) {
    console.error('Error in Step 3:', err);
  }
  console.log('\n');

  // --- STEP 4: VALIDATION CHECKS (SEKRETARIAT) ---
  console.log('--- Step 4: Recording invalid Kas Masuk (Should fail validation) ---');
  try {
    const res = await fetch(`${BASE_URL}/kas/masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sekretariatToken}`
      },
      body: JSON.stringify({
        tanggal: 'not-a-date',
        kategori: 'InvalidKategori',
        sumber: '',
        jumlah: -1000,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 400 ? '✅ Success: Invalid values blocked' : '❌ Failed: Allowed invalid values');
  } catch (err) {
    console.error('Error in Step 4:', err);
  }
  console.log('\n');

  // --- STEP 5: QUERY WITH FILTER & SEARCH ---
  console.log('--- Step 5: Querying Kas Masuk with filters ---');
  try {
    const res = await fetch(`${BASE_URL}/kas/masuk?kategori=Kolekte&search=Hari Minggu`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sekretariatToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response count: ${data.data.transactions.length}`);
    const found = data.data.transactions.find(t => t.id === transactionId);
    console.log(found ? '✅ Success: Filter matches and returns the transaction' : '❌ Failed: Transaction not found');
  } catch (err) {
    console.error('Error in Step 5:', err);
  }
  console.log('\n');

  // --- STEP 6: UPDATE TRANSACTION (SEKRETARIAT) ---
  console.log(`--- Step 6: Updating Kas Masuk amount (id: ${transactionId}) ---`);
  try {
    const res = await fetch(`${BASE_URL}/kas/masuk/${transactionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sekretariatToken}`
      },
      body: JSON.stringify({
        jumlah: 3000000,
        keterangan: 'Kolekte Pertama Misa I (Diperbarui)',
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 200 && Number(data.data.transaction.jumlah) === 3000000 ? '✅ Success: Transaction updated' : '❌ Failed');
  } catch (err) {
    console.error('Error in Step 6:', err);
  }
  console.log('\n');

  // --- STEP 7: PREVENT DELETION FOR SEKRETARIAT ---
  console.log(`--- Step 7: Attempting deletion by Sekretariat (Should fail with 403) ---`);
  try {
    const res = await fetch(`${BASE_URL}/kas/masuk/${transactionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sekretariatToken}` },
    });
    console.log(`Status: ${res.status}`);
    console.log(res.status === 403 ? '✅ Success: Deletion by Sekretariat denied correctly' : '❌ Failed: Sekretariat should not have deletion access');
  } catch (err) {
    console.error('Error in Step 7:', err);
  }
  console.log('\n');

  // --- STEP 8: DELETE TRANSACTION FOR BENDAHARA ---
  console.log(`--- Step 8: Deleting transaction by Bendahara (Should succeed) ---`);
  try {
    const res = await fetch(`${BASE_URL}/kas/masuk/${transactionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    console.log(`Status: ${res.status}`);
    console.log(res.status === 200 ? '✅ Success: Transaction deleted' : '❌ Failed to delete');
  } catch (err) {
    console.error('Error in Step 8:', err);
  }
  console.log('\n');

  // --- STEP 9: VERIFY AUDIT LOGS IN DATABASE ---
  console.log('--- Step 9: Verifying generated Audit Logs ---');
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        type: 'IN',
      },
      orderBy: {
        tanggal: 'desc',
      },
      take: 3,
    });

    console.log('Last 3 Audit Logs in DB:');
    console.log(JSON.stringify(logs, null, 2));

    const createLogged = logs.some(l => l.action.includes('Mencatat Kas Masuk') && Number(l.amount) === 2500000);
    const updateLogged = logs.some(l => l.action.includes('Memperbarui transaksi Kas Masuk') && Number(l.amount) === 3000000);
    const deleteLogged = logs.some(l => l.action.includes('Menghapus transaksi Kas Masuk') && Number(l.amount) === 3000000);

    if (createLogged && updateLogged && deleteLogged) {
      console.log('✅ Success: All audit logs (Create, Update, Delete) are correctly recorded in the database');
    } else {
      console.log('❌ Failed: Missing some audit log entries');
    }
  } catch (err) {
    console.error('Error in Step 9:', err);
  }
  console.log('\n');

  await prisma.$disconnect();
  console.log('🏁 Kas Masuk Module Integration Tests Completed.');
}

runTests();
