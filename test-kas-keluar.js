require('dotenv').config();
const { prisma } = require('./dist/config/database');
const fs = require('fs');
const path = require('path');

async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('🚀 Starting Kas Keluar Module Integration Tests...\n');

  let pastorToken = '';
  let bendaharaToken = '';
  let sekretariatToken = '';
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
  console.log('--- Step 2: Querying /kas/keluar with Sekretariat token (Should fail with 403) ---');
  try {
    const res = await fetch(`${BASE_URL}/kas/keluar`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sekretariatToken}` },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(res.status === 403 ? '✅ Success: Sekretariat access denied correctly' : '❌ Failed: Sekretariat should not have access');
  } catch (err) {
    console.error('Error in Step 2:', err);
  }
  console.log('\n');

  // Find an existing budget (Anggaran) in the database for testing
  let testBudget = null;
  try {
    testBudget = await prisma.anggaran.findFirst();
    if (!testBudget) {
      console.log('❌ Warning: No Anggaran found in the database. Ensure seeding was run.');
    } else {
      console.log(`Using Anggaran ID: ${testBudget.id} (Plafon: ${testBudget.plafon}, Terpakai: ${testBudget.terpakai}, Sisa: ${testBudget.sisa})`);
    }
  } catch (err) {
    console.error('Error querying budget:', err);
  }
  console.log('\n');

  // --- STEP 3: CREATING TRANSACTION EXCEEDING BUDGET ---
  if (testBudget) {
    console.log('--- Step 3: Recording Kas Keluar exceeding budget (Should fail with 400) ---');
    try {
      const form = new FormData();
      form.append('tanggal', new Date().toISOString());
      form.append('kategori', 'Liturgi');
      form.append('penerima', 'Toko Buku Cahaya');
      const exceedAmount = Number(testBudget.sisa) + 100000;
      form.append('jumlah', exceedAmount.toString());
      form.append('anggaranId', testBudget.id);

      const res = await fetch(`${BASE_URL}/kas/keluar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${komisiToken}`
        },
        body: form,
      });
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      console.log(res.status === 400 ? '✅ Success: Budget exceeding transaction blocked correctly' : '❌ Failed: Allowed budget exceed');
    } catch (err) {
      console.error('Error in Step 3:', err);
    }
    console.log('\n');
  }

  // --- STEP 4: RECORD VALID TRANSACTION WITH ATTACHMENT ---
  console.log('--- Step 4: Recording valid Kas Keluar with Attachment (Ketua Komisi) ---');
  let transactionId = '';
  let attachmentUrl = '';
  try {
    const form = new FormData();
    form.append('tanggal', new Date().toISOString());
    form.append('kategori', 'PSE');
    form.append('penerima', 'Apotek Kasih Ibu');
    form.append('jumlah', '150000');
    if (testBudget) {
      form.append('anggaranId', testBudget.id);
    }
    // Create PDF Blob to simulate file
    const fileBlob = new Blob(['%PDF-1.4 receipt invoice body content'], { type: 'application/pdf' });
    form.append('file', fileBlob, 'nota_obat.pdf');

    const res = await fetch(`${BASE_URL}/kas/keluar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${komisiToken}`
      },
      body: form,
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (res.status === 201) {
      transactionId = data.data.transaction.id;
      attachmentUrl = data.data.transaction.attachment.fileUrl;
      console.log('✅ Success: Kas Keluar created');

      // Verify budget updated in DB
      if (testBudget) {
        const updatedAnggaran = await prisma.anggaran.findUnique({ where: { id: testBudget.id } });
        const terpakaiDiff = Number(updatedAnggaran.terpakai) - Number(testBudget.terpakai);
        console.log(`Budget Verification: terpakai increased by ${terpakaiDiff} (Expected: 150000)`);
        console.log(terpakaiDiff === 150000 ? '✅ Success: Budget deducted correctly' : '❌ Failed: Incorrect budget deduction');
      }
    } else {
      console.log('❌ Failed: Could not record Kas Keluar');
    }
  } catch (err) {
    console.error('Error in Step 4:', err);
  }
  console.log('\n');

  // --- STEP 5: VERIFY FILE IS SERVED STATICALLY ---
  console.log('--- Step 5: Verifying file upload static serve ---');
  try {
    const res = await fetch(`http://localhost:4000${attachmentUrl}`);
    console.log(`Statically served status: ${res.status}`);
    const text = await res.text();
    console.log(`Served file content: "${text}"`);
    console.log(res.status === 200 && text === '%PDF-1.4 receipt invoice body content' ? '✅ Success: File served correctly' : '❌ Failed: File serve failed');
  } catch (err) {
    console.error('Error in Step 5:', err);
  }
  console.log('\n');

  // --- STEP 6: UPDATE TRANSACTION BY BENDAHARA ---
  console.log(`--- Step 6: Updating transaction amount to 250000 (Bendahara) ---`);
  try {
    const form = new FormData();
    form.append('jumlah', '250000');
    form.append('penerima', 'Apotek Kasih Ibu (Diperbarui)');

    const res = await fetch(`${BASE_URL}/kas/keluar/${transactionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${bendaharaToken}`
      },
      body: form,
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (res.status === 200 && Number(data.data.transaction.jumlah) === 250000) {
      console.log('✅ Success: Transaction updated');

      // Verify budget updated in DB
      if (testBudget) {
        const updatedAnggaran = await prisma.anggaran.findUnique({ where: { id: testBudget.id } });
        const terpakaiDiff = Number(updatedAnggaran.terpakai) - Number(testBudget.terpakai);
        console.log(`Budget Verification: terpakai total diff from original is now ${terpakaiDiff} (Expected: 250000)`);
        console.log(terpakaiDiff === 250000 ? '✅ Success: Budget updated correctly' : '❌ Failed: Incorrect budget update');
      }
    } else {
      console.log('❌ Failed: Could not update transaction');
    }
  } catch (err) {
    console.error('Error in Step 6:', err);
  }
  console.log('\n');

  // --- STEP 7: PREVENT DELETION FOR KETUA KOMISI ---
  console.log('--- Step 7: Attempting deletion by Ketua Komisi (Should fail with 403) ---');
  try {
    const res = await fetch(`${BASE_URL}/kas/keluar/${transactionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${komisiToken}` },
    });
    console.log(`Status: ${res.status}`);
    console.log(res.status === 403 ? '✅ Success: Deletion by Ketua Komisi blocked correctly' : '❌ Failed: Ketua Komisi shouldn\'t have delete permission');
  } catch (err) {
    console.error('Error in Step 7:', err);
  }
  console.log('\n');

  // --- STEP 8: DELETE TRANSACTION BY BENDAHARA ---
  console.log('--- Step 8: Deleting transaction by Bendahara (Should succeed) ---');
  try {
    const res = await fetch(`${BASE_URL}/kas/keluar/${transactionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    console.log(`Status: ${res.status}`);
    console.log(res.status === 200 ? '✅ Success: Transaction deleted' : '❌ Failed to delete');

    // Verify budget restored in DB
    if (testBudget) {
      const restoredAnggaran = await prisma.anggaran.findUnique({ where: { id: testBudget.id } });
      const terpakaiDiff = Number(restoredAnggaran.terpakai) - Number(testBudget.terpakai);
      console.log(`Budget Verification: terpakai diff from original after delete is ${terpakaiDiff} (Expected: 0)`);
      console.log(terpakaiDiff === 0 ? '✅ Success: Budget fully restored' : '❌ Failed: Budget not restored');
    }

    // Verify physical file deletion
    const relativePath = attachmentUrl.startsWith('/') ? attachmentUrl.substring(1) : attachmentUrl;
    const fullPath = path.join(process.cwd(), relativePath);
    const fileExists = fs.existsSync(fullPath);
    console.log(`File exists on disk: ${fileExists}`);
    console.log(!fileExists ? '✅ Success: Physical file deleted from uploads folder' : '❌ Failed: Physical file still exists on disk');
  } catch (err) {
    console.error('Error in Step 8:', err);
  }
  console.log('\n');

  // --- STEP 9: VERIFY AUDIT LOGS IN DATABASE ---
  console.log('--- Step 9: Verifying generated Audit Logs ---');
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        type: 'OUT',
      },
      orderBy: {
        tanggal: 'desc',
      },
      take: 3,
    });

    console.log('Last 3 Audit Logs in DB:');
    console.log(JSON.stringify(logs, null, 2));

    const createLogged = logs.some(l => l.action.includes('Mencatat Kas Keluar') && Number(l.amount) === 150000);
    const updateLogged = logs.some(l => l.action.includes('Memperbarui transaksi Kas Keluar') && Number(l.amount) === 250000);
    const deleteLogged = logs.some(l => l.action.includes('Menghapus transaksi Kas Keluar') && Number(l.amount) === 250000);

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
  console.log('🏁 Kas Keluar Module Integration Tests Completed.');
}

runTests();
