import React, { useState, useMemo } from 'react';
import { useStore, defaultSettings } from '../store/useStore';
import { 
  Search, Plus, Edit, Trash2, Phone, Mail, Building, FileText, 
  AlertTriangle, MessageCircle, Download, Check, X, ClipboardCopy, ChevronRight
} from 'lucide-react';
import { Supplier, PurchaseOrder, PurchaseOrderItem, Product } from '../types';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/format';
import { generatePurchaseOrderPDF } from '../utils/pdf';
import { AnimatePresence, motion } from 'motion/react';

export default function Suppliers() {
  const { 
    suppliers = [], 
    purchaseOrders = [],
    products = [],
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    settings = defaultSettings,
    currentUser 
  } = useStore();
  
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser?.role === 'Cajero') {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  
  // Supplier search
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });

  // Purchase Order states
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  
  const [orderFormData, setOrderFormData] = useState({
    supplierId: '',
    items: [] as PurchaseOrderItem[],
    notes: '',
    status: 'Pendiente' as 'Pendiente' | 'Enviada' | 'Recibida' | 'Cancelada',
  });

  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  
  const [deleteOrderConfirm, setDeleteOrderConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });

  if (currentUser?.role === 'Cajero') {
    return null;
  }

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.contactName && s.contactName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suppliers, searchTerm]);

  // Filter purchase orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(o => 
      o.folio.toLowerCase().includes(orderSearchTerm.toLowerCase()) || 
      o.supplierName.toLowerCase().includes(orderSearchTerm.toLowerCase())
    ).reverse();
  }, [purchaseOrders, orderSearchTerm]);

  // Handle supplier submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, formData);
    } else {
      addSupplier(formData);
    }
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setShowModal(true);
  };

  const confirmDelete = (id: string) => {
    deleteSupplier(id);
    setDeleteConfirm({ isOpen: false, id: '' });
  };

  // Product suggestions for selected supplier
  const supplierProducts = useMemo(() => {
    if (!orderFormData.supplierId) return products;
    const selectedSupplier = suppliers.find(s => s.id === orderFormData.supplierId);
    if (!selectedSupplier) return products;
    return products.filter(p => p.supplier.toLowerCase() === selectedSupplier.name.toLowerCase());
  }, [products, suppliers, orderFormData.supplierId]);

  const handleProductDescChange = (val: string) => {
    setNewItemDesc(val);
    const matchedProduct = products.find(p => p.name.toLowerCase() === val.toLowerCase());
    if (matchedProduct) {
      setNewItemPrice(matchedProduct.purchasePrice || 0);
    }
  };

  const handleAddOrderItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim() || newItemQty <= 0 || newItemPrice < 0) return;

    const newItem: PurchaseOrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: newItemDesc.trim(),
      quantity: newItemQty,
      unitPrice: newItemPrice,
      total: newItemQty * newItemPrice,
    };

    setOrderFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveOrderItem = (id: string) => {
    setOrderFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const orderSubtotal = useMemo(() => {
    return orderFormData.items.reduce((sum, item) => sum + item.total, 0);
  }, [orderFormData.items]);

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderFormData.supplierId) {
      alert('Por favor selecciona un proveedor.');
      return;
    }
    if (orderFormData.items.length === 0) {
      alert('Agrega al menos un artículo a la orden de compra.');
      return;
    }

    const supplier = suppliers.find(s => s.id === orderFormData.supplierId);
    const supplierName = supplier ? supplier.name : 'Proveedor Desconocido';

    if (editingOrder) {
      updatePurchaseOrder(editingOrder.id, {
        supplierId: orderFormData.supplierId,
        supplierName,
        items: orderFormData.items,
        notes: orderFormData.notes,
        status: orderFormData.status,
        total: orderSubtotal,
      });
    } else {
      const folio = `OC-${(purchaseOrders.length + 1).toString().padStart(4, '0')}`;
      const newOrder: PurchaseOrder = {
        id: Math.random().toString(36).substr(2, 9),
        folio,
        date: new Date().toISOString(),
        supplierId: orderFormData.supplierId,
        supplierName,
        items: orderFormData.items,
        notes: orderFormData.notes,
        status: orderFormData.status,
        total: orderSubtotal,
      };
      addPurchaseOrder(newOrder);
    }

    setShowOrderModal(false);
    setEditingOrder(null);
  };

  const handleStartNewOrder = (preselectedSupplierId?: string) => {
    setEditingOrder(null);
    setOrderFormData({
      supplierId: preselectedSupplierId || '',
      items: [],
      notes: '',
      status: 'Pendiente',
    });
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setShowOrderModal(true);
  };

  const handleStartEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setOrderFormData({
      supplierId: order.supplierId,
      items: [...order.items].map(i => ({ ...i })),
      notes: order.notes || '',
      status: order.status,
    });
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setShowOrderModal(true);
  };

  const confirmDeleteOrder = (id: string) => {
    deletePurchaseOrder(id);
    setDeleteOrderConfirm({ isOpen: false, id: '' });
  };

  // WhatsApp sender
  const handleSendWhatsApp = (order: PurchaseOrder) => {
    const supplier = suppliers.find(s => s.id === order.supplierId);
    const businessName = settings.name || 'Nuestra Sucursal';
    
    let itemsText = '';
    order.items.forEach(item => {
      itemsText += `- ${item.quantity} x ${item.description} (${formatCurrency(item.unitPrice, settings.currency)} c/u) = ${formatCurrency(item.total, settings.currency)}\n`;
    });

    const message = `📦 *ORDEN DE COMPRA*\n` +
      `Folio: *${order.folio}*\n` +
      `Fecha: *${format(new Date(order.date), 'dd/MM/yyyy')}*\n` +
      `De: *${businessName}*\n` +
      `Para: *${order.supplierName}*\n\n` +
      `*Artículos:*\n${itemsText}\n` +
      `*Total:* *${formatCurrency(order.total, settings.currency)}*\n\n` +
      (order.notes ? `*Notas / Instrucciones:* ${order.notes}\n\n` : '') +
      `---`;

    const phone = supplier?.phone ? supplier.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phone 
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
      
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Proveedores</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tu directorio de proveedores y emite órdenes de compra formales
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'suppliers' ? (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setFormData({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });
                setShowModal(true);
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-sm transition-colors font-semibold text-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Proveedor
            </button>
          ) : (
            <button
              onClick={() => handleStartNewOrder()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-sm transition-colors font-semibold text-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Orden de Compra
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'suppliers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-750 dark:text-gray-450 dark:hover:text-gray-300'
          }`}
        >
          Directorio de Proveedores
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-750 dark:text-gray-450 dark:hover:text-gray-300'
          }`}
        >
          Órdenes de Compra
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {filteredSuppliers.length} proveedores registrados
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-500">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No se encontraron proveedores</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                  Busca con otro término o agrega un nuevo proveedor para comenzar.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                            <Building className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {supplier.name}
                            </div>
                            {supplier.notes && (
                              <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">
                                {supplier.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {supplier.contactName && (
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {supplier.contactName}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Phone className="w-3 h-3 mr-1.5 text-gray-400" />
                              {supplier.phone}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Mail className="w-3 h-3 mr-1.5 text-gray-400" />
                              {supplier.email}
                            </div>
                          )}
                          {!supplier.contactName && !supplier.phone && !supplier.email && (
                            <span className="text-sm text-gray-400">Sin datos</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600 dark:text-gray-300 max-w-[200px] line-clamp-2">
                          {supplier.address || <span className="text-gray-400">Sin dirección</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1 items-center">
                          <button
                            onClick={() => handleStartNewOrder(supplier.id)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 border border-blue-200/50 dark:border-blue-900"
                            title="Generar nueva orden de compra"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Crear Orden</span>
                          </button>
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors inline-flex"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, id: supplier.id })}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors inline-flex"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Buscar por folio o proveedor..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {filteredOrders.length} órdenes registradas
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-500">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No se encontraron órdenes de compra</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                  Crea una nueva orden de compra para registrar solicitudes de productos con tus proveedores.
                </p>
                <button
                  onClick={() => handleStartNewOrder()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm"
                >
                  Generar Orden de Compra
                </button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Folio</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proveedor</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conceptos</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estatus</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                  {filteredOrders.map((order) => {
                    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
                    
                    let statusClass = '';
                    switch (order.status) {
                      case 'Pendiente':
                        statusClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
                        break;
                      case 'Enviada':
                        statusClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
                        break;
                      case 'Recibida':
                        statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
                        break;
                      case 'Cancelada':
                        statusClass = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900';
                        break;
                    }

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">
                          {order.folio}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                          {format(new Date(order.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">
                          {order.supplierName}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">{order.items.length}</span> {order.items.length === 1 ? 'concepto' : 'conceptos'} ({totalQty} pzs)
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${statusClass}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-black text-gray-900 dark:text-white text-base">
                          {formatCurrency(order.total, settings.currency)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-1.5 items-center">
                            <button
                              onClick={() => generatePurchaseOrderPDF(order, settings, 'carta-completa')}
                              className="p-1.5 text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-indigo-200"
                              title="Descargar PDF en tamaño Carta"
                            >
                              <Download className="w-4 h-4 text-indigo-500" />
                              <span className="text-[10px] font-bold hidden md:inline">Carta</span>
                            </button>
                            <button
                              onClick={() => generatePurchaseOrderPDF(order, settings, 'media-carta')}
                              className="p-1.5 text-blue-650 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-blue-200"
                              title="Descargar PDF en Media Carta"
                            >
                              <Download className="w-4 h-4 text-blue-500" />
                              <span className="text-[10px] font-bold hidden md:inline">1/2 H.</span>
                            </button>
                            <button
                              onClick={() => handleSendWhatsApp(order)}
                              className="p-1.5 text-green-650 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent hover:border-green-200"
                              title="Enviar por WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 text-green-500" />
                              <span className="text-[10px] font-bold hidden md:inline">WhatsApp</span>
                            </button>
                            <button
                              onClick={() => handleStartEditOrder(order)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                              title="Editar Orden"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteOrderConfirm({ isOpen: true, id: order.id })}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Eliminar Orden"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Supplier Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg my-8"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-500" />
                  {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Nombre de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                    placeholder="Ej. Distribuidora del Norte SA"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Nombre del Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                      placeholder="Ej. 555-0123"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                    placeholder="ejemplo@proveedor.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                    placeholder="Calle, Número, Colonia, Ciudad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Notas / Detalles Adicionales
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all resize-none"
                    placeholder="Condiciones de pago, días de entrega, etc..."
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                  >
                    {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supplier Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¿Eliminar proveedor?</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Esta acción no se puede deshacer. Los productos asociados a este proveedor no se eliminarán pero mantendrán el registro de este nombre de proveedor.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm({ isOpen: false, id: '' })}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmDelete(deleteConfirm.id)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm text-sm"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purchase Order Create/Edit Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl my-8 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  {editingOrder ? `Editar Orden de Compra: ${editingOrder.folio}` : 'Nueva Orden de Compra'}
                </h3>
                <button 
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[75vh] overflow-y-auto">
                <div className="lg:col-span-2 space-y-6">
                  {/* Supplier and info section */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Proveedor *
                      </label>
                      <select
                        required
                        disabled={!!editingOrder || (!!orderFormData.supplierId && suppliers.some(s => s.id === orderFormData.supplierId))}
                        value={orderFormData.supplierId}
                        onChange={(e) => setOrderFormData({ ...orderFormData, supplierId: e.target.value, items: [] })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all text-sm font-semibold"
                      >
                        <option value="">-- Selecciona un Proveedor --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {orderFormData.supplierId && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          * Cambiar de proveedor limpiará los artículos de la lista.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Add concept builder */}
                  <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">Agregar Concepto de Compra</h4>
                    <form onSubmit={handleAddOrderItem} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Descripción / Producto</label>
                          <input
                            type="text"
                            required
                            value={newItemDesc}
                            onChange={(e) => handleProductDescChange(e.target.value)}
                            list="order-product-suggestions"
                            placeholder="Laptop HP, etc. o busca producto..."
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                          />
                          <datalist id="order-product-suggestions">
                            {supplierProducts.map(p => (
                              <option key={p.id} value={p.name}>
                                Costo: {formatCurrency(p.purchasePrice)} - Stock: {p.stock} pzs
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Cant.</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={newItemQty}
                              onChange={(e) => setNewItemQty(Number(e.target.value))}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white text-sm text-center font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Costo Unit.</label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={newItemPrice === 0 ? '' : newItemPrice}
                              onChange={(e) => setNewItemPrice(Number(e.target.value))}
                              placeholder="0.00"
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white text-sm font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!orderFormData.supplierId}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Agregar Concepto
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Added concepts table list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                      Conceptos Agregados a la Orden
                    </h4>
                    {orderFormData.items.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-750 rounded-xl text-gray-400 dark:text-gray-500 text-sm">
                        Agrega al menos un concepto utilizando el formulario de arriba.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {orderFormData.items.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-850"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.description}</p>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {item.quantity} piezas x {formatCurrency(item.unitPrice, settings.currency)} c/u
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                                {formatCurrency(item.total, settings.currency)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderItem(item.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
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

                {/* Sidebar details */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-xl border border-gray-100 dark:border-gray-850 space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Detalles de Entrega y Estatus
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Estatus de Orden
                      </label>
                      <select
                        value={orderFormData.status}
                        onChange={(e) => setOrderFormData({ ...orderFormData, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white text-xs font-bold"
                      >
                        <option value="Pendiente">Pendiente (Por Enviar)</option>
                        <option value="Enviada">Enviada</option>
                        <option value="Recibida">Recibida (Mercancía en Tienda)</option>
                        <option value="Cancelada">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Instrucciones o Notas de Entrega
                      </label>
                      <textarea
                        rows={4}
                        value={orderFormData.notes}
                        onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
                        placeholder="Ej. Entregar en bodega, condiciones de pago a 30 días, etc..."
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white text-xs resize-none"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-semibold">
                        <span>Conceptos:</span>
                        <span>{orderFormData.items.length} items</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Total:</span>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                          {formatCurrency(orderSubtotal, settings.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!orderFormData.supplierId || orderFormData.items.length === 0}
                      onClick={handleSaveOrder}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <Check className="w-5 h-5" />
                      <span>{editingOrder ? 'Guardar Cambios' : 'Registrar Orden'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(false)}
                      className="w-full py-2.5 bg-gray-100 dark:bg-gray-750 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all text-xs border border-gray-200 dark:border-gray-650"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purchase Order Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteOrderConfirm.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¿Eliminar orden de compra?</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Esta acción no se puede deshacer y eliminará permanentemente la orden del historial.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteOrderConfirm({ isOpen: false, id: '' })}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmDeleteOrder(deleteOrderConfirm.id)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm text-sm"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
