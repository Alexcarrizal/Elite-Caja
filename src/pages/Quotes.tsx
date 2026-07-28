import React, { useState } from 'react';
import { useStore, defaultSettings } from '../store/useStore';
import { Plus, Search, FileText, Trash2, ArrowLeft, Printer, Banknote, Check, ArrowRight, MessageCircle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/format';
import { Quote, QuoteItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { generateQuotePDF } from '../utils/pdf';
import { AnimatePresence, motion } from 'motion/react';

export default function Quotes() {
  const { 
    quotes = [], 
    products = [],
    addQuote, 
    updateQuote,
    deleteQuote, 
    settings = defaultSettings,
    currentUser
  } = useStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Quote Form State
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [notes, setNotes] = useState('Esta cotización tiene una vigencia de 15 días naturales.');
  const [items, setItems] = useState<QuoteItem[]>([]);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<Quote | null>(null);

  
  // New Item Input State
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  const filteredQuotes = quotes.filter(q => 
    q.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.sellerName && q.sellerName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).reverse();

  const handleStartEdit = (quote: Quote) => {
    setEditingId(quote.id);
    setCustomerName(quote.customerName);
    setCustomerAddress(quote.customerAddress || '');
    setCustomerPhone(quote.customerPhone || '');
    setSellerName(quote.sellerName || '');
    setSellerPhone(quote.sellerPhone || '');
    setNotes(quote.notes || '');
    setItems([...quote.items].map(item => ({ ...item })));
    setIsCreating(true);
  };

  const handleDescChange = (val: string) => {
    setNewItemDesc(val);
    const matchedProduct = products.find(p => p.name.toLowerCase() === val.toLowerCase());
    if (matchedProduct) {
      setNewItemPrice(matchedProduct.salePrice);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc || newItemQty <= 0 || newItemPrice < 0) return;

    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: newItemDesc,
      quantity: newItemQty,
      unitPrice: newItemPrice,
      total: newItemQty * newItemPrice
    };

    setItems([...items, newItem]);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleSaveQuote = () => {
    if (!customerName.trim()) {
      alert('Por favor, ingresa el nombre del cliente.');
      return;
    }
    if (items.length === 0) {
      alert('Agrega al menos un artículo a la cotización.');
      return;
    }

    if (editingId) {
      const originalQuote = quotes.find(q => q.id === editingId);
      if (!originalQuote) return;

      const updatedQuote: Quote = {
        ...originalQuote,
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        sellerName: sellerName.trim() || undefined,
        sellerPhone: sellerPhone.trim() || undefined,
        items,
        total: grandTotal,
        notes: notes.trim() || undefined
      };

      updateQuote(editingId, updatedQuote);
      setCreatedQuote(updatedQuote);
      setShowSuccessModal(true);
    } else {
      // Generate random folio
      const randomFolioSuffix = Math.floor(100000 + Math.random() * 900000);
      const folio = `COT-${randomFolioSuffix}`;

      const newQuote: Quote = {
        id: Math.random().toString(36).substr(2, 9),
        folio,
        date: new Date().toISOString(),
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        sellerName: sellerName.trim() || undefined,
        sellerPhone: sellerPhone.trim() || undefined,
        items,
        total: grandTotal,
        notes: notes.trim() || undefined
      };

      addQuote(newQuote);
      setCreatedQuote(newQuote);
      setShowSuccessModal(true);
    }
  };

  const handleNewQuote = () => {
    setShowSuccessModal(false);
    setCreatedQuote(null);
    setIsCreating(false);
    setEditingId(null);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setSellerName('');
    setSellerPhone('');
    setNotes('Esta cotización tiene una vigencia de 15 días naturales.');
    setItems([]);
  };

  const handleSendWhatsApp = () => {
    if (!createdQuote) return;
    const message = `Hola *${createdQuote.customerName}*, te compartimos tu Cotización con Folio *${createdQuote.folio}* de *${settings.name || 'nuestra sucursal'}* por un total de *${formatCurrency(createdQuote.total, settings.currency)}*. Vigencia: 15 días.`;
    const waUrl = `https://wa.me/${createdQuote.customerPhone ? createdQuote.customerPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handlePrintQuote = (quote: Quote, formatType: 'media-carta' | 'carta-completa' | 'ticket-80mm' | 'ticket-58mm' = 'media-carta') => {
    generateQuotePDF(quote, settings, formatType);
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
              {editingId ? `Editar Cotización: ${quotes.find(q => q.id === editingId)?.folio || ''}` : 'Nueva Cotización'}
            </h1>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={handleSaveQuote}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-200 dark:shadow-none flex items-center gap-2 text-sm"
              title="Guardar Cotización"
            >
              <Check className="w-5 h-5" />
              Guardar Cotización
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Conceptos de Cotización</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción del Producto / Servicio</label>
                    <input
                      type="text"
                      required
                      value={newItemDesc}
                      onChange={(e) => handleDescChange(e.target.value)}
                      list="quote-product-suggestions"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="Ej. Lámina Galvanizada R-101 o busca en inventario"
                    />
                    <datalist id="quote-product-suggestions">
                      {products.map((p) => (
                        <option key={p.id} value={p.name}>
                          Precio: {formatCurrency(p.salePrice)} - Stock: {p.stock}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
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
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Artículos Agregados</h3>
                {items.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No hay artículos cotizados aún.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.description}</p>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity} x {formatCurrency(item.unitPrice, settings.currency)}
                          </span>
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Datos del Cliente</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Ej. Juan Pérez López"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección del Cliente</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Ej. Av. Hidalgo #123, Col. Centro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono del Cliente</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Ej. 5512345678"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Datos del Vendedor</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Vendedor</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="Ej. Carlos Martínez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono / Número del Vendedor</label>
                  <input
                    type="text"
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="Ej. 5598765432"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas / Vigencia</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                  rows={3}
                  placeholder="Ej. Cotización con vigencia de..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {formatCurrency(grandTotal, settings.currency)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveQuote}
                  className="w-full mt-4 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 text-base"
                >
                  <Check className="w-5 h-5" />
                  {editingId ? 'Guardar Cambios' : 'Generar Cotización'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && createdQuote && (
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
                className="bg-gray-950 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-800 text-center relative overflow-hidden my-8 text-white"
                style={{ backgroundColor: '#111827' }}
              >
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight animate-pulse">
                  {editingId ? '¡Cotización Actualizada!' : '¡Cotización Creada!'}
                </h2>
                <div className="mb-4">
                  <p className="text-gray-400 font-medium text-xs uppercase tracking-wider mb-1">
                    Cotización: <span className="text-emerald-400 font-bold">{createdQuote.folio}</span>
                  </p>
                  <p className="text-gray-300 font-medium text-sm">
                    Monto cotizado: <span className="text-emerald-450 font-extrabold text-lg">{formatCurrency(createdQuote.total, settings.currency)}</span>
                  </p>
                </div>

                <div className="space-y-3 relative">
                  <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4 text-left space-y-3">
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block px-1 text-center">
                      Formatos de Exportación
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => createdQuote && generateQuotePDF(createdQuote, settings, 'ticket-80mm')}
                        className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center shadow-lg shadow-blue-600/10"
                        title="Imprimir Ticket Térmico 80mm"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1 text-white shrink-0" />
                        Ticket
                      </button>
                      <button
                        onClick={() => createdQuote && generateQuotePDF(createdQuote, settings, 'media-carta')}
                        className="py-2.5 px-2 bg-gray-850 hover:bg-gray-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center border border-gray-700 hover:border-gray-650 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1 text-blue-400 shrink-0" />
                        Media Carta
                      </button>
                      <button
                        onClick={() => createdQuote && generateQuotePDF(createdQuote, settings, 'carta-completa')}
                        className="py-2.5 px-2 bg-gray-850 hover:bg-gray-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center border border-gray-700 hover:border-gray-650 shadow-sm"
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
                    onClick={handleNewQuote}
                    className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center shadow-md shadow-emerald-500/20 mt-2"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Nueva Cotización
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cotizaciones</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Cotización
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por folio, cliente o vendedor..."
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
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Vendedor</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Total</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-sm text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    {quote.folio}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    {format(new Date(quote.date), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    {quote.customerName}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    {quote.sellerName || 'N/A'} {quote.sellerPhone ? `(${quote.sellerPhone})` : ''}
                  </td>
                  <td className="p-4 font-bold text-gray-900 dark:text-white">
                    {formatCurrency(quote.total, settings.currency)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handlePrintQuote(quote, 'ticket-80mm')}
                        className="p-2 text-emerald-650 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-emerald-200"
                        title="Imprimir Ticket Térmico 80mm"
                      >
                        <Printer className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span className="text-[10px] font-bold">Ticket</span>
                      </button>
                      <button
                        onClick={() => handlePrintQuote(quote, 'media-carta')}
                        className="p-2 text-blue-650 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-blue-200"
                        title="Imprimir Media Carta"
                      >
                        <Printer className="w-4 h-4 shrink-0 text-blue-500" />
                        <span className="text-[10px] font-bold">1/2 H.</span>
                      </button>
                      <button
                        onClick={() => handlePrintQuote(quote, 'carta-completa')}
                        className="p-2 text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-indigo-200"
                        title="Imprimir Carta Completa"
                      >
                        <FileText className="w-4 h-4 shrink-0 text-indigo-500" />
                        <span className="text-[10px] font-bold">Carta</span>
                      </button>
                      <button
                        onClick={() => handleStartEdit(quote)}
                        className="p-2 text-amber-650 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-amber-200"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4 shrink-0 text-amber-500" />
                        <span className="text-[10px] font-bold">Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de que deseas eliminar esta cotización?')) {
                            deleteQuote(quote.id);
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
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron cotizaciones.
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

