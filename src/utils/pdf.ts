import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, BusinessSettings, Remission, PurchaseOrder, Quote } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from './format';

export const convertSaleToTicketData = (sale: Sale): TicketData => {
  return {
    title: 'TICKET DE VENTA',
    id: sale.id,
    date: sale.date,
    customerName: sale.customerName,
    items: sale.items.map(item => {
      const price = item.salePrice;
      const discountAmount = item.discount > 0 ? price * (item.discount / 100) : 0;
      const finalPrice = price - discountAmount;
      const total = finalPrice * item.quantity;
      
      let name = item.name;
      if (item.barcode) name += `\nCódigo: ${item.barcode}`;
      if (item.warranty) name += `\nGarantía: ${item.warranty}`;
      
      return {
        quantity: item.quantity,
        name,
        unitPrice: finalPrice,
        discount: item.discount,
        total
      };
    }),
    subtotal: sale.subtotal,
    tax: sale.tax,
    commission: sale.commission,
    commissionPayer: sale.commissionPayer,
    paymentMethod: sale.paymentMethod,
    total: sale.total,
    notes: undefined,
    disclaimer: 'Este documento de control no tiene validez fiscal.'
  };
};

export const convertQuoteToTicketData = (quote: Quote): TicketData => {
  return {
    title: 'COTIZACIÓN',
    id: quote.folio,
    date: quote.date,
    customerName: quote.customerName,
    items: quote.items.map(item => ({
      quantity: item.quantity,
      name: item.description,
      unitPrice: item.unitPrice,
      total: item.total
    })),
    subtotal: quote.total,
    tax: 0,
    total: quote.total,
    notes: `${quote.customerAddress ? `Dir: ${quote.customerAddress}\n` : ''}${quote.customerPhone ? `Tel: ${quote.customerPhone}\n` : ''}${quote.sellerName ? `Vendedor: ${quote.sellerName}\n` : ''}${quote.sellerPhone ? `Tel Vendedor: ${quote.sellerPhone}\n` : ''}${quote.notes || ''}`,
    disclaimer: 'Esta cotización no tiene validez fiscal y es informativa.'
  };
};

