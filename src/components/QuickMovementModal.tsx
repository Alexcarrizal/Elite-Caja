import React, { useState } from 'react';
import { useStore, defaultSettings } from '../store/useStore';
import { X, DollarSign, Save, ArrowUpCircle, ArrowDownCircle, CreditCard, Banknote, Smartphone, Receipt, Printer, MessageCircle, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethodType, Remission } from '../types';
import { formatCurrency, capitalizeFirst } from '../utils/format';
import { generateRemissionPDF } from '../utils/pdf';

interface QuickMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'entrada' | 'salida';
}

export default function QuickMovementModal({ isOpen, onClose, type }: QuickMovementModalProps) {
  const { addExtraIncome, addWithdrawal, cashRegisters, settings = defaultSettings, customers = [], addCustomer } = useStore();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Efectivo');
  
  // New entry fields
  const [remissionNote, setRemissionNote] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  
  // Success & Print states
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRegisteredIncome, setLastRegisteredIncome] = useState<{
    id: string;
    amount: number;
    description: string;
    notes?: string;
    paymentMethod: PaymentMethodType;
    customerName?: string;
    customerId?: string;
    phone?: string;
    commission?: number;
    commissionPayer?: 'cliente' | 'vendedor';
    term?: string;
  } | null>(null);
  
  // Commission & Change states
  const [commissionTerm, setCommissionTerm] = useState<string>('Contado');
  const [commissionPayer, setCommissionPayer] = useState<'cliente' | 'vendedor'>('cliente');
  const [cashReceived, setCashReceived] = useState<number>(0);

  const isOpenRegister = cashRegisters.some(r => r.status === 'open');

  // Calculations for 'entrada'
  const numAmount = parseFloat(amount) || 0;
  let commissionAmount = 0;
  
  const getCommissionForRate = (testRate: number) => {
    return numAmount * testRate * (1 + ((settings.taxRate || 16) / 100));
  };

  if (type === 'entrada' && (paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago')) {
    let rate = 0;
    if (paymentMethod === 'CLIP') {
      switch (commissionTerm) {
        case 'Contado': rate = 0.036; break;
        case '3 MSI': rate = 0.054; break;
        case '6 MSI': rate = 0.084; break;
        case '9 MSI': rate = 0.114; break;
        case '12 MSI': rate = 0.144; break;
        default: rate = 0.036;
      }
    } else if (paymentMethod === 'Mercado Pago') {
      rate = 0.035;
    }
    commissionAmount = getCommissionForRate(rate);
  }

  const totalToCharge = numAmount + (commissionPayer === 'cliente' ? commissionAmount : 0);
  const change = cashReceived >= totalToCharge ? cashReceived - totalToCharge : 0;

  // Reset success state when the modal closes or is reopened
  React.useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
      setLastRegisteredIncome(null);
    }
  }, [isOpen]);

  const handlePrintRemission = (formatType: 'media-carta' | 'carta-completa' | 'ticket-80mm' | 'ticket-58mm') => {
    if (!lastRegisteredIncome) return;
    
    const remission: Remission = {
      id: lastRegisteredIncome.id,
      folio: lastRegisteredIncome.id.toUpperCase(),
      date: new Date().toISOString(),
      customerName: lastRegisteredIncome.customerName || 'Público General',
      customerId: lastRegisteredIncome.customerId,
      items: [
        {
          id: '1',
          description: lastRegisteredIncome.description,
          quantity: 1,
          unitPrice: lastRegisteredIncome.amount,
          total: lastRegisteredIncome.amount
        }
      ],
      total: lastRegisteredIncome.amount,
      notes: lastRegisteredIncome.notes
    };
    
    generateRemissionPDF(remission, settings, formatType);
  };

  const handleSendWhatsApp = () => {
    if (!lastRegisteredIncome) return;
    
    const cleanPhone = lastRegisteredIncome.phone ? lastRegisteredIncome.phone.replace(/\D/g, "") : "";
    const customerName = lastRegisteredIncome.customerName || "Cliente";
    
    const message = `Hola ${customerName}, enviamos el comprobante de tu Nota de Remisión #${lastRegisteredIncome.id.toUpperCase()} por un total de ${formatCurrency(lastRegisteredIncome.amount, settings.currency)}. ¡Gracias por tu preferencia!`;
    const url = `https://api.whatsapp.com/send?phone=52${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOpenRegister) {
      toast.error('Debe abrir la caja primero');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }

    if (!description.trim()) {
      toast.error('Ingrese un concepto');
      return;
    }
    
    if (type === 'entrada' && paymentMethod === 'Efectivo' && cashReceived > 0 && cashReceived < totalToCharge) {
      toast.error('El efectivo recibido es menor al total.');
      return;
    }

    if (type === 'entrada') {
      let finalCustomerId = customerId || undefined;
      let finalCustomerName = undefined;

      if (isCreatingCustomer) {
        if (!newCustomerName.trim()) {
          toast.error('Ingrese el nombre del cliente');
          return;
        }

        // Check if customer already exists by name
        const existing = customers.find(c => c.name.toLowerCase() === newCustomerName.trim().toLowerCase());
        if (existing) {
          finalCustomerId = existing.id;
          finalCustomerName = existing.name;
        } else {
          // Add new customer
          addCustomer({
            name: newCustomerName.trim(),
            phone: newCustomerPhone.trim() || undefined,
            email: newCustomerEmail.trim() || undefined,
            points: 0
          });

          // Fetch updated state synchronously
          const updatedCustomers = useStore.getState().customers;
          const newlyCreated = updatedCustomers.find(c => c.name.toLowerCase() === newCustomerName.trim().toLowerCase());
          if (newlyCreated) {
            finalCustomerId = newlyCreated.id;
            finalCustomerName = newlyCreated.name;
          } else {
            finalCustomerName = newCustomerName.trim();
          }
        }
      } else if (customerId) {
        const selectedCustomer = customers.find(c => c.id === customerId);
        if (selectedCustomer) {
          finalCustomerName = selectedCustomer.name;
        }
      }

      const incomeId = Math.random().toString(36).substr(2, 9);

      addExtraIncome(
        totalToCharge, 
        description, 
        notes, 
        paymentMethod,
        undefined, // Remission note eliminated
        finalCustomerId,
        finalCustomerName,
        incomeId
      );
      toast.success('Ingreso registrado correctamente');

      let phone = undefined;
      if (finalCustomerId) {
        phone = customers.find(c => c.id === finalCustomerId)?.phone || newCustomerPhone.trim() || undefined;
      } else if (isCreatingCustomer && newCustomerPhone.trim()) {
        phone = newCustomerPhone.trim();
      }

      setLastRegisteredIncome({
        id: incomeId,
        amount: totalToCharge,
        description,
        notes,
        paymentMethod,
        customerName: finalCustomerName,
        customerId: finalCustomerId,
        phone,
        commission: (paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago') ? commissionAmount : undefined,
        commissionPayer: (paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago') ? commissionPayer : undefined,
        term: paymentMethod === 'CLIP' ? commissionTerm : undefined
      });
      setShowSuccess(true);
    } else {
      addWithdrawal(numAmount, description, notes);
      toast.success('Retiro registrado correctamente');
      onClose();
    }

    // Reset standard state
    setDescription('');
    setAmount('');
    setNotes('');
    setPaymentMethod('Efectivo');
    setCashReceived(0);
    setCommissionTerm('Contado');
    setRemissionNote('');
    setCustomerId('');
    setIsCreatingCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
  };

  if (!isOpen) return null;

  if (showSuccess && lastRegisteredIncome) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm my-8 overflow-hidden border border-gray-150 dark:border-gray-750">
          {/* Header */}
          <div className="p-4 flex justify-between items-center text-white bg-emerald-600">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 animate-pulse" />
              <h2 className="text-lg font-bold">¡Ingreso Registrado!</h2>
            </div>
            <button 
              onClick={() => {
                setShowSuccess(false);
                onClose();
                setLastRegisteredIncome(null);
              }} 
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 text-center">
            {/* Success Checkmark Circle */}
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2 relative">
              <div className="w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">¡Cobro Exitoso!</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-3">
                Total cobrado: <span className="text-emerald-650 dark:text-emerald-400 font-bold text-lg">{formatCurrency(lastRegisteredIncome.amount, settings.currency)}</span>
              </p>

              {lastRegisteredIncome.commission !== undefined && lastRegisteredIncome.commission > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-700/60 p-3 rounded-2xl mb-3 space-y-1 text-left max-w-[280px] mx-auto shadow-inner">
                  <div className="flex justify-between">
                    <span>Monto base:</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {formatCurrency(lastRegisteredIncome.amount - (lastRegisteredIncome.commissionPayer === 'cliente' ? lastRegisteredIncome.commission : 0), settings.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comisión ({lastRegisteredIncome.paymentMethod} {lastRegisteredIncome.term || ''}):</span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold">
                      +{formatCurrency(lastRegisteredIncome.commission, settings.currency)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5 pt-1.5 border-t border-gray-150 dark:border-gray-800">
                    {lastRegisteredIncome.commissionPayer === 'cliente' ? 'Pagado por el cliente' : 'Absorbido por el vendedor'}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Concepto: {lastRegisteredIncome.description}
              </p>
            </div>

            {/* Print layout selector box */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-700/50 rounded-2xl p-4 text-left">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mb-3 text-center">
                Configuración de Impresión
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintRemission('media-carta')}
                  className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center shadow-lg shadow-blue-600/10"
                  title="Imprimir duplicado en media hoja carta"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-white shrink-0" />
                  Media Carta
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintRemission('carta-completa')}
                  className="py-2.5 px-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                  title="Imprimir nota en hoja completa"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-indigo-500 shrink-0" />
                  Carta Completa
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {lastRegisteredIncome.phone && (
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-xl transition-all flex items-center justify-center shadow-sm shadow-[#25D366]/20"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enviar WhatsApp
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                  setLastRegisteredIncome(null);
                }}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center shadow-md shadow-emerald-500/20"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md my-8">
        <div className={`p-4 flex justify-between items-center text-white ${type === 'entrada' ? 'bg-emerald-600' : 'bg-rose-600'} rounded-t-2xl`}>
          <div className="flex items-center gap-2">
            {type === 'entrada' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
            <h2 className="text-xl font-bold">Nueva {type === 'entrada' ? 'Entrada' : 'Salida'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concepto / Descripción</label>
            <input 
              required
              type="text"
              placeholder="Ej: Venta rápida, Pago de servicio..."
              value={description}
              onChange={(e) => setDescription(capitalizeFirst(e.target.value))}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad / Monto base</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-lg font-bold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          {type === 'entrada' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                {(settings?.acceptedPaymentMethods || ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto']).map(method => {
                  let Icon = Banknote;
                  if (method === 'Tarjeta') Icon = CreditCard;
                  if (method === 'Transferencia') Icon = Smartphone;
                  if (method === 'Mixto') Icon = Receipt;
                  if (method === 'Mercado Pago') Icon = Smartphone;
                  if (method === 'CLIP') Icon = Smartphone;

                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method as PaymentMethodType)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-colors ${
                        paymentMethod === method 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300' 
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span>{method}</span>
                    </button>
                  );
                })}
              </div>

              {(paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago') && (
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/15 border border-orange-200 dark:border-orange-900/40 rounded-xl space-y-2.5">
                  {paymentMethod === 'CLIP' && (
                    <div>
                      <label className="block text-[10px] font-bold text-orange-900 dark:text-orange-400 mb-1 uppercase tracking-wide">Plazo de Pago</label>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: 'Contado', rate: '3.6%' },
                          { id: '3 MSI', rate: '5.4%' },
                          { id: '6 MSI', rate: '8.4%' },
                          { id: '9 MSI', rate: '11.4%' },
                          { id: '12 MSI', rate: '14.4%' }
                        ].map(term => (
                          <button
                            key={term.id}
                            type="button"
                            onClick={() => setCommissionTerm(term.id)}
                            className={`p-1 text-center rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${
                              commissionTerm === term.id
                                ? 'bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-500/20'
                                : 'bg-white border-orange-200 text-orange-800 hover:bg-orange-100 dark:bg-gray-800 dark:border-orange-900/30 dark:text-orange-300'
                            }`}
                          >
                            <div className="font-extrabold text-[9px] leading-tight truncate max-w-full text-center">{term.id}</div>
                            <div className="text-[8px] opacity-85 leading-tight truncate text-center">{term.rate}</div>
                            <div 
                              className="text-[8px] font-black mt-0.5 px-0.5 py-0.2 rounded leading-tight text-center truncate max-w-full"
                              style={{
                                color: commissionTerm === term.id ? '#ffffff' : '#d97706',
                                backgroundColor: commissionTerm === term.id ? 'rgba(255,255,255,0.15)' : 'rgba(217,119,6,0.1)'
                              }}
                            >
                              +{formatCurrency(getCommissionForRate(
                                term.id === 'Contado' ? 0.036 :
                                term.id === '3 MSI' ? 0.054 :
                                term.id === '6 MSI' ? 0.084 :
                                term.id === '9 MSI' ? 0.114 :
                                term.id === '12 MSI' ? 0.144 : 0.036
                              ), settings.currency)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-orange-900 dark:text-orange-400 mb-1 uppercase tracking-wide">¿Quién paga la comisión?</label>
                    <div className="flex rounded-lg overflow-hidden border border-orange-200 dark:border-orange-900/30">
                      <button
                        type="button"
                        onClick={() => setCommissionPayer('cliente')}
                        className={`flex-1 py-1 text-xs font-bold transition-colors ${
                          commissionPayer === 'cliente'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-orange-800 hover:bg-orange-50 dark:bg-gray-800 dark:text-orange-300'
                        }`}
                      >
                        Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommissionPayer('vendedor')}
                        className={`flex-1 py-1 text-xs font-bold transition-colors ${
                          commissionPayer === 'vendedor'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-orange-850 hover:bg-orange-50 dark:bg-gray-800 dark:text-orange-300'
                        }`}
                      >
                        Vendedor
                      </button>
                    </div>
                  </div>

                  <div className="p-2 bg-orange-100/40 dark:bg-orange-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-orange-950 dark:text-orange-400 uppercase tracking-wider leading-none">
                        Comisión {paymentMethod}
                      </span>
                      <span className="text-[9px] text-orange-800/80 dark:text-orange-400/75 mt-1 leading-none">
                        {paymentMethod === 'CLIP' ? commissionTerm : '3.5% + IVA'} &bull; {commissionPayer === 'cliente' ? 'Paga Cliente' : 'Absorbe Vendedor'}
                      </span>
                      {commissionPayer === 'vendedor' && (
                        <span className="text-[9px] font-bold text-red-500 dark:text-red-400 mt-1 leading-none">
                          Neto a recibir: {formatCurrency(numAmount - commissionAmount, settings.currency)}
                        </span>
                      )}
                    </div>
                    <span className="text-base font-black text-orange-800 dark:text-orange-400 leading-none">
                      {formatCurrency(commissionAmount, settings.currency)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'Efectivo' && (
                <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Efectivo Recibido (Opcional para cambio)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2 font-bold bg-white dark:bg-gray-800 border box-border border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-0 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                  {cashReceived > 0 && (
                    <div className="flex justify-between items-center mt-2 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Cambio:</span>
                      <span className={`font-bold ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {formatCurrency(change, settings.currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4 border-t border-gray-150 dark:border-gray-700/50 pt-4">
                <h4 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Información del Cliente
                </h4>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cliente (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCustomer(!isCreatingCustomer);
                        setNewCustomerName('');
                        setNewCustomerPhone('');
                        setNewCustomerEmail('');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      {isCreatingCustomer ? "Ver lista de clientes" : "+ Registrar nuevo cliente"}
                    </button>
                  </div>

                  {!isCreatingCustomer ? (
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    >
                      <option value="">-- Sin Cliente --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Nuevo Cliente
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                          Nombre *
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre del cliente"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(capitalizeFirst(e.target.value))}
                          className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            placeholder="10 dígitos"
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                            Correo
                          </label>
                          <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={newCustomerEmail}
                            onChange={(e) => setNewCustomerEmail(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-bold text-gray-700 dark:text-gray-300">Total a registrar:</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalToCharge, settings.currency)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas (Opcional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(capitalizeFirst(e.target.value))}
              placeholder="Detalles adicionales..."
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                type === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'
              }`}
            >
              <Save className="w-5 h-5" />
              {type === 'entrada' ? 'Cobrar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
