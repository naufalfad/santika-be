require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { prisma } = require('./dist/config/database');

async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('🚀 Starting Fund Accounting / Pos Dana Integration Tests...\n');

  let pastorToken = '';
  let bendaharaToken = '';
  let komisiToken = '';
  let dewanToken = '';
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

  // --- STEP 2: TEST MASTER DATA Pos Dana (FundCategory) ---
  console.log('--- Step 2: Testing Pos Dana CRUD ---');
  let testFundId = '';
  try {
    // 1. Create a Pos Dana
    const resCreate = await fetch(`${BASE_URL}/fund-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_KAS',
        name: 'Dana Test Pos',
        description: 'Dana khusus untuk testing integrasi',
      }),
    });
    const dataCreate = await resCreate.json();
    console.log(`Create Fund Category Status: ${resCreate.status}`);
    if (resCreate.status === 201) {
      testFundId = dataCreate.data.category.id;
      console.log(`✅ Success: Created Fund Category with ID: ${testFundId}`);
    } else {
      console.log('❌ Failed to create Fund Category:', JSON.stringify(dataCreate));
    }

    // 2. Read Pos Dana
    const resRead = await fetch(`${BASE_URL}/fund-categories`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    const dataRead = await resRead.json();
    const found = dataRead.data.categories.find(c => c.id === testFundId);
    console.log(found ? '✅ Success: Found newly created Fund Category in listing' : '❌ Failed to find category in listing');

    // 3. Update Pos Dana
    const resUpdate = await fetch(`${BASE_URL}/fund-categories/${testFundId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        name: 'Dana Test Pos Updated',
      }),
    });
    const dataUpdate = await resUpdate.json();
    console.log(`Update Fund Category Status: ${resUpdate.status}`);
    console.log(resUpdate.status === 200 && dataUpdate.data.category.name === 'Dana Test Pos Updated' ? '✅ Success: Updated Fund Category' : '❌ Failed to update');

  } catch (err) {
    console.error('Error in Step 2:', err);
  }
  console.log('\n');

  // --- STEP 3: TEST MASTER DATA Jenis Penerimaan (IncomeType) ---
  console.log('--- Step 3: Testing Jenis Penerimaan CRUD ---');
  let testIncTypeId = '';
  try {
    const resCreate = await fetch(`${BASE_URL}/income-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_INCOME_TYPE',
        name: 'Penerimaan Test',
        description: 'Tipe penerimaan untuk testing',
      }),
    });
    const dataCreate = await resCreate.json();
    console.log(`Create Income Type Status: ${resCreate.status}`);
    if (resCreate.status === 201) {
      testIncTypeId = dataCreate.data.incomeType.id;
      console.log(`✅ Success: Created Income Type with ID: ${testIncTypeId}`);
    } else {
      console.log('❌ Failed to create Income Type');
    }
  } catch (err) {
    console.error('Error in Step 3:', err);
  }
  console.log('\n');

  // --- STEP 4: TEST MASTER DATA Jenis Pengeluaran (ExpenseType) ---
  console.log('--- Step 4: Testing Jenis Pengeluaran CRUD ---');
  let testExpTypeId = '';
  try {
    const resCreate = await fetch(`${BASE_URL}/expense-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_EXPENSE_TYPE',
        name: 'Pengeluaran Test',
        description: 'Tipe pengeluaran untuk testing',
      }),
    });
    const dataCreate = await resCreate.json();
    console.log(`Create Expense Type Status: ${resCreate.status}`);
    if (resCreate.status === 201) {
      testExpTypeId = dataCreate.data.expenseType.id;
      console.log(`✅ Success: Created Expense Type with ID: ${testExpTypeId}`);
    } else {
      console.log('❌ Failed to create Expense Type');
    }
  } catch (err) {
    console.error('Error in Step 4:', err);
  }
  console.log('\n');

  // --- STEP 5: BACKWARD COMPATIBILITY ENDPOINT CHECKS ---
  console.log('--- Step 5: Verifying Backward Compatibility of Old Endpoints ---');
  try {
    const resAnggaran = await fetch(`${BASE_URL}/anggaran`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    console.log(`GET /anggaran status: ${resAnggaran.status} (Expected 200)`);

    const resKasMasuk = await fetch(`${BASE_URL}/kas/masuk`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    console.log(`GET /kas/masuk status: ${resKasMasuk.status} (Expected 200)`);

    const resKasKeluar = await fetch(`${BASE_URL}/kas/keluar`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bendaharaToken}` },
    });
    console.log(`GET /kas/keluar status: ${resKasKeluar.status} (Expected 200)`);

    if (resAnggaran.status === 200 && resKasMasuk.status === 200 && resKasKeluar.status === 200) {
      console.log('✅ Success: Existing API endpoints remain fully functioning');
    } else {
      console.log('❌ Failed: Backward compatibility test failed');
    }
  } catch (err) {
    console.error('Error in Step 5:', err);
  }
  console.log('\n');

  // --- STEP 6: VERIFY BALANCE RESTRICTION LIMITS ---
  console.log('--- Step 6: Testing Available Balance Limit Guard ---');
  try {
    // Attempting to record cash expense when balance is Rp 0
    const resExpenseFail = await fetch(`${BASE_URL}/cash/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        transaction_date: new Date().toISOString(),
        fund_category_id: testFundId,
        expense_type_id: testExpTypeId,
        amount: 100000, // Attempting to spend Rp 100,000
        description: 'Membeli ATK ATK kantor',
      }),
    });
    const dataExpenseFail = await resExpenseFail.json();
    console.log(`Create Expense (Balance = 0) Status: ${resExpenseFail.status}`);
    console.log(`Response message: "${dataExpenseFail.message}"`);
    if (resExpenseFail.status === 400 && dataExpenseFail.message.includes('tidak mencukupi')) {
      console.log('✅ Success: Properly blocked expense transaction due to insufficient funds');
    } else {
      console.log('❌ Failed: Allowed expense despite having zero balance');
    }
  } catch (err) {
    console.error('Error in Step 6:', err);
  }
  console.log('\n');

  // --- STEP 7: RECORD INCOME TRANSACTION ---
  console.log('--- Step 7: Recording cash income to Pos Dana ---');
  let incomeTxId = '';
  try {
    const resIncome = await fetch(`${BASE_URL}/cash/incomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sekretariatToken}`, // Sekretariat can record incomes
      },
      body: JSON.stringify({
        transaction_date: new Date().toISOString(),
        fund_category_id: testFundId,
        income_type_id: testIncTypeId,
        amount: 850000, // Rp 850,000
        description: 'Sumbangan tunai dari donatur',
      }),
    });
    const dataIncome = await resIncome.json();
    console.log(`Create Income Status: ${resIncome.status}`);
    if (resIncome.status === 201) {
      incomeTxId = dataIncome.data.income.id;
      console.log(`✅ Success: Income recorded. Transaction No: ${dataIncome.data.income.transactionNo}`);
    } else {
      console.log('❌ Failed to record income:', JSON.stringify(dataIncome));
    }
  } catch (err) {
    console.error('Error in Step 7:', err);
  }
  console.log('\n');

  // --- STEP 8: RETRY EXPENSE WITH VALID BALANCE ---
  console.log('--- Step 8: Retrying cash expense with valid balance (Rp 850,000 available) ---');
  let expenseTxId = '';
  try {
    // 1. Spend Rp 350,000 (succeeds)
    const resExpenseOk = await fetch(`${BASE_URL}/cash/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        transaction_date: new Date().toISOString(),
        fund_category_id: testFundId,
        expense_type_id: testExpTypeId,
        amount: 350000,
        description: 'Belanja alat tulis kantor',
      }),
    });
    const dataExpenseOk = await resExpenseOk.json();
    console.log(`Create Expense (Rp 350k) Status: ${resExpenseOk.status}`);
    if (resExpenseOk.status === 201) {
      expenseTxId = dataExpenseOk.data.expense.id;
      console.log(`✅ Success: Expense recorded. Transaction No: ${dataExpenseOk.data.expense.transactionNo}`);
    } else {
      console.log('❌ Failed to record valid expense');
    }

    // 2. Spend Rp 600,000 (fails: Rp 500,000 left)
    const resExpenseOver = await fetch(`${BASE_URL}/cash/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: JSON.stringify({
        transaction_date: new Date().toISOString(),
        fund_category_id: testFundId,
        expense_type_id: testExpTypeId,
        amount: 600000,
        description: 'Belanja berlebihan',
      }),
    });
    const dataExpenseOver = await resExpenseOver.json();
    console.log(`Create Expense (Rp 600k) Status: ${resExpenseOver.status}`);
    console.log(`Response message: "${dataExpenseOver.message}"`);
    if (resExpenseOver.status === 400 && dataExpenseOver.message.includes('tidak mencukupi')) {
      console.log('✅ Success: Correctly blocked over-draft expense transaction');
    } else {
      console.log('❌ Failed: Allowed expense overdraft');
    }
  } catch (err) {
    console.error('Error in Step 8:', err);
  }
  console.log('\n');

  // --- STEP 9: TEST BALANCES SUMMARY ENDPOINT ---
  console.log('--- Step 9: Testing Balances Summary Endpoint ---');
  try {
    const resBalances = await fetch(`${BASE_URL}/fund-categories/balances`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${dewanToken}` },
    });
    const dataBalances = await resBalances.json();
    console.log(`GET /fund-categories/balances Status: ${resBalances.status}`);
    
    // Find our test fund summary
    const summary = dataBalances.find(b => b.id === testFundId);
    console.log('Balances Summary Response:', JSON.stringify(summary, null, 2));

    if (summary && summary.income === 850000 && summary.expense === 350000 && summary.balance === 500000) {
      console.log('✅ Success: Dynamic balances summary matches exact math');
    } else {
      console.log('❌ Failed: Discrepancy in summary values');
    }
  } catch (err) {
    console.error('Error in Step 9:', err);
  }
  console.log('\n');

  // --- STEP 10: CLEAN UP TEST DATA ---
  console.log('--- Step 10: Cleaning Up Test Records ---');
  try {
    if (expenseTxId) {
      await prisma.cashTransaction.delete({ where: { id: expenseTxId } });
    }
    if (incomeTxId) {
      await prisma.cashTransaction.delete({ where: { id: incomeTxId } });
    }
    if (testFundId) {
      await prisma.fundCategory.delete({ where: { id: testFundId } });
    }
    if (testIncTypeId) {
      await prisma.incomeType.delete({ where: { id: testIncTypeId } });
    }
    if (testExpTypeId) {
      await prisma.expenseType.delete({ where: { id: testExpTypeId } });
    }
    console.log('✅ Database cleanup completed successfully');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }

  await prisma.$disconnect();
  console.log('\n🏁 Fund Accounting Module Integration Tests Completed.');
}

runTests();
