import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { ShieldCheck, Search, Package, User, Clock, AlertTriangle, Pencil, Trash2, X } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';

function parseWarrantyDays(warrantyInput?: string): number | null {
  if (!warrantyInput) return null;
  const str = warrantyInput.toLowerCase().trim();
  let modifier = 1;
  // Plurals and variations are handled well enough by these basic checks
  if (str.includes('año') || str.includes('anio') || str.includes('year') || str.includes('años')) modifier = 365;
  else if (str.includes('mes') || str.includes('month') || str.includes('meses')) modifier = 30;
  else if (str.includes('dia') || str.includes('día') || str.includes('day') || str.includes('dias') || str.includes('días')) modifier = 1;
  
  const numMatch = str.match(/\d+(\.\d+)?/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[0]) * modifier);
  }
  return null;
}

export default function Warranties() {
  const { sales = [], remissions = [], updateSale, updateRemission } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<{
    id: string;
    parentId: string;
    itemId: string;
    productName: string;
    customerName: string;
    warrantyString: string;
    type: 'Venta' | 'Remisión';
    referenceId: string;
  } | null>(null);
  const [newWarranty, setNewWarranty] = useState('');
  
  const warrantyItems = useMemo(() => {
    const items: Array<{
      id: string;
      parentId: string;
      itemId: string;
      referenceId: string;
      saleDate: string;
      customerName: string;
      productName: string;
      warrantyString: string;
      warrantyDays: number | null;
      endDate: Date | null;
      daysRemaining: number | null;
      status: 'active' | 'expired' | 'unknown';
      type: 'Venta' | 'Remisión';
    }> = [];

    // Process standard sales
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.warranty && item.warranty.trim() !== '') {
          const wDays = parseWarrantyDays(item.warranty);
          let endDate: Date | null = null;
          let daysRemaining: number | null = null;
          let status: 'active' | 'expired' | 'unknown' = 'unknown';

          if (wDays !== null) {
            endDate = addDays(new Date(sale.date), wDays);
            daysRemaining = differenceInDays(endDate, new Date());
            if (daysRemaining >= 0) {
              status = 'active';
            } else {
              status = 'expired';
            }
          }

          items.push({
            id: `sale-${sale.id}-${item.id}`,
            parentId: sale.id,
            itemId: item.id,
            referenceId: sale.id.substring(0, 10).toUpperCase(),
            saleDate: sale.date,
            customerName: sale.customerName || 'Cliente Mostrador',
            productName: item.name,
            warrantyString: item.warranty,
            warrantyDays: wDays,
            endDate,
            daysRemaining,
            status,
            type: 'Venta'
          });
        }
      });
    });

    // Process remissions
    remissions.forEach(remission => {
      remission.items.forEach(item => {
        if (item.warranty && item.warranty.trim() !== '') {
          const wDays = parseWarrantyDays(item.warranty);
          let endDate: Date | null = null;
          let daysRemaining: number | null = null;
          let status: 'active' | 'expired' | 'unknown' = 'unknown';

          if (wDays !== null) {
            endDate = addDays(new Date(remission.date), wDays);
            daysRemaining = differenceInDays(endDate, new Date());
            if (daysRemaining >= 0) {
              status = 'active';
            } else {
              status = 'expired';
            }
          }

          items.push({
            id: `remission-${remission.id}-${item.id}`,
            parentId: remission.id,
            itemId: item.id,
            referenceId: remission.folio,
            saleDate: remission.date,
            customerName: remission.customerName || 'Público en General',
            productName: item.description,
            warrantyString: item.warranty,
            warrantyDays: wDays,
            endDate,
            daysRemaining,
            status,
            type: 'Remisión'
          });
        }
      });
    });

    return items.sort((a, b) => {
      // sort by days remaining (active first, then expired)
      if (a.status === 'active' && b.status === 'active') {
        return (a.daysRemaining || 0) - (b.daysRemaining || 0);
      }
      if (a.status === 'active') return -1;
      if (b.status === 'active') return 1;
      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });
  }, [sales, remissions]);

  const filteredItems = warrantyItems.filter(item => {
    const term = searchTerm.toLowerCase();
    return item.productName.toLowerCase().includes(term) ||
           item.customerName.toLowerCase().includes(term) ||
           item.referenceId.toLowerCase().includes(term) ||
           item.type.toLowerCase().includes(term) ||
           item.warrantyString.toLowerCase().includes(term);
  });

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setNewWarranty(item.warrantyString);
  };

  const handleDeleteClick = (item: any) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la garantía de "${item.productName}" para ${item.customerName}?`)) {
      if (item.type === 'Venta') {
        const originalSale = sales.find(s => s.id === item.parentId);
        if (originalSale) {
          const updatedItems = originalSale.items.map(it => {
            if (it.id === item.itemId) {
              return { ...it, warranty: '' };
            }
            return it;
          });
          updateSale(item.parentId, { items: updatedItems });
          toast.success('Garantía de la venta eliminada con éxito');
        }
      } else {
        const originalRemission = remissions.find(r => r.id === item.parentId);
        if (originalRemission) {
          const updatedItems = originalRemission.items.map(it => {
            if (it.id === item.itemId) {
              return { ...it, warranty: '' };
            }
            return it;
          });
          updateRemission(item.parentId, { items: updatedItems });
          toast.success('Garantía de la remisión eliminada con éxito');
        }
      }
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const val = newWarranty.trim();
    if (editingItem.type === 'Venta') {
      const originalSale = sales.find(s => s.id === editingItem.parentId);
      if (originalSale) {
        const updatedItems = originalSale.items.map(it => {
          if (it.id === editingItem.itemId) {
            return { ...it, warranty: val };
          }
          return it;
        });
        updateSale(editingItem.parentId, { items: updatedItems });
        toast.success('Garantía de la venta actualizada con éxito');
      }
    } else {
      const originalRemission = remissions.find(r => r.id === editingItem.parentId);
      if (originalRemission) {
        const updatedItems = originalRemission.items.map(it => {
          if (it.id === editingItem.itemId) {
            return { ...it, warranty: val };
          }
          return it;
        });
        updateRemission(editingItem.parentId, { items: updatedItems });
        toast.success('Garantía de la remisión actualizada con éxito');
      }
    }
    setEditingItem(null);
  };

  // Calculate stats
  const activeWarranties = warrantyItems.filter(i => i.status === 'active').length;
  const expiredWarranties = warrantyItems.filter(i => i.status === 'expired').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Historial de Garantías
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Control de garantías de productos vendidos
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400">TOTAL CON GARANTÍA</p>
            <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
              {warrantyItems.length}
            </h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400">GARANTÍAS ACTIVAS</p>
            <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
              {activeWarranties}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400">GARANTÍAS VENCIDAS</p>
            <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
              {expiredWarranties}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por cliente, producto o folio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Origen / Folio</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Producto</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Garantía</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Operación</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredItems.map((item, i) => (
                <tr key={`${item.id}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
                        {item.customerName}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        item.type === 'Venta' 
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
                          : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        #{item.referenceId}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px] sm:max-w-xs block">
                        {item.productName}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
                    {item.warrantyString}
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                    {format(new Date(item.saleDate), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="p-4">
                    {item.status === 'active' && item.daysRemaining !== null ? (
                      <div className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-100 dark:border-emerald-800">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        Restan {item.daysRemaining} {item.daysRemaining === 1 ? 'día' : 'días'}
                      </div>
                    ) : item.status === 'expired' ? (
                      <div className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-xs font-medium border border-rose-100 dark:border-rose-800">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Vencida
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-700">
                        Indefinida
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs"
                        title="Editar Garantía"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs"
                        title="Eliminar Garantía"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-450">
                    No se encontraron garantías que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Warranty Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-700 relative text-left"
            >
              <button
                onClick={() => setEditingItem(null)}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                Editar Garantía
              </h3>
              
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Producto</p>
                  <p className="text-sm text-gray-700 dark:text-gray-350 font-medium">{editingItem.productName}</p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Cliente</p>
                  <p className="text-sm text-gray-700 dark:text-gray-355 font-medium">{editingItem.customerName}</p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold mb-1">Folio / Origen</p>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md ${
                    editingItem.type === 'Venta' 
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
                      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {editingItem.type} #{editingItem.referenceId}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-750 dark:text-gray-300 mb-1.5">
                    Garantía
                  </label>
                  <input
                    type="text"
                    required
                    value={newWarranty}
                    onChange={(e) => setNewWarranty(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ej. 1 año, 6 meses, 30 días"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-350 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
