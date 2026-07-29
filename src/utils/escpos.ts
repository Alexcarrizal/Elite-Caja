import { BusinessSettings } from '../types';
import { TicketData } from './pdf';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from './format';

/**
 * Utility to convert text string to CP850 / WPC1252 bytes for ESC/POS printer.
 * Replaces special Spanish characters (á, é, í, ó, ú, ñ, ¿, ¡, etc.) with corresponding bytes.
 */
function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = text.charCodeAt(i);
    
    if (code < 128) {
      bytes.push(code);
    } else {
      // Map Spanish accented characters to WPC1252 / CP850
      switch (char) {
        case 'á': bytes.push(0xE1); break;
        case 'Á': bytes.push(0xC1); break;
        case 'é': bytes.push(0xE9); break;
        case 'É': bytes.push(0xC9); break;
        case 'í': bytes.push(0xED); break;
        case 'Í': bytes.push(0xCD); break;
        case 'ó': bytes.push(0xF3); break;
        case 'Ó': bytes.push(0xD3); break;
        case 'ú': bytes.push(0xFA); break;
        case 'Ú': bytes.push(0xDA); break;
        case 'ñ': bytes.push(0xF1); break;
        case 'Ñ': bytes.push(0xD1); break;
        case 'ü': bytes.push(0xFC); break;
        case 'Ü': bytes.push(0xDC); break;
        case '¿': bytes.push(0xBF); break;
        case '¡': bytes.push(0xA1); break;
        default:
          // Strip accent / normalize fallback ASCII
          const norm = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          bytes.push(norm.length > 0 ? norm.charCodeAt(0) : 0x3F); // 0x3F = '?'
          break;
      }
    }
  }
  return bytes;
}

/**
 * Word wrap text to fit within given max width in characters.
 */