export const generateReceiptPDF = (
  sale: Sale, 
  settings: BusinessSettings, 
  formatType: 'media-carta' | 'carta-completa' | 'ticket-80mm' | 'ticket-58mm' = 'media-carta'
) => {
  if (formatType === 'ticket-80mm' || formatType === 'ticket-58mm') {
    const ticketData = convertSaleToTicketData(sale);
    generateTicketPDF(ticketData, settings, formatType);
    return;
  }


  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const halfHeight = pageHeight / 2;

  if (formatType === 'media-carta') {
    // Draw cut line
    doc.setLineDashPattern([5, 5], 0);
    doc.setLineWidth(0.5);
    doc.setDrawColor(150, 150, 150);
    doc.line(10, halfHeight, pageWidth - 10, halfHeight);
    doc.setLineDashPattern([], 0); // Reset

    // Add scissors icon or text
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('✂--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------', 10, halfHeight + 1);
  }

  const drawReceipt = (startY: number, title: string, isMediaCarta: boolean) => {
    let yPos = startY + 15;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const hasLogo = settings.logo && settings.logo.startsWith('data:');
    const textLeftOffset = hasLogo ? 32 : 5;

    // Calculate dynamic header height
    let extraLines = 0;
    if (settings.owner) extraLines++;
    if (settings.legalName) extraLines++;
    if (settings.rfc) extraLines++;
    if (settings.address) extraLines++;
    if (settings.phone || settings.whatsapp) extraLines++;
    if (settings.email) extraLines++;
    const headerHeight = Math.max(hasLogo ? 32 : 35, 18 + extraLines * 4 + 4);

    // Header Background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPos, contentWidth, headerHeight, 3, 3, 'F');

    // Business Logo if present
    if (hasLogo) {
      try {
        const logoSize = 24;
        const logoY = yPos + (headerHeight - logoSize) / 2;
        doc.addImage(settings.logo, 'JPEG', margin + 4, logoY, logoSize, logoSize);
      } catch (err) {
        console.error('Error rendering business logo on PDF:', err);
      }
    }

    // Business Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    
    const displayBusinessName = (settings.name && settings.name !== 'EliteCaja') 
      ? settings.name 
      : (settings.owner || settings.name || 'EliteCaja');
      
    doc.text(displayBusinessName, margin + textLeftOffset, yPos + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let infoY = yPos + 18;
    if (settings.owner && settings.owner !== displayBusinessName) { 
      doc.text(`Propietario: ${settings.owner}`, margin + textLeftOffset, infoY); 
      infoY += 4; 
    }
    if (settings.legalName) { doc.text(settings.legalName, margin + textLeftOffset, infoY); infoY += 4; }
    if (settings.rfc) { doc.text(`RFC: ${settings.rfc}`, margin + textLeftOffset, infoY); infoY += 4; }
    if (settings.address) { doc.text(settings.address, margin + textLeftOffset, infoY); infoY += 4; }
    
    let phoneWhatsAppText = '';
    if (settings.phone && settings.whatsapp) {
      phoneWhatsAppText = `Tel: ${settings.phone} | WhatsApp: ${settings.whatsapp}`;
    } else if (settings.phone) {
      phoneWhatsAppText = `Tel: ${settings.phone}`;
    } else if (settings.whatsapp) {
      phoneWhatsAppText = `WhatsApp: ${settings.whatsapp}`;
    }
    
    if (phoneWhatsAppText) {
      doc.text(phoneWhatsAppText, margin + textLeftOffset, infoY);
      infoY += 4;
    }
    if (settings.email) {
      doc.text(`Email: ${settings.email}`, margin + textLeftOffset, infoY);
    }

    // Receipt Title & Info (Right aligned)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isMediaCarta ? 'NOTA DE REMISIÓN' : 'NOTA DE REMISIÓN (CARTA)', pageWidth - margin - 5, yPos + 12, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(title, pageWidth - margin - 5, yPos + 18, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Folio: #${sale.id}`, pageWidth - margin - 5, yPos + 24, { align: 'right' });
    doc.text(`Fecha: ${format(new Date(sale.date), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - margin - 5, yPos + 29, { align: 'right' });
    if (sale.customerName) {
      doc.text(`Cliente: ${sale.customerName}`, pageWidth - margin - 5, yPos + 34, { align: 'right' });
    }

    yPos += (headerHeight + 10);

    // Items Table
    const tableData = sale.items.map(item => {
      const price = item.salePrice;
      const discountAmount = item.discount > 0 ? price * (item.discount / 100) : 0;
      const finalPrice = price - discountAmount;
      const total = finalPrice * item.quantity;
      
      let description = item.name;
      if (item.barcode) description += `\nCódigo: ${item.barcode}`;
      if (item.warranty) description += `\nGarantía: ${item.warranty}`;
      
      return [
        item.quantity.toString(),
        description,
        formatCurrency(finalPrice, settings.currency),
        formatCurrency(total, settings.currency)
      ];
    });

    const calculatedBottomMargin = isMediaCarta 
      ? (startY === 0 ? (pageHeight - halfHeight + 15) : 20) 
      : 20;

    autoTable(doc, {
      startY: yPos,
      head: [['Cant.', 'Descripción', 'Precio Unit.', 'Importe']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: isMediaCarta ? 9 : 10, cellPadding: isMediaCarta ? 3 : 4 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin, bottom: calculatedBottomMargin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Check if totals box needs more space
    const endLimit = isMediaCarta ? (startY === 0 ? halfHeight - 15 : pageHeight - 15) : (pageHeight - 20);
    if (yPos > endLimit) {
      doc.addPage();
      yPos = isMediaCarta ? (startY + 15) : 20;
    }

    // Totals Box
    const totalsX = pageWidth - margin - 60;
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(formatCurrency(sale.subtotal, settings.currency), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    if (sale.tax > 0) {
      doc.text(`IVA (${settings.taxRate}%):`, totalsX, yPos);
      doc.text(formatCurrency(sale.tax, settings.currency), pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    }

    if (sale.commission && sale.commissionPayer === 'cliente') {
      doc.text(`Comisión ${sale.paymentMethod}:`, totalsX, yPos);
      doc.text(formatCurrency(sale.commission, settings.currency), pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    }

    // Total Background
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(totalsX - 5, yPos - 4, 65 + 5, 10, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalsX, yPos + 3);
    doc.text(formatCurrency(sale.total, settings.currency), pageWidth - margin - 2, yPos + 3, { align: 'right' });

    // Footer
    yPos += 15;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    if (settings.receiptMessage) {
      const textLines = doc.splitTextToSize(settings.receiptMessage, contentWidth);
      textLines.forEach((line: string) => {
        if (yPos > endLimit) {
          doc.addPage();
          yPos = isMediaCarta ? (startY + 15) : 20;
        }
        const textWidth = doc.getStringUnitWidth(line) * 8 / doc.internal.scaleFactor;
        doc.text(line, (pageWidth - textWidth) / 2, yPos);
        yPos += 4;
      });
    }
  };

  if (formatType === 'media-carta') {
    drawReceipt(0, 'COPIA CLIENTE', true);
    drawReceipt(halfHeight, 'COPIA VENDEDOR', true);
  } else {
    drawReceipt(0, 'COMPROBANTE ÚNICO', false);
  }

  doc.save(`Nota_Remision_${sale.id}.pdf`);
};

export const generateRemissionPDF = (
  remission: Remission, 
  settings: BusinessSettings,
  formatType: 'media-carta' | 'carta-completa' | 'ticket-80mm' | 'ticket-58mm' = 'media-carta'
) => {
  if (formatType === 'ticket-80mm' || formatType === 'ticket-58mm') {
    const ticketData: TicketData = {
      title: 'NOTA DE REMISIÓN',
      id: remission.folio,
      date: remission.date,
      customerName: remission.customerName,
      items: remission.items.map(item => ({
        quantity: item.quantity,
        name: item.description,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal: remission.total,
      tax: 0,
      total: remission.total,
      notes: remission.notes,
      disclaimer: 'Este documento no tiene validez fiscal.'
    };
    generateTicketPDF(ticketData, settings, formatType);
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const halfHeight = pageHeight / 2;

  if (formatType === 'media-carta') {
    // Draw cut line
    doc.setLineDashPattern([5, 5], 0);
    doc.setLineWidth(0.5);
    doc.setDrawColor(150, 150, 150);
    doc.line(10, halfHeight, pageWidth - 10, halfHeight);
    doc.setLineDashPattern([], 0); // Reset

    // Add scissors icon or text
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('✂--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------', 10, halfHeight + 1);
  }

  const drawReceipt = (startY: number, title: string, isMediaCarta: boolean) => {
    let yPos = startY + 15;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const hasLogo = settings.logo && settings.logo.startsWith('data:');
    const textLeftOffset = hasLogo ? 32 : 5;

    // Calculate dynamic header height
    let extraLines = 0;
    if (settings.owner) extraLines++;
    if (settings.legalName) extraLines++;
    if (settings.rfc) extraLines++;
    if (settings.address) extraLines++;
    if (settings.phone || settings.whatsapp) extraLines++;
    if (settings.email) extraLines++;
    const headerHeight = Math.max(hasLogo ? 32 : 35, 18 + extraLines * 4 + 4);

    // Header Background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPos, contentWidth, headerHeight, 3, 3, 'F');

    // Business Logo if present
    if (hasLogo) {
      try {
        const logoSize = 24;
        const logoY = yPos + (headerHeight - logoSize) / 2;
        doc.addImage(settings.logo, 'JPEG', margin + 4, logoY, logoSize, logoSize);
      } catch (err) {
        console.error('Error rendering business logo on PDF:', err);
      }
    }

    // Business Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    
    const displayBusinessName = (settings.name && settings.name !== 'EliteCaja') 
      ? settings.name 
      : (settings.owner || settings.name || 'EliteCaja');
      
    doc.text(displayBusinessName, margin + textLeftOffset, yPos + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let infoY = yPos + 18;
    if (settings.owner && settings.owner !== displayBusinessName) { 
      doc.text(`Propietario: ${settings.owner}`, margin + textLeftOffset, infoY); 
      infoY += 4; 
    }
    if (settings.legalName) { doc.text(settings.legalName, margin + textLeftOffset, infoY); infoY += 4; }
    if (settings.rfc) { doc.text(`RFC: ${settings.rfc}`, margin + textLeftOffset, infoY); infoY += 4; }
    if (settings.address) { doc.text(settings.address, margin + textLeftOffset, infoY); infoY += 4; }
    
    let phoneWhatsAppText = '';
    if (settings.phone && settings.whatsapp) {
      phoneWhatsAppText = `Tel: ${settings.phone} | WhatsApp: ${settings.whatsapp}`;
    } else if (settings.phone) {
      phoneWhatsAppText = `Tel: ${settings.phone}`;
    } else if (settings.whatsapp) {
      phoneWhatsAppText = `WhatsApp: ${settings.whatsapp}`;
    }
    
    if (phoneWhatsAppText) {
      doc.text(phoneWhatsAppText, margin + textLeftOffset, infoY);
      infoY += 4;
    }
    if (settings.email) {
      doc.text(`Email: ${settings.email}`, margin + textLeftOffset, infoY);
    }

    // Receipt Title & Info (Right aligned)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isMediaCarta ? 'NOTA DE REMISIÓN' : 'NOTA DE REMISIÓN (CARTA)', pageWidth - margin - 5, yPos + 12, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(title, pageWidth - margin - 5, yPos + 18, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Folio: #${remission.folio}`, pageWidth - margin - 5, yPos + 24, { align: 'right' });
    doc.text(`Fecha: ${format(new Date(remission.date), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - margin - 5, yPos + 29, { align: 'right' });
    if (remission.customerName) {
      doc.text(`Cliente: ${remission.customerName}`, pageWidth - margin - 5, yPos + 34, { align: 'right' });
    }

    yPos += (headerHeight + 10);

    // Items Table
    const tableData = remission.items.map(item => {
      return [
        item.quantity.toString(),
        item.description,
        formatCurrency(item.unitPrice, settings.currency),
        formatCurrency(item.total, settings.currency)
      ];
    });

    const calculatedBottomMargin = isMediaCarta 
      ? (startY === 0 ? (pageHeight - halfHeight + 15) : 20) 
      : 20;

    autoTable(doc, {
      startY: yPos,
      head: [['Cant.', 'Descripción', 'Precio Unit.', 'Importe']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: isMediaCarta ? 9 : 10, cellPadding: isMediaCarta ? 3 : 4 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin, bottom: calculatedBottomMargin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    const endLimit = isMediaCarta ? (startY === 0 ? halfHeight - 15 : pageHeight - 15) : (pageHeight - 20);
    if (yPos > endLimit) {
      doc.addPage();
      yPos = isMediaCarta ? (startY + 15) : 20;
    }

    // Totals Box
    const totalsX = pageWidth - margin - 60;
    
    // Notes if present on the left
    if (remission.notes) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Notas / Condiciones:', margin, yPos);
      const noteLines = doc.splitTextToSize(remission.notes, totalsX - margin - 10);
      doc.text(noteLines, margin, yPos + 5);
    }

    let currentY = yPos;
    const baseSubtotal = remission.items.reduce((sum, item) => sum + item.total, 0);

    if (remission.paymentMethod && remission.paymentMethod !== 'Efectivo') {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      doc.text(`Subtotal:`, totalsX, currentY);
      doc.text(formatCurrency(baseSubtotal, settings.currency), pageWidth - margin - 2, currentY, { align: 'right' });
      currentY += 4.5;
      
      if (remission.commission && remission.commission > 0) {
        const textComision = `Comisión ${remission.paymentMethod}${remission.term && remission.term !== 'Contado' ? ` (${remission.term})` : ''}:`;
        doc.text(textComision, totalsX, currentY);
        doc.text(`${remission.commissionPayer === 'cliente' ? '+' : '-'}${formatCurrency(remission.commission, settings.currency)}`, pageWidth - margin - 2, currentY, { align: 'right' });
        currentY += 4.5;
        
        if (remission.commissionPayer === 'vendedor') {
          doc.setFontSize(7.5);
          doc.text(`(Comisión absorbida por vendedor)`, totalsX, currentY);
          currentY += 4;
          doc.setFontSize(9);
        }
      }
      
      const pagoText = `Forma de Pago:`;
      doc.text(pagoText, totalsX, currentY);
      doc.text(remission.paymentMethod, pageWidth - margin - 2, currentY, { align: 'right' });
      currentY += 5;
    } else if (remission.paymentMethod) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      const pagoText = `Forma de Pago:`;
      doc.text(pagoText, totalsX, currentY);
      doc.text(remission.paymentMethod, pageWidth - margin - 2, currentY, { align: 'right' });
      currentY += 5;
    }

    // Total Background
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(totalsX - 5, currentY - 4, 65 + 5, 10, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalsX, currentY + 3);
    doc.text(formatCurrency(remission.total, settings.currency), pageWidth - margin - 2, currentY + 3, { align: 'right' });

    // Footer
    yPos = Math.max(yPos + 15, currentY + 15);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    if (isMediaCarta) {
      doc.text('Este documento no tiene validez fiscal.', pageWidth / 2, yPos, { align: 'center' });
    } else {
      doc.text('Este documento de control no tiene validez fiscal.', pageWidth / 2, yPos, { align: 'center' });
    }
  };

  if (formatType === 'media-carta') {
    drawReceipt(0, 'COPIA CLIENTE', true);
    drawReceipt(halfHeight, 'COPIA VENDEDOR', true);
  } else {
    drawReceipt(0, 'COMPROBANTE ÚNICO', false);
  }

  doc.save(`Nota_Remision_${remission.folio}.pdf`);
};

export interface TicketData {
  title: string;
  id: string | number;
  date: string | Date;
  customerName?: string;
  items: Array<{
    quantity: number;
    name: string;
    unitPrice: number;
    discount?: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  commission?: number;
  commissionPayer?: string;
  paymentMethod?: string;
  total: number;
  notes?: string;
  disclaimer?: string;
}

export const generateTicketPDF = (
  data: TicketData,
  settings: BusinessSettings,
  formatType: 'ticket-80mm' | 'ticket-58mm'
) => {
  const is80mm = formatType === 'ticket-80mm';
  const widthStr = is80mm ? '80mm' : '58mm';
  const containerWidthStr = is80mm ? '74mm' : '48mm';

  const displayBusinessName = (settings.name && settings.name !== 'EliteCaja') 
    ? settings.name 
    : (settings.owner || settings.name || 'EliteCaja');

  const formattedDate = typeof data.date === 'string' 
    ? data.date 
    : format(new Date(data.date), 'dd/MM/yyyy HH:mm', { locale: es });

  // Build items list
  let itemsHTML = '';
  data.items.forEach(item => {
    const itemName = item.name.replace(/\n/g, '<br/>');
    itemsHTML += `
      <div style="margin-bottom: 5px;">
        <div style="font-weight: bold; word-break: break-word;">${itemName}</div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-top: 1px;">
          <span>${item.quantity} x ${formatCurrency(item.unitPrice, settings.currency)}${item.discount && item.discount > 0 ? ` (-${item.discount}%)` : ''}</span>
          <span style="font-weight: bold;">${formatCurrency(item.total, settings.currency)}</span>
        </div>
      </div>
    `;
  });

  // Notes Group
  let notesHTML = '';
  if (data.notes) {
    notesHTML += `
      <div class="dashed-line"></div>
      <div style="font-size: 0.9em;">
        <span style="font-weight: bold;">Notas / Condiciones:</span>
        <div style="word-break: break-word; white-space: pre-wrap; margin-top: 2px;">${data.notes}</div>
      </div>
    `;
  }

  // Totals Section
  let totalsHTML = '';
  if (data.subtotal > 0 && Math.abs(data.subtotal - data.total) > 0.01) {
    totalsHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Subtotal:</span>
        <span>${formatCurrency(data.subtotal, settings.currency)}</span>
      </div>
    `;
  }
  if (data.tax > 0) {
    totalsHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>IVA (${settings.taxRate}%):</span>
        <span>${formatCurrency(data.tax, settings.currency)}</span>
      </div>
    `;
  }
  if (data.commission && data.commissionPayer === 'cliente') {
    const method = data.paymentMethod || 'Tarjeta';
    totalsHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Comisión (${method}):</span>
        <span>${formatCurrency(data.commission, settings.currency)}</span>
      </div>
    `;
  }
  totalsHTML += `
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; margin-top: 4px; border-top: 1px dashed #000; padding-top: 4px;">
      <span>TOTAL:</span>
      <span>${formatCurrency(data.total, settings.currency)}</span>
    </div>
  `;

  // Info Details (owner, RFC, address, phone/Whatsapp, email)
  let infoLinesHTML = '';
  if (settings.owner && settings.owner !== displayBusinessName) {
    infoLinesHTML += `<div style="margin-top: 1px;">Propietario: ${settings.owner}</div>`;
  }
  if (settings.legalName) infoLinesHTML += `<div style="margin-top: 1px;">${settings.legalName}</div>`;
  if (settings.rfc) infoLinesHTML += `<div style="margin-top: 1px;">RFC: ${settings.rfc}</div>`;
  if (settings.address) infoLinesHTML += `<div style="margin-top: 1px; word-break: break-word;">${settings.address}</div>`;
  
  let contactText = '';
  if (settings.phone && settings.whatsapp) {
    contactText = `Tel: ${settings.phone} | WA: ${settings.whatsapp}`;
  } else if (settings.phone) {
    contactText = `Tel: ${settings.phone}`;
  } else if (settings.whatsapp) {
    contactText = `WA: ${settings.whatsapp}`;
  }
  if (contactText) infoLinesHTML += `<div style="margin-top: 1px;">${contactText}</div>`;
  if (settings.email) infoLinesHTML += `<div style="margin-top: 1px;">Email: ${settings.email}</div>`;

  // Message & Disclaimer
  let footerHTML = '';
  if (settings.receiptMessage || data.disclaimer) {
    footerHTML += `<div class="dashed-line"></div>`;
    if (settings.receiptMessage) {
      footerHTML += `
        <div style="text-align: center; margin-top: 4px; font-size: 0.9em; color: #333;">
          ${settings.receiptMessage.replace(/\n/g, '<br/>')}
        </div>
      `;
    }
    if (data.disclaimer) {
      footerHTML += `
        <div style="text-align: center; margin-top: 4px; font-size: 0.8em; color: #555; font-style: italic;">
          ${data.disclaimer}
        </div>
      `;
    }
  }

  const ticketContentHTML = `
    <div style="text-align: center; margin-bottom: 4px;">
      ${settings.logo && settings.logo.startsWith('data:') ? `
        <div style="text-align: center; margin-bottom: 4px;">
          <img src="${settings.logo}" style="max-width: ${is80mm ? '40mm' : '30mm'}; max-height: 20mm; object-fit: contain;" />
        </div>
      ` : ''}
      <div style="font-size: ${is80mm ? '14px' : '12px'}; font-weight: bold; text-transform: uppercase;">${displayBusinessName}</div>
      <div style="font-size: 0.9em; color: #333; margin-top: 2px;">
        ${infoLinesHTML}
      </div>
    </div>

    <div class="dashed-line"></div>

    <div style="font-size: 0.95em; margin-bottom: 4px;">
      <div style="font-weight: bold; font-size: 1.05em; text-transform: uppercase; text-align: center; margin-top: 2px;">${data.title}</div>
      <div style="margin-top: 2px;"><span style="font-weight: bold;">FOLIO:</span> #${data.id}</div>
      <div><span style="font-weight: bold;">FECHA:</span> ${formattedDate}</div>
      ${data.customerName ? `<div><span style="font-weight: bold;">CLIENTE:</span> ${data.customerName}</div>` : ''}
    </div>

    <div class="dashed-line"></div>

    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 0.95em; margin-bottom: 4px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
      <span>Descripción</span>
      <span style="text-align: right;">Importe</span>
    </div>
    <div>
      ${itemsHTML}
    </div>

    <div class="dashed-line"></div>

    <div style="font-size: 0.95em;">
      ${totalsHTML}
    </div>

    ${notesHTML}
    ${footerHTML}
  `;

  // Build complete print HTML for thermal roll printers
  const pageSizeStr = is80mm ? '80mm auto' : '58mm auto';
  const paperWidthStr = is80mm ? '80mm' : '58mm';
  const contentWidthStr = is80mm ? '76mm' : '54mm';

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket #${data.id}</title>
  <style>
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    @page {
      size: ${pageSizeStr};
      margin: 0 !important;
    }
    @media print {
      @page {
        size: ${pageSizeStr};
        margin: 0 !important;
      }
      header, footer, nav { display: none !important; }
      html, body {
        width: ${paperWidthStr} !important;
        max-width: ${paperWidthStr} !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: block !important;
        overflow: hidden !important;
      }
      #ticket-container {
        width: ${contentWidthStr} !important;
        max-width: ${contentWidthStr} !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        display: block !important;
        overflow: hidden !important;
      }
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${paperWidthStr} !important;
      max-width: ${paperWidthStr} !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      background-color: #fff !important;
      display: block !important;
      overflow: hidden !important;
    }
    body {
      font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: ${is80mm ? '12px' : '10px'};
      line-height: 1.35;
      color: #000;
      text-align: left !important;
    }
    .dashed-line {
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    #ticket-container {
      width: ${contentWidthStr} !important;
      max-width: ${contentWidthStr} !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      display: block !important;
      overflow: hidden !important;
    }
    #ticket-container > *:last-child {
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
  </style>
</head>
<body>
  <div id="ticket-container">
    ${ticketContentHTML}
  </div>
  <script>
    function doPrint() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 100);
    }

    function triggerPrint() {
      var imgs = document.querySelectorAll('img');
      if (imgs.length > 0) {
        var loaded = 0;
        var done = false;
        function checkDone() {
          if (done) return;
          done = true;
          doPrint();
        }
        imgs.forEach(function(img) {
          if (img.complete) {
            loaded++;
            if (loaded === imgs.length) checkDone();
          } else {
            img.onload = img.onerror = function() {
              loaded++;
              if (loaded === imgs.length) checkDone();
            };
          }
        });
        setTimeout(checkDone, 300);
      } else {
        doPrint();
      }
    }

    triggerPrint();
  </script>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(fullHtml);
  iframeDoc.close();

  setTimeout(() => {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }, 60000);
};

