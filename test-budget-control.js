require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { prisma } = require('./dist/config/database');

async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('🚀 Starting Anggaran (Budget) Integration Tests...\n');

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
    if (!pastorData.data) {
      console.log('Pastor Login Failed:', JSON.stringify(pastorData));
      throw new Error('Pastor data undefined');
    }
    pastorToken = pastorData.data.tokens.accessToken;

    // Bendahara Login
    const bendaharaRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bendahara@santika.org', password: 'password123' }),
    });
    const bendaharaData = await bendaharaRes.json();
    if (!bendaharaData.data) {
      console.log('Bendahara Login Failed:', JSON.stringify(bendaharaData));
      throw new Error('Bendahara data undefined');
    }
    bendaharaToken = bendaharaData.data.tokens.accessToken;

    // Ketua Komisi Login
    const komisiRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'komisi@santika.org', password: 'password123' }),
    });
    const komisiData = await komisiRes.json();
    if (!komisiData.data) {
      console.log('Komisi Login Failed:', JSON.stringify(komisiData));
      throw new Error('Komisi data undefined');
    }
    komisiToken = komisiData.data.tokens.accessToken;

    // Dewan Keuangan Login
    const dewanRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dewan@santika.org', password: 'password123' }),
    });
    const dewanData = await dewanRes.json();
    if (!dewanData.data) {
      console.log('Dewan Login Failed:', JSON.stringify(dewanData));
      throw new Error('Dewan data undefined');
    }
    dewanToken = dewanData.data.tokens.accessToken;

    console.log('✅ Tokens retrieved successfully');
  } catch (err) {
    console.error('❌ Failed to retrieve tokens:', err);
    await prisma.$disconnect();
    return;
  }
  console.log('\n');

  // Find Seeded Master Data
  const paroki = await prisma.paroki.findFirst({ where: { nama: 'Paroki Santo Yosef' } });
  if (!paroki) {
    console.error('❌ Seed data missing. Please run database seeding first.');
    await prisma.$disconnect();
    return;
  }

  const dbFunds = await prisma.fundCategory.findMany({ where: { parokiId: paroki.id } });
  const operasionalFund = dbFunds.find((f) => f.code === 'OPERASIONAL');
  const liturgiFund = dbFunds.find((f) => f.code === 'LITURGI');

  const dbExpTypes = await prisma.expenseType.findMany({ where: { parokiId: paroki.id } });
  const listrikExpType = dbExpTypes.find((e) => e.code === 'LISTRIK');
  const atkExpType = dbExpTypes.find((e) => e.code === 'ATK');

  const budgets = await prisma.budget.findMany({
    where: { parokiId: paroki.id },
    include: { items: true },
  });

  const budgetOperasional = budgets.find((b) => b.fundCategoryId === operasionalFund.id);
  const budgetLiturgi = budgets.find((b) => b.fundCategoryId === liturgiFund.id);

  const listrikBudgetItem = budgetOperasional.items.find((i) => i.name === 'Listrik');
  const altarBudgetItem = budgetLiturgi.items.find((i) => i.name === 'Hias Altar');

  // --- STEP 2: VERIFY BUDGET INITIAL STATE ---
  console.log('--- Step 2: Verifying Initial Budget Values ---');
  try {
    const resAnggaran = await fetch(`${BASE_URL}/anggaran?tahun=${new Date().getFullYear()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    const dataAnggaran = await resAnggaran.json();
    console.log(`GET /anggaran status: ${resAnggaran.status}`);

    const list = dataAnggaran.data.budgets;
    const opBudget = list.find((b) => b.id === budgetOperasional.id);
    const itemListrik = opBudget.items.find((i) => i.id === listrikBudgetItem.id);

    console.log(`Listrik Pagu: Rp ${itemListrik.plafon.toLocaleString('id-ID')}`);
    console.log(`Listrik Realisasi: Rp ${itemListrik.realisasi.toLocaleString('id-ID')}`);
    console.log(`Listrik Sisa: Rp ${itemListrik.sisa.toLocaleString('id-ID')}`);

    if (itemListrik.plafon === 24000000 && itemListrik.realisasi === 0 && itemListrik.sisa === 24000000) {
      console.log('✅ Success: Initial budget figures are correct');
    } else {
      console.log('❌ Failed: Discrepancy in initial budget figures');
    }
  } catch (err) {
    console.error('Error in Step 2:', err);
  }
  console.log('\n');

  // --- STEP 3: CREATE EXPENSE WITH BUDGET ITEM LINK ---
  console.log('--- Step 3: Recording Cash Expense linked to Budget Item ---');
  let expenseTxId = '';
  try {
    // Add income first so there are actual funds in the Pos Dana
    await prisma.cashTransaction.create({
      data: {
        transactionNo: 'TX-IN-TEMP-001',
        transactionDate: new Date(),
        transactionType: 'INCOME',
        fundCategoryId: operasionalFund.id,
        amount: 50000000.00, // Rp 50,000,000 income
        description: 'Pemasukan Awal',
        createdById: (await prisma.user.findFirst({ where: { role: 'BENDAHARA' } })).id,
        parokiId: paroki.id,
      },
    });

    const resExpense = await fetch(`${BASE_URL}/cash/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        transaction_date: new Date().toISOString(),
        fund_category_id: operasionalFund.id,
        expense_type_id: listrikExpType.id,
        budget_item_id: listrikBudgetItem.id,
        amount: 2000000, // Rp 2,000,000
        description: 'Pembayaran listrik bulanan pastoran',
      }),
    });

    const dataExpense = await resExpense.json();
    console.log(`Create Expense status: ${resExpense.status}`);
    if (resExpense.status === 201) {
      expenseTxId = dataExpense.data.expense.id;
      console.log(`✅ Success: Recorded cash expense. Realisasi increased. Transaction No: ${dataExpense.data.expense.transactionNo}`);
    } else {
      console.log('❌ Failed to create expense:', JSON.stringify(dataExpense));
    }
  } catch (err) {
    console.error('Error in Step 3:', err);
  }
  console.log('\n');

  // --- STEP 4: VERIFY DYNAMIC BUDGET UPDATES ---
  console.log('--- Step 4: Verifying Real-Time Budget Aggregates ---');
  try {
    const resAnggaran = await fetch(`${BASE_URL}/anggaran?tahun=${new Date().getFullYear()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    const dataAnggaran = await resAnggaran.json();
    const opBudget = dataAnggaran.data.budgets.find((b) => b.id === budgetOperasional.id);
    const itemListrik = opBudget.items.find((i) => i.id === listrikBudgetItem.id);

    console.log(`Listrik Pagu: Rp ${itemListrik.plafon.toLocaleString('id-ID')}`);
    console.log(`Listrik Realisasi: Rp ${itemListrik.realisasi.toLocaleString('id-ID')} (Expected: Rp 2.000.000)`);
    console.log(`Listrik Sisa: Rp ${itemListrik.sisa.toLocaleString('id-ID')} (Expected: Rp 22.000.000)`);
    console.log(`Listrik Persentase: ${itemListrik.persentase}% (Expected: 8%)`);

    if (itemListrik.realisasi === 2000000 && itemListrik.sisa === 22000000 && itemListrik.persentase === 8) {
      console.log('✅ Success: Real-time calculation matches transaction aggregates exactly');
    } else {
      console.log('❌ Failed: Discrepancy in calculated values');
    }
  } catch (err) {
    console.error('Error in Step 4:', err);
  }
  console.log('\n');

  // --- STEP 5: TEST BUDGET BOUNDARY ENFORCEMENT ---
  console.log('--- Step 5: Testing Budget Item Limit Guard ---');
  try {
    // Attempt to spend Rp 25,000,000 on Listrik (Sisa is Rp 22,000,000)
    const resExpenseFail = await fetch(`${BASE_URL}/cash/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        transaction_date: new Date().toISOString(),
        fund_category_id: operasionalFund.id,
        expense_type_id: listrikExpType.id,
        budget_item_id: listrikBudgetItem.id,
        amount: 25000000, // Rp 25,000,000
        description: 'Pembayaran listrik fiktif berlebih',
      }),
    });

    const dataExpenseFail = await resExpenseFail.json();
    console.log(`Create Expense Over-Budget Status: ${resExpenseFail.status}`);
    console.log(`Response message: "${dataExpenseFail.message}"`);
    if (resExpenseFail.status === 400 && dataExpenseFail.message.includes('tidak mencukupi')) {
      console.log('✅ Success: Blocked expense transaction successfully due to budget overflow');
    } else {
      console.log('❌ Failed: Over-budget transaction was incorrectly permitted');
    }
  } catch (err) {
    console.error('Error in Step 5:', err);
  }
  console.log('\n');

  // --- STEP 6: VERIFY PROPOSAL BUDGET CHECKS (PENGAJUAN) ---
  console.log('--- Step 6: Testing Proposal Budget Checks ---');
  let proposalId = '';
  try {
    // 1. Propose nominal exceeding plafon (Hias Altar limit is Rp 20,000,000)
    const resPropFail = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        judul: 'Renovasi Altar Mewah',
        nominal: 25000000, // Rp 25,000,000
        tujuan: 'Membeli ornamen emas untuk altar',
        budgetItemId: altarBudgetItem.id,
      }),
    });
    const dataPropFail = await resPropFail.json();
    console.log(`Create Over-Budget Proposal Status: ${resPropFail.status}`);
    console.log(`Response message: "${dataPropFail.message}"`);
    if (resPropFail.status === 400 && dataPropFail.message.includes('melebihi sisa anggaran')) {
      console.log('✅ Success: Blocked proposal exceeding budget item limit');
    } else {
      console.log('❌ Failed: Allowed proposal exceeding budget');
    }

    // 2. Propose a valid nominal (Rp 12,000,000)
    const resPropOk = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        judul: 'Bunga Altar Paskah',
        nominal: 12000000, // Rp 12,000,000
        tujuan: 'Membeli bunga segar dan dekorasi Paskah',
        budgetItemId: altarBudgetItem.id,
      }),
    });
    const dataPropOk = await resPropOk.json();
    console.log(`Create Valid Proposal Status: ${resPropOk.status}`);
    if (resPropOk.status === 201) {
      proposalId = dataPropOk.data.approval.id;
      console.log(`✅ Success: Proposal submitted. ID: ${proposalId}`);
    } else {
      console.log('❌ Failed to submit valid proposal:', JSON.stringify(dataPropOk));
    }

    // 3. Propose another nominal that is within original plafon (Rp 10M) but exceeds remaining considering pending proposal
    // Remaining available: 20M - 12M (pending) = 8M. So 10M must be blocked!
    const resPropBlockPending = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${komisiToken}`,
      },
      body: JSON.stringify({
        judul: 'Bunga Altar Kenaikan',
        nominal: 10000000, // Rp 10,000,000
        tujuan: 'Membeli bunga Kenaikan',
        budgetItemId: altarBudgetItem.id,
      }),
    });
    const dataPropBlockPending = await resPropBlockPending.json();
    console.log(`Create Proposal Blocking Pending Status: ${resPropBlockPending.status}`);
    console.log(`Response message: "${dataPropBlockPending.message}"`);
    if (resPropBlockPending.status === 400 && dataPropBlockPending.message.includes('melebihi sisa anggaran')) {
      console.log('✅ Success: Blocked proposal because pending proposal consumes budget available');
    } else {
      console.log('❌ Failed: Allowed proposal duplicate double-spend');
    }
  } catch (err) {
    console.error('Error in Step 6:', err);
  }
  console.log('\n');

  // --- STEP 7: TEST BUDGET DASHBOARD ENDPOINT ---
  console.log('--- Step 7: Testing Budget Dashboard Summary Endpoint ---');
  try {
    const resDashboard = await fetch(`${BASE_URL}/anggaran/dashboard?tahun=${new Date().getFullYear()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${dewanToken}` },
    });
    const dataDashboard = await resDashboard.json();
    console.log(`GET /anggaran/dashboard status: ${resDashboard.status}`);

    const opSummary = dataDashboard.data.perPosDana.find((p) => p.fund_code === 'OPERASIONAL');
    const listrikSummary = dataDashboard.data.perItem.find((i) => i.item_name === 'Listrik');

    console.log('Operasional Fund Summary:', JSON.stringify(opSummary));
    console.log('Listrik Item Summary:', JSON.stringify(listrikSummary));

    if (
      opSummary &&
      opSummary.anggaran === 86000000 &&
      opSummary.realisasi === 2000000 &&
      opSummary.sisa === 84000000 &&
      listrikSummary &&
      listrikSummary.anggaran === 24000000 &&
      listrikSummary.realisasi === 2000000 &&
      listrikSummary.sisa === 22000000 &&
      listrikSummary.persentase === 8
    ) {
      console.log('✅ Success: Dashboard aggregate values match expectations');
    } else {
      console.log('❌ Failed: Mismatch in dashboard aggregates');
    }
  } catch (err) {
    console.error('Error in Step 7:', err);
  }
  console.log('\n');

  // --- STEP 8: CLEAN UP TEST DATA ---
  console.log('--- Step 8: Cleaning Up Test Records ---');
  try {
    // Delete approvals alur history first
    if (proposalId) {
      await prisma.approvalHistory.deleteMany({ where: { pengajuanId: proposalId } });
      await prisma.pengajuan.delete({ where: { id: proposalId } });
    }

    if (expenseTxId) {
      await prisma.cashTransaction.delete({ where: { id: expenseTxId } });
    }

    // Delete initial income
    await prisma.cashTransaction.deleteMany({ where: { transactionNo: 'TX-IN-TEMP-001' } });

    console.log('✅ Database cleanup completed successfully');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }

  await prisma.$disconnect();
  console.log('\n🏁 Anggaran Module Integration Tests Completed.');
}

runTests();
