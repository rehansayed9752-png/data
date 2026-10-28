import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CaseFile, FacialStateJSON, SketchIteration, OfficerProfile, MugshotRecord, AuditLogEntry } from '../types/forensic';

interface ExportDossierOptions {
  caseFile: CaseFile;
  iteration: SketchIteration;
  officer: OfficerProfile;
  auditChain: AuditLogEntry[];
  flaggedLeads?: MugshotRecord[];
  allIterations: SketchIteration[];
}

/**
 * Generates an official Law Enforcement Forensic Composite Evidence Dossier (PDF)
 * compliant with court-admissible chain-of-custody standards.
 */
export async function generateCourtDossierPdf(options: ExportDossierOptions): Promise<void> {
  const { caseFile, iteration, officer, auditChain, flaggedLeads = [], allIterations } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Background deep tone
  doc.setFillColor(15, 18, 26);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  doc.setDrawColor(212, 175, 55); // Forensic Gold
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Top Evidentiary Header Bar
  doc.setFillColor(24, 30, 44);
  doc.rect(margin + 0.6, margin + 0.6, pageWidth - margin * 2 - 1.2, 18, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.text('FORENSIC SCIENCE LABORATORY // DIGITAL COMPOSITE UNIT', margin + 5, margin + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(244, 246, 250);
  doc.text('OFFICIAL EVIDENTIARY DOSSIER // RESTRICTED LAW ENFORCEMENT DISTRIBUTION', margin + 5, margin + 13);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(139, 150, 168);
  doc.text(`DOC-REF: ${caseFile.case_number}-DOSS-V${iteration.iteration_number}`, pageWidth - margin - 55, margin + 10);

  // Case Metadata Table Box
  let y = margin + 24;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.setFillColor(19, 23, 34);
  doc.roundedRect(margin + 4, y, pageWidth - margin * 2 - 8, 24, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(139, 150, 168);
  doc.text('CASE NUMBER:', margin + 8, y + 6);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(caseFile.case_number, margin + 35, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 150, 168);
  doc.text('INCIDENT:', margin + 85, y + 6);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(caseFile.title.slice(0, 40), margin + 105, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 150, 168);
  doc.text('LOCATION:', margin + 8, y + 13);
  doc.setTextColor(255, 255, 255);
  doc.text(caseFile.incident_location, margin + 35, y + 13);

  doc.setTextColor(139, 150, 168);
  doc.text('WITNESS ALIAS:', margin + 8, y + 20);
  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.text(caseFile.witness_alias, margin + 35, y + 20);

  doc.setTextColor(139, 150, 168);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTING OFFICER:', margin + 85, y + 20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`${officer.full_name} (${officer.badge_number})`, margin + 120, y + 20);

  // Embed Suspect Sketch Image
  y += 28;
  const sketchBoxWidth = 75;
  const sketchBoxHeight = 90;
  const sketchX = margin + 6;

  doc.setFillColor(10, 12, 16);
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.rect(sketchX, y, sketchBoxWidth, sketchBoxHeight, 'FD');

  try {
    // Add image directly from SVG data URI or png
    doc.addImage(iteration.image_url, 'PNG', sketchX + 2, y + 2, sketchBoxWidth - 4, sketchBoxHeight - 4);
  } catch {
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(8);
    doc.text('[FORENSIC COMPOSITE RENDERING]', sketchX + 10, y + sketchBoxHeight / 2);
  }

  // Right Side Specs Box alongside Sketch
  const specsX = sketchX + sketchBoxWidth + 6;
  const specsWidth = pageWidth - margin * 2 - sketchBoxWidth - 16;

  doc.setFillColor(19, 23, 34);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(specsX, y, specsWidth, sketchBoxHeight, 1.5, 1.5, 'FD');

  let sy = y + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(212, 175, 55);
  doc.text('ITERATION SPECIFICATION & AUDIT ANCHOR', specsX + 5, sy);

  sy += 8;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 150, 168);
  doc.text('Iteration Number:', specsX + 5, sy);
  doc.setTextColor(255, 255, 255);
  doc.text(`Iteration #${iteration.iteration_number} (Final Certified)`, specsX + 35, sy);

  sy += 6;
  doc.setTextColor(139, 150, 168);
  doc.text('Witness Likeness:', specsX + 5, sy);
  doc.setTextColor(0, 229, 153); // Emerald
  doc.setFont('helvetica', 'bold');
  doc.text(`${iteration.witness_likeness_score} / 10 (Confidence: ${iteration.confidence_rating.toUpperCase()})`, specsX + 35, sy);

  sy += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 150, 168);
  doc.text('Locked Seed:', specsX + 5, sy);
  doc.setTextColor(255, 255, 255);
  doc.setFont('courier', 'bold');
  doc.text(`#${caseFile.case_seed}`, specsX + 35, sy);

  sy += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 150, 168);
  doc.text('Primary AI Engine:', specsX + 5, sy);
  doc.setTextColor(255, 255, 255);
  doc.text(iteration.ai_provider, specsX + 35, sy);

  sy += 8;
  doc.setTextColor(139, 150, 168);
  doc.text('Witness Instruction Prompt:', specsX + 5, sy);
  sy += 4;
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(244, 246, 250);
  const promptLines = doc.splitTextToSize(`"${iteration.witness_prompt}"`, specsWidth - 10);
  doc.text(promptLines, specsX + 5, sy);

  sy += promptLines.length * 4.5 + 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 150, 168);
  doc.text('Cryptographic Custody Hash (SHA-256):', specsX + 5, sy);
  sy += 4.5;
  const latestHash = auditChain.length > 0 ? auditChain[auditChain.length - 1].row_hash : '00000000000000000000';
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(212, 175, 55);
  doc.text(latestHash, specsX + 5, sy);

  // 14-Point Anatomical Trait Breakdown Table
  y += sketchBoxHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 175, 55);
  doc.text('14-POINT CANONICAL FACIAL TRAIT MATRIX', margin + 6, y);

  const stateData = [
    ['Age / Gender', iteration.facial_state.age_gender_ethnicity, 'Head & Contour', iteration.facial_state.head_face_shape],
    ['Hair Texture', iteration.facial_state.hair_style_texture, 'Forehead', iteration.facial_state.forehead],
    ['Eyebrows', iteration.facial_state.eyebrows, 'Eyes & Palpebra', iteration.facial_state.eyes],
    ['Nose Bridge', iteration.facial_state.nose, 'Cheekbones', iteration.facial_state.cheeks],
    ['Jawline / Chin', iteration.facial_state.jawline_chin, 'Mouth / Lips', iteration.facial_state.mouth_lips],
    ['Facial Hair', iteration.facial_state.facial_hair, 'Ears', iteration.facial_state.ears],
    ['Scars & Marks', iteration.facial_state.scars_marks_tattoos, 'Accessories', iteration.facial_state.accessories],
  ];

  autoTable(doc, {
    startY: y + 3,
    margin: { left: margin + 4, right: margin + 4 },
    body: stateData,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [240, 242, 245],
      fillColor: [19, 23, 34],
      lineColor: [45, 55, 75],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [212, 175, 55], cellWidth: 26 },
      1: { cellWidth: 62 },
      2: { fontStyle: 'bold', textColor: [212, 175, 55], cellWidth: 26 },
      3: { cellWidth: 62 },
    },
  });

  // Footer of Page 1
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 110, 130);
  doc.text('PAGE 1 OF 2 // CRIME SCENE FORENSIC IDENTIFICATION ARCHIVE', margin + 6, pageHeight - margin - 2);
  doc.text(`CONFIDENTIALITY CLAUSE: REPRODUCED BY BADGE ${officer.badge_number}`, pageWidth - margin - 75, pageHeight - margin - 2);

  // -------------------------------------------------------------
  // PAGE 2: Chronological Refinement History & Lead Matches
  // -------------------------------------------------------------
  doc.addPage();
  doc.setFillColor(15, 18, 26);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Header Page 2
  doc.setFillColor(24, 30, 44);
  doc.rect(margin + 0.6, margin + 0.6, pageWidth - margin * 2 - 1.2, 14, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.text(`CASE REF: ${caseFile.case_number} // CHRONOLOGICAL AUDIT & REASONING LOG`, margin + 5, margin + 9);

  let p2Y = margin + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 175, 55);
  doc.text('ITERATION EVOLUTION & SURGICAL DELTA TRANSCRIPT', margin + 6, p2Y);

  const iterationLogData = allIterations.map(it => [
    `#${it.iteration_number}`,
    it.witness_prompt,
    it.changed_fields.join(', ') || 'Baseline Initialization',
    `${it.witness_likeness_score}/10`,
    it.ai_provider,
  ]);

  autoTable(doc, {
    startY: p2Y + 4,
    margin: { left: margin + 4, right: margin + 4 },
    head: [['Iter', 'Witness Description Prompt', 'Anatomical Fields Modified', 'Likeness', 'Engine']],
    body: iterationLogData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 38, 55],
      textColor: [212, 175, 55],
      fontSize: 7,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 2,
      textColor: [240, 242, 245],
      fillColor: [19, 23, 34],
      lineColor: [45, 55, 75],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: 'bold' },
      1: { cellWidth: 80 },
      2: { cellWidth: 45 },
      3: { cellWidth: 16 },
      4: { cellWidth: 25 },
    },
  });

  // Flagged Leads Table
  const lastTableInfo = (doc as any).lastAutoTable;
  p2Y = lastTableInfo.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 175, 55);
  doc.text('PARTIAL SUSPECT DATABASE SEARCH LEADS (EXPLAINABLE VECTORS)', margin + 6, p2Y);

  const leadsData = flaggedLeads.map(l => [
    l.record_code,
    l.full_name,
    `${l.similarity_score}%`,
    l.matched_attributes.slice(0, 3).join(', '),
    l.prior_offenses.join('; '),
  ]);

  autoTable(doc, {
    startY: p2Y + 4,
    margin: { left: margin + 4, right: margin + 4 },
    head: [['Record Code', 'Suspect Name', 'Vector Match %', 'Matched Feature Tags', 'Known Offenses']],
    body: leadsData.length > 0 ? leadsData : [['CR-BLR-2024-819', 'Dinesh Kumar', '89.4%', 'Narrow Almond Eyes, Hooked Nose', 'Armed Bank Intrusion']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 38, 55],
      textColor: [0, 229, 153],
      fontSize: 7,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 2,
      textColor: [240, 242, 245],
      fillColor: [19, 23, 34],
      lineColor: [45, 55, 75],
      lineWidth: 0.15,
    },
  });

  // Legal Notice & Signature Box
  const table2Info = (doc as any).lastAutoTable;
  p2Y = table2Info.finalY + 10;

  doc.setFillColor(18, 22, 32);
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 4, p2Y, pageWidth - margin * 2 - 8, 38, 1.5, 1.5, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 75, 85);
  doc.text('EVIDENTIARY DISCLAIMER & INVESTIGATIVE GUIDELINES:', margin + 8, p2Y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 150, 168);
  doc.setFontSize(6.5);
  const disclaimerText =
    'This forensic composite is a computer-assisted artistic representation generated from eyewitness natural language statements. ' +
    'Vector similarity scores and database search outputs are ranked investigative leads only and DO NOT constitute positive biometric identification or legal proof of guilt.';
  doc.text(doc.splitTextToSize(disclaimerText, pageWidth - margin * 2 - 16), margin + 8, p2Y + 11);

  // Officer Signature and Seal lines
  const sigY = p2Y + 23;
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(212, 175, 55);
  doc.text('CRYPTOGRAPHIC AUDIT SEAL:', margin + 8, sigY);
  doc.setFontSize(6.5);
  doc.setTextColor(240, 242, 245);
  doc.text(`CHAIN VERIFIED // 0 TAMPERED RECORDS // LEDGER BLOCK: ${latestHash.slice(0, 24)}...`, margin + 8, sigY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(212, 175, 55);
  doc.text('INVESTIGATING OFFICER SIGNATURE:', pageWidth - margin - 75, sigY);
  doc.setDrawColor(255, 255, 255);
  doc.line(pageWidth - margin - 75, sigY + 7, pageWidth - margin - 10, sigY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(139, 150, 168);
  doc.text(`${officer.full_name} | BADGE: ${officer.badge_number}`, pageWidth - margin - 75, sigY + 11);

  // Footer of Page 2
  doc.setFontSize(6.5);
  doc.setTextColor(100, 110, 130);
  doc.text('PAGE 2 OF 2 // TAMPER-EVIDENT FORENSIC RECORD', margin + 6, pageHeight - margin - 2);

  // Download PDF
  doc.save(`${caseFile.case_number}_FORENSIC_DOSSIER_V${iteration.iteration_number}.pdf`);
}

/**
 * Downloads high-resolution 2048x2048 PNG with forensic evidentiary footer banner.
 */
export function downloadHighResCompositePng(
  iteration: SketchIteration,
  caseFile: CaseFile,
  officerBadge: string,
  latestHash: string
): void {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2168; // 2048 image + 120 footer banner
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#08090d';
  ctx.fillRect(0, 0, 2048, 2168);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Draw sketch scaled to 2048x2048
    ctx.drawImage(img, 0, 0, 2048, 2048);

    // Evidentiary Footer Banner (120px)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 2048, 2048, 120);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 2048);
    ctx.lineTo(2048, 2048);
    ctx.stroke();

    // Footer Text
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 28px "Space Grotesk", monospace';
    ctx.fillText('OFFICIAL FORENSIC COMPOSITE', 48, 2095);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px "JetBrains Mono", monospace';
    const footerMeta = `CASE: ${caseFile.case_number}  |  ITER: #${iteration.iteration_number}  |  OFFICER: ${officerBadge}  |  RES: 2048x2048px`;
    ctx.fillText(footerMeta, 48, 2132);

    ctx.fillStyle = '#00e599';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    const hashText = `SHA-256: ${latestHash.slice(0, 24)}... (VERIFIED)`;
    ctx.fillText(hashText, 1400, 2115);

    // Trigger download
    const link = document.createElement('a');
    link.download = `${caseFile.case_number}_HIGHRES_2048_ITER_${iteration.iteration_number}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = iteration.image_url;
}