function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxWidth) {
        let remaining = word;
        while (remaining.length > maxWidth) {
          lines.push(remaining.substring(0, maxWidth));
          remaining = remaining.substring(maxWidth);
        }
        currentLine = remaining;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

/**
 * Pad row with two columns (left aligned text, right aligned text)
 */
function formatTwoColumns(left: string, right: string, width: number): string {
  const maxLeftWidth = width - right.length - 1;
  if (maxLeftWidth <= 0) {
    return (left.substring(0, width - right.length) + right).padEnd(width);
  }
  const truncatedLeft = left.length > maxLeftWidth ? left.substring(0, maxLeftWidth) : left;
  const spaces = width - truncatedLeft.length - right.length;
  return truncatedLeft + ' '.repeat(Math.max(1, spaces)) + right;
}

/**
 * Generate raw ESC/POS binary command buffer for 80mm or 58mm POS printers.
 */
export function buildESCPOSBuffer(
  data: TicketData,
  settings: BusinessSettings,
  formatType: 'ticket-80mm' | 'ticket-58mm' = 'ticket-80mm'
): Uint8Array {
  const is80mm = formatType === 'ticket-80mm';
  const width = is80mm ? 48 : 32; // Character width (48 columns for 80mm, 32 for 58mm)
  const separator = '-'.repeat(width);

  const displayBusinessName = (settings.name && settings.name !== 'EliteCaja')
    ? settings.name
    : (settings.owner || settings.name || 'EliteCaja');

  const formattedDate = typeof data.date === 'string'
    ? data.date
    : format(new Date(data.date), 'dd/MM/yyyy HH:mm', { locale: es });

  const bytes: number[] = [];

  // ESC/POS Commands
  const ESC = 0x1B;
  const GS = 0x1D;

  const initPrinter = [ESC, 0x40]; // ESC @ (Initialize)
  const setCodeTable = [ESC, 0x74, 0x10]; // ESC t 16 (WPC1252 / Latin 1)
  const alignLeft = [ESC, 0x61, 0x00];
  const alignCenter = [ESC, 0x61, 0x01];
  const alignRight = [ESC, 0x61, 0x02];
  const boldOn = [ESC, 0x45, 0x01];
  const boldOff = [ESC, 0x45, 0x00];
  const doubleHeightOn = [GS, 0x21, 0x01];
  const doubleWidthHeightOn = [GS, 0x21, 0x11];
  const normalText = [GS, 0x21, 0x00];
  const lineFeed = [0x0A];

  const addBytes = (arr: number[]) => bytes.push(...arr);
  const addText = (text: string) => bytes.push(...textToBytes(text));
  const addLine = (text: string = '') => {
    addText(text);
    addBytes(lineFeed);
  };

  // 1. Initialize Printer
  addBytes(initPrinter);
  addBytes(setCodeTable);

  // 2. Business Header (Centered)
  addBytes(alignCenter);
  addBytes(boldOn);
  addBytes(doubleWidthHeightOn);
  addLine(displayBusinessName.toUpperCase());
  addBytes(normalText);
  addBytes(boldOff);

  // Business Details
  if (settings.owner && settings.owner !== displayBusinessName) {
    addLine(`Prop: ${settings.owner}`);
  }
  if (settings.legalName) addLine(settings.legalName);
  if (settings.rfc) addLine(`RFC: ${settings.rfc}`);
  if (settings.address) {
    wrapText(settings.address, width).forEach(line => addLine(line));
  }

  let contactText = '';
  if (settings.phone && settings.whatsapp) {
    contactText = `Tel: ${settings.phone} | WA: ${settings.whatsapp}`;
  } else if (settings.phone) {
    contactText = `Tel: ${settings.phone}`;
  } else if (settings.whatsapp) {
    contactText = `WA: ${settings.whatsapp}`;
  }
  if (contactText) addLine(contactText);
  if (settings.email) addLine(`Email: ${settings.email}`);

  // Separator
  addLine(separator);

  // 3. Ticket Header Details
  addBytes(alignCenter);
  addBytes(boldOn);
  addLine(data.title.toUpperCase());
  addBytes(boldOff);

  addBytes(alignLeft);
  addLine(`FOLIO: #${data.id}`);
  addLine(`FECHA: ${formattedDate}`);
  if (data.customerName) {
    addLine(`CLIENTE: ${data.customerName}`);
  }

  addLine(separator);

  // 4. Items Table
  addBytes(boldOn);
  addLine(formatTwoColumns('Descripción', 'Importe', width));
  addBytes(boldOff);

  data.items.forEach(item => {
    // Clean name lines
    const rawName = item.name.replace(/\n/g, ' ');
    const wrappedName = wrapText(rawName, width);

    // Print item name
    wrappedName.forEach(line => addLine(line));

    // Quantity, price & total row
    const qtyPriceStr = `  ${item.quantity} x ${formatCurrency(item.unitPrice, settings.currency)}${item.discount ? ` (-${item.discount}%)` : ''}`;
    const totalStr = formatCurrency(item.total, settings.currency);
    addLine(formatTwoColumns(qtyPriceStr, totalStr, width));
  });

  addLine(separator);

  // 5. Totals Section
  addBytes(alignRight);
  if (data.subtotal > 0 && Math.abs(data.subtotal - data.total) > 0.01) {
    addLine(formatTwoColumns('Subtotal:', formatCurrency(data.subtotal, settings.currency), width));
  }
  if (data.tax > 0) {
    addLine(formatTwoColumns(`IVA (${settings.taxRate}%):`, formatCurrency(data.tax, settings.currency), width));
  }
  if (data.commission && data.commissionPayer === 'cliente') {
    const method = data.paymentMethod || 'Tarjeta';
    addLine(formatTwoColumns(`Comisión (${method}):`, formatCurrency(data.commission, settings.currency), width));
  }

  addBytes(boldOn);
  addBytes(doubleHeightOn);
  addLine(formatTwoColumns('TOTAL:', formatCurrency(data.total, settings.currency), width));
  addBytes(normalText);
  addBytes(boldOff);

  // 6. Notes & Footer
  if (data.notes) {
    addBytes(alignLeft);
    addLine(separator);
    addBytes(boldOn);
    addLine('Notas / Condiciones:');
    addBytes(boldOff);
    wrapText(data.notes, width).forEach(line => addLine(line));
  }

  if (settings.receiptMessage || data.disclaimer) {
    addBytes(alignCenter);
    addLine(separator);
    if (settings.receiptMessage) {
      settings.receiptMessage.split('\n').forEach(msgLine => {
        wrapText(msgLine, width).forEach(wLine => addLine(wLine));
      });
    }
    if (data.disclaimer) {
      wrapText(data.disclaimer, width).forEach(dLine => addLine(dLine));
    }
  }

  // 7. ESC/POS Cut Command (Immediate paper cut after last line)
  addBytes([GS, 0x56, 0x42, 0x00]); // GS V 66 0 (Cut paper)
  addBytes([ESC, 0x69]); // Fallback ESC i (Full cut on older POS printers)

  // 9. Kick Cash Drawer (ESC p 0 25 250)
  addBytes([ESC, 0x70, 0x00, 0x19, 0xFA]);

  return new Uint8Array(bytes);
}

/**
 * Print ESC/POS buffer directly using Web Serial API (USB / Serial POS Thermal Printers).
 */
export async function printESCPOSWebSerial(buffer: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (!('serial' in navigator)) {
    return {
      success: false,
      error: 'Web Serial API no está soportado en este navegador. Utiliza Google Chrome o Microsoft Edge.'
    };
  }

  try {
    // Request port from user
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 }); // Standard POS printer baud rate

    const writer = port.writable.getWriter();
    await writer.write(buffer);
    
    // Release lock and close
    writer.releaseLock();
    await port.close();

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { 
        success: false, 
        error: 'No se detectó ningún puerto serie COM/USB libre. Si tu impresora ya está instalada en Windows, utiliza el botón "Imprimir con Impresora de Windows".' 
      };
    }
    console.error('Error al imprimir vía Web Serial:', err);
    return { success: false, error: err.message || 'Error al comunicarse con la impresora.' };
  }
}

