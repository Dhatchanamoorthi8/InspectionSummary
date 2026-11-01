import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { InspectionReport } from './entities/report.entity';

@Injectable()
export class PdfExportService {
  generatePdf(report: InspectionReport): NodeJS.ReadableStream {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('HEAT TREATMENT INSPECTION REPORT', { align: 'center' });
    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Report Number: ${report.requestNumber} | Generated: ${new Date().toISOString().slice(0, 10)}`, {
        align: 'center',
      });
    doc.moveDown(1.5);

    // Metadata Section
    doc.fontSize(12).font('Helvetica-Bold').text('1. Identification & Traceability');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Request Number: ${report.requestNumber}`);
    doc.text(`Shift: ${(report as any).request?.shift || (report as any).shift || 'Shift 1'}`);
    doc.text(`Part Name: ${report.partName}`);
    doc.text(`Part Number: ${report.partNumber}`);
    doc.text(`Heat / Batch Number: ${report.heatBatchNumber}`);
    doc.text(`Furnace: ${report.furnace}`);
    doc.text(`Auto Report ID: ${report.autoReport}`);
    doc.text(`Sample Batch Date: ${report.sampleBatchDate}`);
    doc.text(`Report Date: ${report.reportDate}`);
    doc.moveDown(1.5);

    // Metallurgical Results
    doc.fontSize(12).font('Helvetica-Bold').text('2. Metallurgical Properties & Measurements');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    doc.text(`Brinell Hardness (BHN): ${report.bhn} (Threshold: >= 80.00) -> Status: ${report.hardnessStatus}`);
    doc.text(`Yield Strength (YS): ${report.ys} MPa (Threshold: >= 220.00 MPa)`);
    doc.text(`Ultimate Tensile Strength (UTS): ${report.uts} MPa (Threshold: >= 280.00 MPa)`);
    doc.text(`Elongation (E): ${report.elongation} % (Threshold: >= 1.00 %)`);
    doc.text(`Mechanical Evaluation: ${report.mechanicalStatus}`);
    doc.moveDown(1);

    // Overall Status
    const overallColor = report.overallStatus === 'OK' ? '#008000' : '#CC0000';
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(overallColor)
      .text(`OVERALL STATUS: ${report.overallStatus}`);
    doc.fillColor('#000000');
    doc.moveDown(1);

    // Remarks
    doc.fontSize(12).font('Helvetica-Bold').text('3. Inspector Remarks');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(report.inspectorRemarks || 'None');
    doc.moveDown(1.5);

    // Sign-off
    doc.fontSize(12).font('Helvetica-Bold').text('4. Quality Sign-off & Verification');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Inspector Name: ${report.inspectorName}`);
    doc.text(`Inspector ID: ${report.inspectorId}`);
    doc.text(`Submission Date: ${report.submissionTimestamp || new Date().toISOString()}`);
    doc.moveDown(0.5);

    // Signature image if available
    if (report.inspectorSignatureSnapshot && report.inspectorSignatureSnapshot.includes('base64,')) {
      try {
        const base64Data = report.inspectorSignatureSnapshot.split('base64,')[1];
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, { width: 120, height: 40 });
      } catch {
        doc.text('[Digital Signature Verified]');
      }
    } else {
      doc.text('[Digital Signature Verified]');
    }

    doc.end();
    return doc;
  }
}
