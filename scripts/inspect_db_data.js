const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function inspectData() {
  const allReqs = await prisma.inspectionRequest.findMany({
    include: { report: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('Total Requests in DB:', allReqs.length);
  const partMap = {};
  const dateMap = {};

  allReqs.forEach((r) => {
    partMap[r.partNumber] = (partMap[r.partNumber] || 0) + 1;
    const d = r.date || (r.report && r.report.reportDate) || 'NO_DATE';
    dateMap[d] = (dateMap[d] || 0) + 1;
  });

  console.log('\n--- Parts Distribution ---');
  console.log(partMap);

  console.log('\n--- Dates Distribution (request.date) ---');
  console.log(dateMap);

  console.log('\n--- AX-1001 Detailed Records ---');
  const ax1001 = allReqs.filter((r) => r.partNumber === 'AX-1001');
  ax1001.forEach((r, idx) => {
    console.log(
      `[#${idx + 1}] Req: ${r.requestNumber} | Date: ${r.date} | RepDate: ${r.report?.reportDate} | HeatBatch: ${r.report?.heatBatchNumber} | BHN: ${r.report?.bhn} | YS: ${r.report?.ys} | Status: ${r.status}`
    );
  });

  console.log('\n--- Unique Dates of Reports ---');
  const reportDates = allReqs.filter(r => r.report).map(r => r.report.reportDate);
  console.log([...new Set(reportDates)]);
}

inspectData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
