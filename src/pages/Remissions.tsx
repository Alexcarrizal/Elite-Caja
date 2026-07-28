import React, { useState } from 'react';
import { useStore, defaultSettings } from '../store/useStore';
import { Plus, Search, FileText, Trash2, ArrowLeft, Printer, Banknote, CreditCard, Smartphone, Receipt, Check, ArrowRight, MessageCircle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/format';
import { Remission, RemissionItem, PaymentMethodType } from '../types';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { generateRemissionPDF } from '../utils/pdf';
import { AnimatePresence, motion } from 'motion/react';

export default function Remissions() {
  const { 
    remissions = [], 
    products = [],
    addRemission, 
    updateRemission,
    deleteRemission, 
    settings = defaultSettings,
    currentUser
  } = useStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser?.role === 'Cajero') {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleStartEdit = (remission: Remission) => {
    setEditingId(remission.id);
    setCustomerName(remission.customerName);
    setNotes(remission.notes || '');
    setItems([...remission.items].map(item => ({ ...item })));
    setPaymentMethod(remission.paymentMethod || 'Efectivo');
    setCommissionTerm(remission.term || 'Contado');
    setCommissionPayer(remission.commissionPayer || 'cliente');
    setIsCreating(true);
  };

  if (currentUser?.role === 'Cajero') {
    return null;
  }
  
  // New Remission State
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RemissionItem[]>([]);
  
  // Payment dynamic states (same as POS)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Efectivo');
  const [commissionTerm, setCommissionTerm] = useState<string>('Contado');
  const [commissionPayer, setCommissionPayer] = useState<'cliente' | 'vendedor'>('cliente');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdRemission, setCreatedRemission] = useState<Remission | null>(null);
  
  // New Item State
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemWarranty, setNewItemWarranty] = useState('');

  const filteredRemissions = remissions.filter(r => 
    r.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  ).reverse();

  const handleDescChange = (val: string) => {
    setNewItemDesc(val);
    const matchedProduct = products.find(p => p.name.toLowerCase() === val.toLowerCase());
    if (matchedProduct) {
      setNewItemPrice(matchedProduct.salePrice);
      if (matchedProduct.warranty) {
        setNewItemWarranty(matchedProduct.warranty);
      }
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc || newItemQty <= 0 || newItemPrice < 0) return;

    const newItem: RemissionItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: newItemDesc,
      quantity: newItemQty,
      unitPrice: newItemPrice,
      total: newItemQty * newItemPrice,
      warranty: newItemWarranty.trim() || undefined
    };

    setItems([...items, newItem]);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemWarranty('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  const getCommissionForRate = (testRate: number) => {
    return subtotal * testRate * (1 + (settings.taxRate / 100));
  };

  let commissionAmount = 0;
  if (paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago') {
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

  const finalTotal = subtotal + (commissionPayer === 'cliente' ? commissionAmount : 0);

  const handleSaveRemission = () => {
    if (items.length === 0) {
      alert('Agrega al menos un artículo a la nota de remisión.');
      return;
    }

    if (editingId) {
      const originalRemission = remissions.find(r => r.id === editingId);
      if (!originalRemission) return;

      const updatedRemission: Remission = {
        ...originalRemission,
        customerName: customerName || 'Público en General',
        items,
        total: finalTotal,
        notes,
        paymentMethod,
        commission: commissionAmount,
        commissionPayer: paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago' ? commissionPayer : undefined,
        term: paymentMethod === 'CLIP' ? commissionTerm : undefined
      };

      updateRemission(editingId, updatedRemission);
      setCreatedRemission(updatedRemission);
      setShowSuccessModal(true);
    } else {
      const folio = `REM-${(remissions.length + 1).toString().padStart(4, '0')}`;

      const newRemission: Remission = {
        id: Math.random().toString(36).substr(2, 9),
        folio,
        date: new Date().toISOString(),
        customerName: customerName || 'Público en General',
        items,
        total: finalTotal,
        notes,
        paymentMethod,
        commission: commissionAmount,
        commissionPayer: paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago' ? commissionPayer : undefined,
        term: paymentMethod === 'CLIP' ? commissionTerm : undefined
      };

      addRemission(newRemission);
      setCreatedRemission(newRemission);
      setShowSuccessModal(true);
    }
  };

  const handleNewRemission = () => {
    setShowSuccessModal(false);
    setCreatedRemission(null);
    setIsCreating(false);
    setEditingId(null);
    setCustomerName('');
    setNotes('');
    setItems([]);
    setPaymentMethod('Efectivo');
    setCommissionTerm('Contado');
    setCommissionPayer('cliente');
  };

  const handleSendWhatsApp = () => {
    if (!createdRemission) return;
    const message = `Hola, te compartimos tu Nota de Remisión con el Folio *${createdRemission.folio}* de *${settings.name || 'nuestra sucursal'}* por un total de *${formatCurrency(createdRemission.total, settings.currency)}*. ¡Gracias por tu preferencia!`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handlePrintRemission = (remission: Remission, formatType: 'media-carta' | 'carta-completa' | 'ticket-80mm' | 'ticket-58mm' = 'media-carta') => {
    generateRemissionPDF(remission, settings, formatType);
  };

  if (isCreating) {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingId ? `Editar Nota de Remisión: ${remissions.find(r => r.id === editingId)?.folio || ''}` : 'Nueva Nota de Remisión'}
            </h1>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={handleSaveRemission}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-200 dark:shadow-none flex items-center gap-2 text-sm"
              title={editingId ? "Guardar cambios realizados a la de nota remisión" : "Proceder al cobro y registro de la nota de remisión"}
            >
              <Banknote className="w-5 h-5" />
              {editingId ? 'Guardar Cambios' : 'Cobrar'}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-750 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-colors border border-gray-200 dark:border-gray-650 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Agregar Concepto</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                    <input
                      type="text"
                      required
                      value={newItemDesc}
                      onChange={(e) => handleDescChange(e.target.value)}
                      list="product-suggestions"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="Ej. Laptop HP 15 o busca un producto"
                    />
                    <datalist id="product-suggestions">
                      {products.map((p) => (
                        <option key={p.id} value={p.name}>
                          {formatCurrency(p.salePrice)} - {p.warranty ? `Garantía: ${p.warranty}` : 'Sin garantía registrada'}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Garantía (Opcional)</label>
                    <input
                      type="text"
                      value={newItemWarranty}
                      onChange={(e) => setNewItemWarranty(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="Ej. 12 meses, 1 año, etc."
                    />
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cant.</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Unit.</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={newItemPrice === 0 ? '' : newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors h-[42px] flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/15"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Conceptos Agregados</h3>
                {items.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No hay conceptos agregados aún.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.description}</p>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {item.quantity} x {formatCurrency(item.unitPrice, settings.currency)}
                            </span>
                            {item.warranty && (
                              <span className="inline-flex items-center text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md">
                                Garantía: {item.warranty}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(item.total, settings.currency)}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Detalles</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cliente (Opcional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="Público en General"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas Adicionales</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                    placeholder="Garantía, condiciones, etc."
                    rows={3}
                  />
                </div>
                {/* Forma de Pago Selector */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Forma de Cobro</label>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {(settings.acceptedPaymentMethods || ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto']).map(method => {
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
                          className={`flex items-center justify-start px-2.5 py-2 rounded-xl border font-bold text-xs transition-colors gap-2 ${
                            paymentMethod === method 
                              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/45 dark:border-blue-800 dark:text-blue-300' 
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                          <span className="truncate">{method}</span>
                        </button>
                      );
                    })}
                  </div>

                  {(paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago') && (
                    <div className="mb-2.5 p-2.5 bg-orange-50 dark:bg-orange-900/15 border border-orange-200 dark:border-orange-900/40 rounded-xl space-y-2.5">
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
                                    : 'bg-white border-orange-200 text-orange-850 hover:bg-orange-50 dark:bg-gray-800 dark:border-orange-900/30 dark:text-orange-300'
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
                        </div>
                        <span className="text-base font-black text-orange-800 dark:text-orange-400 leading-none">
                          {formatCurrency(commissionAmount, settings.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal, settings.currency)}</span>
                  </div>

                  {(paymentMethod === 'CLIP' || paymentMethod === 'Mercado Pago') && commissionAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-orange-600 dark:text-orange-400 font-medium select-none">
                        Comisión {paymentMethod} ({commissionPayer === 'cliente' ? 'Paga Cliente' : 'Absorbe Vendedor'})
                      </span>
                      <span className={`font-bold ${commissionPayer === 'cliente' ? 'text-orange-600 dark:text-orange-400' : 'text-red-500 line-through/opacity-50'}`}>
                        {commissionPayer === 'cliente' ? '+' : ''}{formatCurrency(commissionAmount, settings.currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {formatCurrency(finalTotal, settings.currency)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveRemission}
                    className="w-full mt-4 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 text-base"
                    title={editingId ? "Guardar cambios realizados" : "Registrar y Cobrar nota de remisión"}
                  >
                    <Banknote className="w-5 h-5" />
                    {editingId ? 'Guardar Cambios' : 'Cobrar y Registrar Nota'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic POS-like Success Modal */}
        <AnimatePresence>
          {showSuccessModal && createdRemission && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-gray-905 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-800 text-center relative overflow-hidden my-8"
                style={{ backgroundColor: '#111827' }}
              >
                {/* Decorative background blur */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                  {editingId ? '¡Nota de Remisión Actualizada!' : '¡Cobro Registrado!'}
                </h2>
                <div className="mb-4">
                  <p className="text-gray-450 font-medium text-xs uppercase tracking-wider mb-1">
                    Nota de Remisión: <span className="text-emerald-450 font-bold">{createdRemission.folio}</span>
                  </p>
                  <p className="text-gray-300 font-medium text-sm">
                    Total cobrado: <span className="text-emerald-400 font-extrabold text-lg">{formatCurrency(createdRemission.total, settings.currency)}</span>
                  </p>
                  
                  {createdRemission.commission !== undefined && createdRemission.commission > 0 && (
                    <div className="text-xs text-gray-350 bg-gray-800/60 p-3 rounded-2xl border border-gray-700/40 mt-2 space-y-1 text-left max-w-[280px] mx-auto shadow-inner">
                      <div className="flex justify-between">
                        <span>Monto base:</span>
                        <span className="text-gray-200">
                          {formatCurrency(createdRemission.total - (createdRemission.commissionPayer === 'cliente' ? createdRemission.commission : 0), settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Comisión ({createdRemission.paymentMethod} {createdRemission.term || ''}):</span>
                        <span className="text-orange-400 font-bold">
                          +{formatCurrency(createdRemission.commission, settings.currency)}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 text-center mt-1 pt-1 border-t border-gray-800/10">
                        {createdRemission.commissionPayer === 'cliente' ? 'Pagado por el cliente' : 'Absorbido por el vendedor'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 relative">
                  {/* Print layout selector */}
                  <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4 text-left">
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block mb-3 px-1 text-center">
                      Configuración de Impresión
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => generateRemissionPDF(createdRemission, settings, 'media-carta')}
                        className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center shadow-lg shadow-blue-600/10"
                        title="Imprimir duplicado en media hoja carta"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1 text-white shrink-0" />
                        Media Carta
                      </button>
                      <button
                        onClick={() => generateRemissionPDF(createdRemission, settings, 'carta-completa')}
                        className="py-2.5 px-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center border border-gray-700 hover:border-gray-650 shadow-sm"
                        title="Imprimir nota en hoja completa"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1 text-indigo-400 shrink-0" />
                        Carta Completa
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSendWhatsApp}
                    className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-xl transition-all flex items-center justify-center shadow-sm shadow-[#25D366]/20"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Enviar WhatsApp
                  </button>
                  
                  <button
                    onClick={handleNewRemission}
                    className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center shadow-md shadow-emerald-500/20 mt-2"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    {editingId ? 'Volver a Notas' : 'Nueva Remisión'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notas de Remisión</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Remisión
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por folio o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Folio</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Fecha</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Cliente</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Forma de Pago</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Total</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRemissions.map((remission) => (
                <tr key={remission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    {remission.folio}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    {format(new Date(remission.date), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    {remission.customerName}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {remission.paymentMethod || 'Efectivo'}{remission.term && remission.term !== 'Contado' ? ` (${remission.term})` : ''}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-900 dark:text-white">
                    {formatCurrency(remission.total, settings.currency)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handlePrintRemission(remission, 'media-carta')}
                        className="p-2 text-blue-650 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-blue-200"
                        title="Imprimir Media Carta (Duplicado 1/2)"
                      >
                        <Printer className="w-4 h-4 shrink-0 text-blue-500" />
                        <span className="text-[10px] font-bold">1/2 H.</span>
                      </button>
                      <button
                        onClick={() => handlePrintRemission(remission, 'carta-completa')}
                        className="p-2 text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-indigo-200"
                        title="Imprimir Carta Completa"
                      >
                        <FileText className="w-4 h-4 shrink-0 text-indigo-505" />
                        <span className="text-[10px] font-bold">Carta</span>
                      </button>
                      <button
                        onClick={() => handleStartEdit(remission)}
                        className="p-2 text-amber-650 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-amber-200"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4 shrink-0 text-amber-500" />
                        <span className="text-[10px] font-bold">Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de que deseas eliminar esta nota de remisión?')) {
                            deleteRemission(remission.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRemissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron notas de remisión.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