/**
 * Print ESC/POS buffer directly using WebUSB API.
 */
export async function printESCPOSWebUSB(buffer: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (!('usb' in navigator)) {
    return {
      success: false,
      error: 'WebUSB API no está soportado en este navegador.'
    };
  }

  try {
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Find OUT endpoint for printing
    const endpoints = device.configuration.interfaces[0].alternate.endpoints;
    const outEndpoint = endpoints.find((e: any) => e.direction === 'out');

    if (!outEndpoint) {
      await device.close();
      return { success: false, error: 'No se encontró el endpoint de salida en la impresora USB.' };
    }

    await device.transferOut(outEndpoint.endpointNumber, buffer);
    await device.close();

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: 'No se seleccionó dispositivo USB.' };
    }
    console.error('Error al imprimir vía WebUSB:', err);
    return { success: false, error: err.message || 'Error en la conexión USB de la impresora.' };
  }
}

/**
 * Print ticket using direct native ESC/POS commands over Web Serial / WebUSB.
 */
export async function printTicketESCPOSDirect(
  data: TicketData,
  settings: BusinessSettings,
  formatType: 'ticket-80mm' | 'ticket-58mm' = 'ticket-80mm'
): Promise<{ success: boolean; error?: string }> {
  const buffer = buildESCPOSBuffer(data, settings, formatType);

  // Try Web Serial first
  if ('serial' in navigator) {
    const result = await printESCPOSWebSerial(buffer);
    if (result.success) return result;
    
    // If user cancelled, don't auto retry USB
    if (result.error && result.error.includes('No se seleccionó')) {
      return result;
    }
  }

  // Fallback to WebUSB
  if ('usb' in navigator) {
    const usbResult = await printESCPOSWebUSB(buffer);
    if (usbResult.success) return usbResult;
  }

  return {
    success: false,
    error: 'No se pudo conectar con la impresora por Web Serial o WebUSB. Asegúrate de estar usando Chrome/Edge y conectar la impresora térmica por USB.'
  };
}

/**
 * Download raw .bin / .prn file for raw printing tools or spoolers.
 */
export function downloadESCPOSFile(buffer: Uint8Array, filename: string = 'ticket.bin') {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


