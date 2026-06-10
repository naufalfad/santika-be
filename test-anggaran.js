require('dotenv').config();
const { prisma } = require('./dist/config/database');

async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('🚀 Starting Anggaran Module Integration Tests...\n');

  let pastorToken = '';
  let dewanToken = '';
  let bendaharaToken = '';
  let komisiToken = '';

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

    // Dewan Keuangan Login
    const dewanRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dewan@santika.org', password: 'password123' }),
    });
    const dewanData = await dewanRes.json();
    dewanToken = dewanData.data.tokens.accessToken;

    // Bendahara Login
    const bendaharaRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bendahara@santika.org', password: 'password123' }),
    });
    const bendaharaData = await bendaharaRes.json();
    bendaharaToken = bendaharaData.data.tokens.accessToken;

    // Ketua Komisi Login
    const komisiRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'komisi@santika.org', password: 'password123' }),
    });
    const komisiData = await komisiRes.json();
    komisiToken = komisiData.data.tokens.accessToken;

    console.log('✅ Tokens retrieved successfully');
  } catch (err) {
    console.error('❌ Failed to retrieve tokens:', err);
    await prisma.$disconnect();
    return;
  }
  console.log('\n');

  // --- STEP 2: TEST RBAC PROTECTION ---
  console.log('--- Step 2: Querying /anggaran with Ketua Komisi token (Should fail with 403) ---');
  try {
    const res = await fetch(`${BASE_URL}/anggaran`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${komisiToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(res.status === 403 ? '✅ Success: Ketua Komisi access denied correctly' : '❌ Failed: Ketua Komisi should not have access');
  } catch (err) {
    console.error('Error in Step 2:', err);
  }
  console.log('\n');

  console.log('--- Step 2b: Querying /anggaran with Pastor token (Should succeed) ---');
  try {
    const res = await fetch(`${BASE_URL}/anggaran`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${pastorToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(res.status === 200 ? '✅ Success: Pastor can view budgets' : '❌ Failed: Pastor access blocked');
  } catch (err) {
    console.error('Error in Step 2b:', err);
  }
  console.log('\n');

  // Find a Komisi to use for allocation
  let testKomisi = null;
  try {
    testKomisi = await prisma.komisi.findFirst();
    if (!testKomisi) {
      console.log('❌ Warning: No Komisi found in database. Seeding check required.');
    } else {
      console.log(`Using Komisi: ${testKomisi.nama} (ID: ${testKomisi.id})`);
    }
  } catch (err) {
    console.error('Error querying Komisi:', err);
  }
  console.log('\n');

  if (!testKomisi) {
    await prisma.$disconnect();
    return;
  }

  // Ensure clean test setup: delete any preexisting budget for this komisi in 2027
  try {
    await prisma.anggaran.deleteMany({
      where: {
        komisiId: testKomisi.id,
        tahun: 2027,
      },
    });
  } catch (err) {
    console.error('Error cleaning up budget records:', err);
  }

  // --- STEP 3: CREATING BUDGET ---
  console.log('--- Step 3: Allocating new budget for 2027 (Bendahara) ---');
  let budgetId = '';
  try {
    const res = await fetch(`${BASE_URL}/anggaran`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`
      },
      body: JSON.stringify({
        tahun: 2027,
        plafon: 30000000,
        kategori: 'Liturgi',
        komisiId: testKomisi.id,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    if (res.status === 201) {
      budgetId = data.data.budget.id;
      console.log('✅ Success: Budget allocated');
    } else {
      console.log('❌ Failed to allocate budget');
    }
  } catch (err) {
    console.error('Error in Step 3:', err);
  }
  console.log('\n');

  // --- STEP 4: PREVENT DUPLICATES ---
  console.log('--- Step 4: Allocating duplicate budget for 2027 (Should fail with 400) ---');
  try {
    const res = await fetch(`${BASE_URL}/anggaran`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`
      },
      body: JSON.stringify({
        tahun: 2027,
        plafon: 50000000,
        kategori: 'Liturgi',
        komisiId: testKomisi.id,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 400 ? '✅ Success: Duplicate budget blocked correctly' : '❌ Failed: Allowed duplicate budget');
  } catch (err) {
    console.error('Error in Step 4:', err);
  }
  console.log('\n');

  // --- STEP 5: QUERY BUDGETS WITH FILTER ---
  console.log('--- Step 5: Querying budgets filter by tahun=2027 ---');
  try {
    const res = await fetch(`${BASE_URL}/anggaran?tahun=2027`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${dewanToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response count: ${data.data.budgets.length}`);
    const found = data.data.budgets.find(b => b.id === budgetId);
    console.log(found ? '✅ Success: Filters returned the newly created budget' : '❌ Failed: Budget not found in query');
  } catch (err) {
    console.error('Error in Step 5:', err);
  }
  console.log('\n');

  // --- STEP 6: UPDATE PLAFON ---
  console.log(`--- Step 6: Updating plafon amount to 45000000 (id: ${budgetId}) ---`);
  try {
    const res = await fetch(`${BASE_URL}/anggaran/${budgetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`
      },
      body: JSON.stringify({
        plafon: 45000000,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 200 && Number(data.data.budget.plafon) === 45000000 && Number(data.data.budget.sisa) === 45000000 ? '✅ Success: Plafon updated' : '❌ Failed');
  } catch (err) {
    console.error('Error in Step 6:', err);
  }
  console.log('\n');

  // --- STEP 7: ENFORCE LIMIT LOWER BOUNDS ---
  console.log('--- Step 7: Testing plafon update bounds (plafon < terpakai) ---');
  try {
    // Directly mutate terpakai in DB to simulate spent budget
    await prisma.anggaran.update({
      where: { id: budgetId },
      data: {
        terpakai: 20000000,
        sisa: 25000000,
      },
    });
    console.log('Simulatedspent budget: terpakai set to 20,000,000');

    // Attempt to set plafon to 15,000,000
    const res = await fetch(`${BASE_URL}/anggaran/${budgetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`
      },
      body: JSON.stringify({
        plafon: 15000000,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log(res.status === 400 ? '✅ Success: Setting plafon below terpakai blocked correctly' : '❌ Failed: Allowed plafon smaller than spent amount');
  } catch (err) {
    console.error('Error in Step 7:', err);
  }
  console.log('\n');

  // --- STEP 8: VERIFY AUDIT LOGS IN DATABASE ---
  console.log('--- Step 8: Verifying generated Audit Logs ---');
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        type: 'IN',
        action: {
          contains: 'anggaran',
        },
      },
      orderBy: {
        tanggal: 'desc',
      },
      take: 2,
    });

    console.log('Last 2 Anggaran Audit Logs in DB:');
    console.log(JSON.stringify(logs, null, 2));

    const createLogged = logs.some(l => l.action.includes('Mengalokasikan anggaran') && Number(l.amount) === 30000000);
    const updateLogged = logs.some(l => l.action.includes('Memperbarui alokasi anggaran') && Number(l.amount) === 45000000);

    if (createLogged && updateLogged) {
      console.log('✅ Success: All audit logs (Create, Update) are correctly recorded in the database');
    } else {
      console.log('❌ Failed: Missing some audit log entries');
    }
  } catch (err) {
    console.error('Error in Step 8:', err);
  }
  console.log('\n');

  // Clean up: delete the test budget record
  try {
    await prisma.anggaran.delete({ where: { id: budgetId } });
    console.log('Test budget deleted.');
  } catch (err) {
    console.error('Error deleting test budget:', err);
  }

  await prisma.$disconnect();
  console.log('🏁 Anggaran Module Integration Tests Completed.');
}

runTests();