export const generatePurchaseOrderPDF = (
  purchaseOrder: PurchaseOrder, 
  settings: BusinessSettings,
  formatType: 'media-carta' | 'carta-completa' = 'carta-completa'
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const halfHeight = pageHeight / 2;

  if (formatType === 'media-carta') {
    // Draw cut line
    doc.setLineDashPattern([5, 5], 0);
    doc.setLineWidth(0.5);
    doc.setDrawColor(150, 150, 150);
    doc.line(10, halfHeight, pageWidth - 10, halfHeight);
    doc.setLineDashPattern([], 0); // Reset

    // Add scissors icon or text
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('✂--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------', 10, halfHeight + 1);
  }

  const drawReceipt = (startY: number, title: string, isMediaCarta: boolean) => {
    let yPos = startY + 15;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Calculate dynamic header height
    let extraLines = 0;
    if (settings.owner) extraLines++;
    if (settings.legalName) extraLines++;
    if (settings.rfc) extraLines++;
    if (settings.address) extraLines++;
    if (settings.phone || settings.whatsapp) extraLines++;
    if (settings.email) extraLines++;
    const headerHeight = Math.max(35, 18 + extraLines * 4 + 4);

    // Header Background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPos, contentWidth, headerHeight, 3, 3, 'F');

    // Business Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    
    const displayBusinessName = (settings.name && settings.name !== 'EliteCaja') 
      ? settings.name 
      : (settings.owner || settings.name || 'EliteCaja');
      
    doc.text(displayBusinessName, margin + 5, yPos + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let infoY = yPos + 18;
    if (settings.owner && settings.owner !== displayBusinessName) { 
      doc.text(`Propietario: ${settings.owner}`, margin + 5, infoY); 
      infoY += 4; 
    }
    if (settings.legalName) { doc.text(settings.legalName, margin + 5, infoY); infoY += 4; }
    if (settings.rfc) { doc.text(`RFC: ${settings.rfc}`, margin + 5, infoY); infoY += 4; }
    if (settings.address) { doc.text(settings.address, margin + 5, infoY); infoY += 4; }
    
    let phoneWhatsAppText = '';
    if (settings.phone && settings.whatsapp) {
      phoneWhatsAppText = `Tel: ${settings.phone} | WhatsApp: ${settings.whatsapp}`;
    } else if (settings.phone) {
      phoneWhatsAppText = `Tel: ${settings.phone}`;
    } else if (settings.whatsapp) {
      phoneWhatsAppText = `WhatsApp: ${settings.whatsapp}`;
    }
    
    if (phoneWhatsAppText) {
      doc.text(phoneWhatsAppText, margin + 5, infoY);
      infoY += 4;
    }
    if (settings.email) {
      doc.text(`Email: ${settings.email}`, margin + 5, infoY);
    }

    // Title & Info (Right aligned)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isMediaCarta ? 'ORDEN DE COMPRA' : 'ORDEN DE COMPRA (CARTA)', pageWidth - margin - 5, yPos + 12, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(title, pageWidth - margin - 5, yPos + 18, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Folio: #${purchaseOrder.folio}`, pageWidth - margin - 5, yPos + 24, { align: 'right' });
    doc.text(`Fecha: ${format(new Date(purchaseOrder.date), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - margin - 5, yPos + 29, { align: 'right' });
    doc.text(`Proveedor: ${purchaseOrder.supplierName}`, pageWidth - margin - 5, yPos + 34, { align: 'right' });
    doc.text(`Estatus: ${purchaseOrder.status}`, pageWidth - margin - 5, yPos + 39, { align: 'right' });

    yPos += (headerHeight + 15);

    // Items Table
    const tableData = purchaseOrder.items.map(item => {
      return [
        item.quantity.toString(),
        item.description,
        formatCurrency(item.unitPrice, settings.currency),
        formatCurrency(item.total, settings.currency)
      ];
    });

    const calculatedBottomMargin = isMediaCarta 
      ? (startY === 0 ? (pageHeight - halfHeight + 15) : 20) 
      : 20;

    autoTable(doc, {
      startY: yPos,
      head: [['Cant.', 'Descripción', 'Costo Unit.', 'Importe']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: isMediaCarta ? 9 : 10, cellPadding: isMediaCarta ? 3 : 4 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin, bottom: calculatedBottomMargin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    const endLimit = isMediaCarta ? (startY === 0 ? halfHeight - 15 : pageHeight - 15) : (pageHeight - 20);
    if (yPos > endLimit) {
      doc.addPage();
      yPos = isMediaCarta ? (startY + 15) : 20;
    }

    // Totals Box
    const totalsX = pageWidth - margin - 60;
    
    // Notes if present on the left
    if (purchaseOrder.notes) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Notas / Instrucciones de Entrega:', margin, yPos);
      const noteLines = doc.splitTextToSize(purchaseOrder.notes, totalsX - margin - 10);
      doc.text(noteLines, margin, yPos + 5);
    }

    let currentY = yPos;
    // Total Background
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(totalsX - 5, currentY - 4, 65 + 5, 10, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalsX, currentY + 3);
    doc.text(formatCurrency(purchaseOrder.total, settings.currency), pageWidth - margin - 2, currentY + 3, { align: 'right' });

    // Footer
    yPos = Math.max(yPos + 15, currentY + 15);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text('Este documento es una orden de compra formal.', pageWidth / 2, yPos, { align: 'center' });
  };

  if (formatType === 'media-carta') {
    drawReceipt(0, 'COPIA PROVEEDOR', true);
    drawReceipt(halfHeight, 'COPIA INTERNA', true);
  } else {
    drawReceipt(0, 'ORIGINAL', false);
  }

  doc.save(`Orden_Compra_${purchaseOrder.folio}.pdf`);
};

export const generateQuotePDF = (
  quote: Quote,
  settings: BusinessSettings,
  formatType: 'media-carta' | 'carta-completa' | 'ticket-80mm' | 'ticket-58mm' = 'media-carta'
) => {
  if (formatType === 'ticket-80mm' || formatType === 'ticket-58mm') {
    const ticketData: TicketData = {
      title: 'COTIZACIÓN',
      id: quote.folio,
      date: quote.date,
      customerName: quote.customerName,
      items: quote.items.map(item => ({
        quantity: item.quantity,
        name: item.description,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal: quote.total,
      tax: 0,
      total: quote.total,
      notes: `${quote.customerAddress ? `Dir: ${quote.customerAddress}\n` : ''}${quote.customerPhone ? `Tel: ${quote.customerPhone}\n` : ''}${quote.sellerName ? `Vendedor: ${quote.sellerName}\n` : ''}${quote.sellerPhone ? `Tel Vendedor: ${quote.sellerPhone}\n` : ''}${quote.notes || ''}`,
      disclaimer: 'Esta cotización no tiene validez fiscal y es informativa.'
    };
    generateTicketPDF(ticketData, settings, formatType);
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const halfHeight = pageHeight / 2;

  if (formatType === 'media-carta') {
    // Draw cut line
    doc.setLineDashPattern([5, 5], 0);
    doc.setLineWidth(0.5);
    doc.setDrawColor(150, 150, 150);
    doc.line(10, halfHeight, pageWidth - 10, halfHeight);
    doc.setLineDashPattern([], 0); // Reset

    // Add scissors icon or text
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('✂--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------', 10, halfHeight + 1);
  }

  const drawReceipt = (startY: number, title: string, isMediaCarta: boolean) => {
    let yPos = startY + 15;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const hasLogo = settings.logo && settings.logo.startsWith('data:');
    const textLeftOffset = hasLogo ? 32 : 5;

    // Calculate dynamic header height
    let extraLines = 0;
    if (settings.owner) extraLines++;
    if (settings.legalName) extraLines++;
    if (settings.rfc) extraLines++;
    if (settings.address) extraLines++;
    if (settings.phone || settings.whatsapp) extraLines++;
    if (settings.email) extraLines++;
    const headerHeight = Math.max(hasLogo ? 32 : 35, 18 + extraLines * 4 + 4);

    // Header Background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPos, contentWidth, headerHeight, 3, 3, 'F');

    // Business Logo if present
    if (hasLogo) {
      try {
        const logoSize = 24;
        const logoY = yPos + (headerHeight - logoSize) / 2;
        doc.addImage(settings.logo, 'JPEG', margin + 4, logoY, logoSize, logoSize);
      } catch (err) {
        console.error('Error rendering business logo on PDF:', err);
      }
    }

    // Business Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    
    const displayBusinessName = (settings.name && settings.name !== 'EliteCaja') 
      ? settings.name 
      : (settings.owner || settings.name || 'EliteCaja');
      
    doc.text(displayBusinessName, margin + textLeftOffset, yPos + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let infoY = yPos + 18;
    if (settings.owner && settings.owner !== displayBusinessName) { 
      doc.text(`Propietario: ${settings.owner}`, margin + textLeftOffset, infoY); 
      infoY += 4; 
    }
    if (settings.legalName) { doc.text(settings.legalName, margin + textLeftOffset, infoY); infoY += 4; }
    if (settings.rfc) { doc.text(`RFC: ${settings.rfc}`, margin + textLeftOffset, infoY); infoY += 4; }
    if (settings.address) { doc.text(settings.address, margin + textLeftOffset, infoY); infoY += 4; }
    
    let phoneWhatsAppText = '';
    if (settings.phone && settings.whatsapp) {
      phoneWhatsAppText = `Tel: ${settings.phone} | WhatsApp: ${settings.whatsapp}`;
    } else if (settings.phone) {
      phoneWhatsAppText = `Tel: ${settings.phone}`;
    } else if (settings.whatsapp) {
      phoneWhatsAppText = `WhatsApp: ${settings.whatsapp}`;
    }
    
    if (phoneWhatsAppText) {
      doc.text(phoneWhatsAppText, margin + textLeftOffset, infoY);
      infoY += 4;
    }
    if (settings.email) {
      doc.text(`Email: ${settings.email}`, margin + textLeftOffset, infoY);
    }

    // Receipt Title & Info (Right aligned)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isMediaCarta ? 'COTIZACIÓN' : 'COTIZACIÓN (CARTA)', pageWidth - margin - 5, yPos + 12, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(title, pageWidth - margin - 5, yPos + 18, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Folio: #${quote.folio}`, pageWidth - margin - 5, yPos + 24, { align: 'right' });
    doc.text(`Fecha: ${format(new Date(quote.date), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - margin - 5, yPos + 29, { align: 'right' });
    
    yPos += (headerHeight + 8);

    // Client and Seller Info details card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9.5);
    doc.text('INFORMACIÓN DE COTIZACIÓN', margin + 4, yPos + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    
    // Left side: Customer info
    doc.text(`Cliente: ${quote.customerName || 'Público en General'}`, margin + 4, yPos + 11.5);
    doc.text(`Dirección: ${quote.customerAddress || 'No especificada'}`, margin + 4, yPos + 16.5);
    doc.text(`Teléfono: ${quote.customerPhone || 'No especificado'}`, margin + 4, yPos + 21.5);

    // Right side: Salesperson info
    const rightColX = margin + (contentWidth / 2) + 5;
    doc.text(`Vendedor: ${quote.sellerName || 'No especificado'}`, rightColX, yPos + 11.5);
    doc.text(`Tel. Vendedor: ${quote.sellerPhone || 'No especificado'}`, rightColX, yPos + 16.5);

    yPos += 30;

    // Items Table
    const tableData = quote.items.map(item => {
      return [
        item.quantity.toString(),
        item.description,
        formatCurrency(item.unitPrice, settings.currency),
        formatCurrency(item.total, settings.currency)
      ];
    });

    const calculatedBottomMargin = isMediaCarta 
      ? (startY === 0 ? (pageHeight - halfHeight + 15) : 20) 
      : 20;

    autoTable(doc, {
      startY: yPos,
      head: [['Cant.', 'Descripción', 'Precio Unit.', 'Importe']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: isMediaCarta ? 9 : 10, cellPadding: isMediaCarta ? 3 : 4 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin, bottom: calculatedBottomMargin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    const endLimit = isMediaCarta ? (startY === 0 ? halfHeight - 15 : pageHeight - 15) : (pageHeight - 20);
    if (yPos > endLimit) {
      doc.addPage();
      yPos = isMediaCarta ? (startY + 15) : 20;
    }

    // Totals Box
    const totalsX = pageWidth - margin - 60;
    
    // Notes if present on the left
    if (quote.notes) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Notas / Condiciones de Cotización:', margin, yPos);
      const noteLines = doc.splitTextToSize(quote.notes, totalsX - margin - 10);
      doc.text(noteLines, margin, yPos + 5);
    }

    let currentY = yPos;

    // Total Background
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(totalsX - 5, currentY - 4, 65 + 5, 10, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalsX, currentY + 3);
    doc.text(formatCurrency(quote.total, settings.currency), pageWidth - margin - 2, currentY + 3, { align: 'right' });

    // Footer
    yPos = Math.max(yPos + 15, currentY + 15);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text('Este documento es una cotización y no representa un comprobante fiscal de venta.', pageWidth / 2, yPos, { align: 'center' });
  };

  if (formatType === 'media-carta') {
    drawReceipt(0, 'COPIA CLIENTE', true);
    drawReceipt(halfHeight, 'COPIA INTERNA', true);
  } else {
    drawReceipt(0, 'ORIGINAL', false);
  }

  doc.save(`Cotizacion_${quote.folio}.pdf`);
};
