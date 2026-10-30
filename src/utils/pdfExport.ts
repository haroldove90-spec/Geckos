import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student } from '../types';

export const exportStudentsToPDF = (
  students: Student[],
  title: string = 'Padrón Oficial de Alumnos Registrados'
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Background Bar
  doc.setFillColor(54, 52, 53); // #363435 Geckops dark charcoal
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text("GECKOP'S VOLEIBOL", 30, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 30, 43);

  // Meta info on the right
  const todayStr = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.text(`Fecha de emisión: ${todayStr}`, pageWidth - 30, 26, { align: 'right' });
  doc.text(`Total de registros: ${students.length}`, pageWidth - 30, 42, { align: 'right' });

  // Summary box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(30, 68, pageWidth - 60, 28, 4, 4, 'F');
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const activeCount = students.filter((s) => s.isActive !== false).length;
  const inactiveCount = students.length - activeCount;
  doc.text(
    `Resumen del Padrón: ${students.length} atletas listados (${activeCount} activos, ${inactiveCount} inactivos) · Control Administrativo Geckop's Voleibol`,
    40,
    85
  );

  // Table Body Data
  const tableData = students.map((s, index) => [
    (index + 1).toString(),
    s.fullName,
    s.category || 'N/A',
    s.branch || 'N/A',
    s.campus || 'Sede Central',
    s.whatsapp || s.tutorPhone || 'Sin número',
    s.tutorName || (s.registrationType === 'adult' ? 'Mayor de edad' : 'N/A'),
    s.emergencyPhone || s.tutorPhone || 'N/A',
    `Alergias: ${s.allergies || 'Ninguna'}\nPadec: ${s.chronicCondition || 'Ninguno'}`,
    s.isActive === false ? 'Inactivo' : 'Activo',
  ]);

  autoTable(doc, {
    startY: 106,
    head: [
      [
        '#',
        'Alumno',
        'Categoría',
        'Rama',
        'Sede',
        'WhatsApp',
        'Tutor Responsable',
        'Emergencia',
        'Alergias & Salud',
        'Estado',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [54, 52, 53],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 105, fontStyle: 'bold' },
      2: { cellWidth: 55, halign: 'center' },
      3: { cellWidth: 45, halign: 'center' },
      4: { cellWidth: 65 },
      5: { cellWidth: 65, halign: 'center' },
      6: { cellWidth: 95 },
      7: { cellWidth: 65, halign: 'center' },
      8: { cellWidth: 140 },
      9: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    didDrawCell: (data) => {
      // Highlight Inactivo vs Activo in status column
      if (data.section === 'body' && data.column.index === 9) {
        const text = data.cell.text[0];
        if (text === 'Activo') {
          doc.setTextColor(16, 120, 50); // green
        } else {
          doc.setTextColor(180, 50, 50); // red
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Página ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(str, pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(
        "Geckop's Voleibol · Documento Oficial Interno Confidencial",
        30,
        pageHeight - 15
      );
    },
  });

  const filename = `Padron_Alumnos_Geckops_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
