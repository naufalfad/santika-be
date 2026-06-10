require('dotenv').config();
const { prisma } = require('./dist/config/database');

async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('🚀 Starting Approval Workflow Integration Tests...\n');

  let pastorToken = '';
  let bendaharaToken = '';
  let komisiToken = '';
  let dewanToken = '';

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

    // Ketua Komisi Login
    const komisiRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'komisi@santika.org', password: 'password123' }),
    });
    const komisiData = await komisiRes.json();
    komisiToken = komisiData.data.tokens.accessToken;

    // Dewan Keuangan Login
    const dewanRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dewan@santika.org', password: 'password123' }),
    });
    const dewanData = await dewanRes.json();
    dewanToken = dewanData.data.tokens.accessToken;

    console.log('✅ Tokens retrieved successfully');
  } catch (err) {
    console.error('❌ Failed to retrieve tokens:', err);
    await prisma.$disconnect();
    return;
  }
  console.log('\n');

  // Find a test commission and get its parokiId
  let testKomisi = null;
  try {
    testKomisi = await prisma.komisi.findFirst();
    if (!testKomisi) {
      console.log('❌ Error: No Komisi found in database. Seed data first.');
      await prisma.$disconnect();
      return;
    }
    console.log(`Using Komisi: ${testKomisi.nama} (ID: ${testKomisi.id})`);
  } catch (err) {
    console.error('Error querying Komisi:', err);
    await prisma.$disconnect();
    return;
  }

  // --- SETUP CLEAN TEST BUDGET ---
  console.log('--- Step 2: Creating a clean test budget for year 2028 ---');
  let testBudget = null;
  try {
    // Delete any existing budget/proposals for year 2028 to keep test clean
    const existingBudget = await prisma.anggaran.findFirst({
      where: {
        komisiId: testKomisi.id,
        tahun: 2028,
      },
    });

    if (existingBudget) {
      // Delete child proposals and history first
      const proposalIds = (await prisma.pengajuan.findMany({
        where: { anggaranId: existingBudget.id },
        select: { id: true },
      })).map(p => p.id);

      await prisma.approvalHistory.deleteMany({
        where: { pengajuanId: { in: proposalIds } },
      });
      await prisma.pengajuan.deleteMany({
        where: { id: { in: proposalIds } },
      });
      await prisma.anggaran.delete({
        where: { id: existingBudget.id },
      });
    }

    testBudget = await prisma.anggaran.create({
      data: {
        tahun: 2028,
        plafon: 5000000, // Rp 5 Million
        sisa: 5000000,
        terpakai: 0,
        kategori: 'Operasional',
        komisiId: testKomisi.id,
        parokiId: testKomisi.parokiId,
      },
    });
    console.log(`✅ Test budget created with ID: ${testBudget.id}, plafon: Rp ${testBudget.plafon}`);
  } catch (err) {
    console.error('❌ Failed setting up test budget:', err);
    await prisma.$disconnect();
    return;
  }
  console.log('\n');

  // --- TEST 1: SUBMIT PROPOSAL EXCEEDING BUDGET ---
  console.log('--- Test 1: Submit proposal exceeding sisa budget (Should fail with 400) ---');
  try {
    const res = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        judul: 'Pengadaan Meja Rapat Komisi',
        nominal: 6000000, // Budget is only 5,000,000
        tujuan: 'Membeli meja rapat baru untuk ruangan sekretariat',
        anggaranId: testBudget.id,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    if (res.status === 400) {
      console.log('✅ Success: Properly blocked proposal exceeding remaining budget');
    } else {
      console.log('❌ Failed: Allowed proposal exceeding sisa budget');
    }
  } catch (err) {
    console.error('Error in Test 1:', err);
  }
  console.log('\n');

  // --- TEST 2: SUBMIT VALID SMALL PROPOSAL ---
  console.log('--- Test 2: Submit a valid small proposal (<= 500k) ---');
  let proposalSmallId = '';
  try {
    const res = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        judul: 'Buku Liturgi Misa',
        nominal: 300000, // Rp 300,000 <= 500k
        tujuan: 'Pembelian buku panduan lagu liturgi baru',
        anggaranId: testBudget.id,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    if (res.status === 201 && data.data.approval.status === 'MENUNGGU_VERIFIKASI') {
      proposalSmallId = data.data.approval.id;
      console.log('✅ Success: Small proposal submitted');
    } else {
      console.log('❌ Failed to submit small proposal');
    }
  } catch (err) {
    console.error('Error in Test 2:', err);
  }
  console.log('\n');

  // --- TEST 3: BENDAHARA AUTO-APPROVES SMALL PROPOSAL ---
  console.log('--- Test 3: Bendahara auto-approves small proposal directly to DISETUJUI ---');
  try {
    const res = await fetch(`${BASE_URL}/approvals/${proposalSmallId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE',
        catatan: 'Dokumen lengkap dan sesuai anggaran',
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response status: ${data.data.approval.status}`);
    if (res.status === 200 && data.data.approval.status === 'DISETUJUI') {
      console.log('✅ Success: Auto-approved proposal directly to DISETUJUI');
    } else {
      console.log('❌ Failed: Proposal status not DISETUJUI');
    }
  } catch (err) {
    console.error('Error in Test 3:', err);
  }
  console.log('\n');

  // --- TEST 4: SUBMIT VALID LARGE PROPOSAL ---
  console.log('--- Test 4: Submit a valid large proposal (> 500k) ---');
  let proposalLargeId = '';
  try {
    const res = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        judul: 'Sound System Seminar',
        nominal: 1500000, // Rp 1,500,000 > 500k
        tujuan: 'Sewa sound system untuk seminar komisi remaja',
        anggaranId: testBudget.id,
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status === 201) {
      proposalLargeId = data.data.approval.id;
      console.log('✅ Success: Large proposal submitted');
    } else {
      console.log('❌ Failed to submit large proposal');
    }
  } catch (err) {
    console.error('Error in Test 4:', err);
  }
  console.log('\n');

  // --- TEST 5: BENDAHARA ESCALATES LARGE PROPOSAL ---
  console.log('--- Test 5: Bendahara approves large proposal (Should escalate to MENUNGGU_PERSETUJUAN) ---');
  try {
    const res = await fetch(`${BASE_URL}/approvals/${proposalLargeId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE',
        catatan: 'Diajukan ke Pastor karena nominal > 500.000',
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response status: ${data.data.approval.status}`);
    if (res.status === 200 && data.data.approval.status === 'MENUNGGU_PERSETUJUAN') {
      console.log('✅ Success: Large proposal escalated to Pastor');
    } else {
      console.log('❌ Failed: Proposal should have been escalated');
    }
  } catch (err) {
    console.error('Error in Test 5:', err);
  }
  console.log('\n');

  // --- TEST 6: PASTOR APPROVES ESCALATED PROPOSAL ---
  console.log('--- Test 6: Pastor approves escalated proposal to DISETUJUI ---');
  try {
    const res = await fetch(`${BASE_URL}/approvals/${proposalLargeId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pastorToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE',
        catatan: 'Disetujui untuk meningkatkan kualitas kegiatan remaja',
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response status: ${data.data.approval.status}`);
    if (res.status === 200 && data.data.approval.status === 'DISETUJUI') {
      console.log('✅ Success: Pastor approved proposal to DISETUJUI');
    } else {
      console.log('❌ Failed: Pastor approval failed');
    }
  } catch (err) {
    console.error('Error in Test 6:', err);
  }
  console.log('\n');

  // --- TEST 7: REVISION AND RESUBMIT FLOW ---
  console.log('--- Test 7: Revision and Resubmit workflow ---');
  let proposalRevId = '';
  try {
    // 1. Submit third proposal
    const submitRes = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        judul: 'Konsumsi Rapat Komisi',
        nominal: 800000,
        tujuan: 'Konsumsi untuk rapat komisi liturgi bulanan',
        anggaranId: testBudget.id,
      }),
    });
    const submitData = await submitRes.json();
    proposalRevId = submitData.data.approval.id;
    console.log(`Proposal submitted with ID: ${proposalRevId}`);

    // 2. Bendahara requests revision
    const reviseRes = await fetch(`${BASE_URL}/approvals/${proposalRevId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        action: 'REVISE',
        catatan: 'Detail konsumsi kurang rinci, mohon direvisi',
      }),
    });
    const reviseData = await reviseRes.json();
    console.log(`Bendahara REVISE status: ${reviseData.data.approval.status}`);

    if (reviseRes.status === 200 && reviseData.data.approval.status === 'REVISI') {
      console.log('✅ Success: Proposal state set to REVISI');
    } else {
      console.log('❌ Failed: Proposal status not set to REVISI');
    }

    // 3. Ketua Komisi resubmits
    const resubmitRes = await fetch(`${BASE_URL}/approvals/${proposalRevId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        action: 'SUBMIT',
        catatan: 'Sudah ditambahkan rincian konsumsi per porsi',
      }),
    });
    const resubmitData = await resubmitRes.json();
    console.log(`Resubmit status: ${resubmitData.data.approval.status}`);

    if (resubmitRes.status === 200 && resubmitData.data.approval.status === 'MENUNGGU_VERIFIKASI') {
      console.log('✅ Success: Proposal resubmitted back to MENUNGGU_VERIFIKASI');
    } else {
      console.log('❌ Failed: Resubmission did not reset status correctly');
    }
  } catch (err) {
    console.error('Error in Test 7:', err);
  }
  console.log('\n');

  // --- TEST 8: FORBIDDEN ROLE GUARANTEE ---
  console.log('--- Test 8: Dewan Keuangan attempts to update proposal status (Should fail with 403) ---');
  try {
    const res = await fetch(`${BASE_URL}/approvals/${proposalRevId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dewanToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE',
        catatan: 'Mencoba menyetujui tanpa hak akses',
      }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(res.status === 403 ? '✅ Success: Correctly blocked unauthorized role access' : '❌ Failed: Allowed unauthorized user to modify status');
  } catch (err) {
    console.error('Error in Test 8:', err);
  }
  console.log('\n');

  // --- TEST 9: VERIFY GET APPROVALS LIST ---
  console.log('--- Test 9: Get approvals list filtering and RBAC scoping ---');
  try {
    // 1. KETUA_KOMISI sees only their own
    const komisiListRes = await fetch(`${BASE_URL}/approvals`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${komisiToken}` },
    });
    const komisiListData = await komisiListRes.json();
    console.log(`Ketua Komisi listing count: ${komisiListData.data.approvals.length}`);

    // Verify all returned records have pemohonId = Ketua Komisi
    const hasUnowned = komisiListData.data.approvals.some(a => a.pemohon.id !== komisiListData.data.approvals[0]?.pemohon?.id);
    if (!hasUnowned) {
      console.log('✅ Success: Ketua Komisi listing is strictly scoped to owned proposals');
    } else {
      console.log('❌ Failed: Ketua Komisi listing leaked other users proposals');
    }

    // 2. BENDAHARA sees all in the paroki
    const bendaharaListRes = await fetch(`${BASE_URL}/approvals`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    const bendaharaListData = await bendaharaListRes.json();
    console.log(`Bendahara listing count: ${bendaharaListData.data.approvals.length}`);

    // 3. Filter by status DISETUJUI
    const filterRes = await fetch(`${BASE_URL}/approvals?status=DISETUJUI`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    const filterData = await filterRes.json();
    const allApproved = filterData.data.approvals.every(a => a.status === 'DISETUJUI');
    console.log(`Status filter count: ${filterData.data.approvals.length}`);
    if (allApproved) {
      console.log('✅ Success: Query status filter applied correctly');
    } else {
      console.log('❌ Failed: Query status filter returned non-approved items');
    }
  } catch (err) {
    console.error('Error in Test 9:', err);
  }
  console.log('\n');

  // --- TEST 10: VERIFY DB AUDIT TRAILS AND HISTORIES ---
  console.log('--- Test 10: Verify DB Audit Logs and histories are correctly stored ---');
  try {
    // Check history logs for proposalLargeId
    const history = await prisma.approvalHistory.findMany({
      where: { pengajuanId: proposalLargeId },
      orderBy: { tanggal: 'asc' },
    });
    console.log(`History steps for Large Proposal (escalated and approved):`);
    console.log(JSON.stringify(history, null, 2));

    const stepActions = history.map(h => `${h.step} (${h.action})`);
    console.log('History trail:', stepActions.join(' -> '));

    const correctHistory =
      history.length >= 3 &&
      history[0].action === 'SUBMIT' &&
      history[1].action === 'APPROVE' &&
      history[1].step === 'Verifikasi Bendahara' &&
      history[2].action === 'APPROVE' &&
      history[2].step === 'Persetujuan Pastor';

    if (correctHistory) {
      console.log('✅ Success: History workflow steps logged chronologically');
    } else {
      console.log('❌ Failed: Missing or incorrect history logs');
    }

    // Check AuditLog in DB
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        actorId: (await prisma.user.findFirst({ where: { role: 'KETUA_KOMISI' } })).id,
      },
      orderBy: { tanggal: 'desc' },
      take: 3,
    });
    console.log('Audit logs recorded for Ketua Komisi actions:');
    console.log(JSON.stringify(auditLogs, null, 2));

    const hasCreates = auditLogs.some(log => log.action.includes('membuat pengajuan'));
    if (hasCreates) {
      console.log('✅ Success: Audit Logs successfully generated for the operations');
    } else {
      console.log('❌ Failed: Could not locate expected Audit Log entries');
    }
  } catch (err) {
    console.error('Error in Test 10:', err);
  }
  console.log('\n');

  // --- CLEANUP TEST DATABASE RECORDS ---
  console.log('--- Step 11: Cleaning up test data ---');
  try {
    const allCreatedProposals = [proposalSmallId, proposalLargeId, proposalRevId].filter(id => !!id);
    await prisma.approvalHistory.deleteMany({
      where: { pengajuanId: { in: allCreatedProposals } },
    });
    await prisma.pengajuan.deleteMany({
      where: { id: { in: allCreatedProposals } },
    });
    await prisma.anggaran.delete({
      where: { id: testBudget.id },
    });
    console.log('✅ Cleanup completed.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }

  await prisma.$disconnect();
  console.log('\n🏁 Approval Module Integration Tests Completed.');
}

runTests();
