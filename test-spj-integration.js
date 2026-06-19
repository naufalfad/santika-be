require('dotenv').config();
const { prisma } = require('./dist/config/database');

async function runTests() {
  const BASE_URL = 'http://localhost:4000/api/v1';
  console.log('🧪 Starting SPJ Auto-Creation Integration Test...\n');

  let bendaharaToken = '';
  let komisiToken = '';

  try {
    // 1. Log in Bendahara
    const bendaharaRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bendahara@santika.org', password: 'password123' }),
    });
    const bendaharaData = await bendaharaRes.json();
    bendaharaToken = bendaharaData.data.tokens.accessToken;

    // 2. Log in Ketua Komisi
    const komisiRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'komisi@santika.org', password: 'password123' }),
    });
    const komisiData = await komisiRes.json();
    komisiToken = komisiData.data.tokens.accessToken;

    console.log('✅ Logged in successfully');
  } catch (err) {
    console.error('❌ Failed to log in:', err);
    await prisma.$disconnect();
    return;
  }

  // Find seeded master data
  const paroki = await prisma.paroki.findFirst({ where: { nama: 'Paroki Santo Yosef' } });
  const dbFunds = await prisma.fundCategory.findMany({ where: { parokiId: paroki.id } });
  const operasionalFund = dbFunds.find((f) => f.code === 'OPERASIONAL');
  const dbExpTypes = await prisma.expenseType.findMany({ where: { parokiId: paroki.id } });
  const listrikExpType = dbExpTypes.find((e) => e.code === 'LISTRIK');
  
  const budgets = await prisma.budget.findMany({
    where: { parokiId: paroki.id },
    include: { items: true },
  });
  const budgetOperasional = budgets.find((b) => b.fundCategoryId === operasionalFund.id);
  const listrikBudgetItem = budgetOperasional.items.find((i) => i.name === 'Listrik');

  const komisiPSE = await prisma.komisi.findFirst({ where: { nama: { contains: 'PSE' } } });

  console.log('\n--- Setup Test Proposal (Pengajuan) ---');
  let testProposal = null;
  try {
    // First, let's find or create a test proposal with status DISETUJUI
    // Note: We need a proposal that requires SPJ
    testProposal = await prisma.pengajuan.create({
      data: {
        judul: 'Test Proposal SPJ Auto-Create',
        nominal: 500000,
        tujuan: 'Keperluan Uji Coba SPJ',
        status: 'DISETUJUI',
        komisiId: komisiPSE.id,
        budgetItemId: listrikBudgetItem.id,
        pemohonId: (await prisma.user.findFirst({ where: { role: 'KETUA_KOMISI' } })).id,
      }
    });
    console.log(`✅ Test Proposal Created: ${testProposal.id} (${testProposal.judul})`);
  } catch (err) {
    console.error('❌ Setup proposal failed:', err);
    await prisma.$disconnect();
    return;
  }

  console.log('\n--- Step 2: Posting Expense with Attachment ---');
  let createdExpenseId = '';
  try {
    // Add income first so there are actual funds in the Pos Dana
    const tempIncome = await prisma.cashTransaction.create({
      data: {
        transactionNo: 'TX-IN-SPJ-TEST',
        transactionDate: new Date(),
        transactionType: 'INCOME',
        fundCategoryId: operasionalFund.id,
        amount: 1000000.00,
        description: 'Pemasukan Awal SPJ',
        createdById: (await prisma.user.findFirst({ where: { role: 'BENDAHARA' } })).id,
        parokiId: paroki.id,
      },
    });

    const form = new FormData();
    form.append('transaction_date', new Date().toISOString());
    form.append('fund_category_id', operasionalFund.id);
    form.append('expense_type_id', listrikExpType.id);
    form.append('budget_item_id', listrikBudgetItem.id);
    form.append('amount', '300000');
    form.append('description', 'Beli Token Listrik Gereja Utama');
    form.append('pengajuan_id', testProposal.id);

    // Create a dummy PDF file to simulate upload
    const fileBlob = new Blob(['%PDF-1.4 ... Mock PDF content ...'], { type: 'application/pdf' });
    form.append('file', fileBlob, 'receipt_token.pdf');

    const res = await fetch(`${BASE_URL}/cash/expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bendaharaToken}`,
      },
      body: form,
    });

    const data = await res.json();
    console.log(`POST /cash/expenses Status: ${res.status}`);
    console.log(`Response message: ${data.message}`);

    if (res.status === 201) {
      createdExpenseId = data.data.expense.id;
      console.log('✅ Cash transaction created successfully');
    } else {
      console.error('❌ Cash transaction failed:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('Error posting expense:', err);
  }

  console.log('\n--- Step 3: Verifying SPJ and SpjLampiran in Database ---');
  try {
    const spj = await prisma.spj.findFirst({
      where: { pengajuanId: testProposal.id },
      include: { lampiran: { include: { attachment: true } } },
    });

    if (spj) {
      console.log('✅ SUCCESS: SPJ Record Auto-Created!');
      console.log(`SPJ ID: ${spj.id}`);
      console.log(`SPJ Title: ${spj.title}`);
      console.log(`SPJ Amount: ${spj.amount}`);
      console.log(`SPJ Status: ${spj.status}`);
      console.log(`SPJ UploadedBy: ${spj.uploadedBy}`);
      
      console.log(`Lampiran count: ${spj.lampiran.length}`);
      if (spj.lampiran.length > 0) {
        console.log('✅ SUCCESS: SpjLampiran and Attachment correctly linked!');
        const lampiran = spj.lampiran[0];
        console.log(`Lampiran ID: ${lampiran.id}`);
        console.log(`File Name: ${lampiran.attachment.fileName}`);
        console.log(`File URL: ${lampiran.attachment.fileUrl}`);
      } else {
        console.log('❌ FAILED: SpjLampiran not created.');
      }
    } else {
      console.log('❌ FAILED: SPJ Record was NOT auto-created.');
    }
  } catch (err) {
    console.error('Error verifying database records:', err);
  }

  console.log('\n--- Step 4: Cleaning Up Test Records ---');
  try {
    const spjToDelete = await prisma.spj.findFirst({ where: { pengajuanId: testProposal.id } });
    if (spjToDelete) {
      await prisma.spjLampiran.deleteMany({ where: { spjId: spjToDelete.id } });
      await prisma.spj.delete({ where: { id: spjToDelete.id } });
    }

    if (createdExpenseId) {
      const expenseTx = await prisma.cashTransaction.findUnique({ where: { id: createdExpenseId } });
      await prisma.cashTransaction.delete({ where: { id: createdExpenseId } });
      if (expenseTx && expenseTx.attachmentId) {
        await prisma.attachment.delete({ where: { id: expenseTx.attachmentId } });
      }
    }

    await prisma.cashTransaction.deleteMany({ where: { transactionNo: 'TX-IN-SPJ-TEST' } });
    await prisma.pengajuan.delete({ where: { id: testProposal.id } });

    console.log('✅ Database cleanup completed successfully');
  } catch (err) {
    console.error('Cleanup failed:', err);
  }

  await prisma.$disconnect();
  console.log('\n🏁 Verification Test Finished.');
}

runTests();
