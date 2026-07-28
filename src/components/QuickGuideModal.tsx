import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  BookOpen, 
  ShoppingCart, 
  Wallet, 
  Package, 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  Award, 
  ArrowRight,
  Database,
  Terminal,
  Activity,
  Sparkles,
  RefreshCw,
  QrCode
} from 'lucide-react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
}

export default function QuickGuideModal({ isOpen, onClose, onDownloadPdf }: QuickGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'inicio' | 'pos' | 'caja' | 'inventario' | 'seguridad'>('inicio');

  if (!isOpen) return null;

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: BookOpen },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'caja', label: 'Control de Caja', icon: Wallet },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'seguridad', label: 'Seguridad & Roles', icon: ShieldCheck },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-left"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-705 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Guía Rápida de Operación — Elite Caja
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Punto de Venta Inteligente y Control de Inventario
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-xl transition-all"
              title="Descargar Manual Completo de Operación en PDF"
            >
              <FileText className="w-4 h-4" />
              <span>Manual PDF</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <X className="w-5.5 h-5.5" />
            </button>
          </div>
        </div>

        {/* Content body layout with tabs */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-56 border-r border-gray-100 dark:border-slate-705 p-4 space-y-1.5 bg-gray-50/50 dark:bg-slate-900/40 flex-shrink-0">
            <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase tracking-wider font-bold px-3 mb-2">Secciones</p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 shadow-sm border border-blue-500/10' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400 dark:text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            
            <div className="pt-6 mt-6 border-t border-gray-100 dark:border-slate-705 px-3">
              <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Atajo Rápido
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Pulsa cualquier letra o número en el POS para buscar productos al instante.
              </p>
            </div>
          </div>

          {/* Reading Frame */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-800">
            {activeTab === 'inicio' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                    ¡Bienvenido a Elite Caja!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    Este software avanzado está diseñado para optimizar las operaciones diarias de cobro, inventarios, cierres de caja y garantías de tu negocio. A continuación, te presentamos el flujo básico de uso para que comiences de la manera más óptima:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-blue-100/40 bg-blue-50/25 dark:border-blue-900/30 dark:bg-blue-950/20 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Paso 1: Abrir la Caja</p>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Antes de realizar cualquier venta, es requerido iniciar sesión e ingresar el <strong>fondo inicial (caja chica)</strong> en el apartado de Caja.
                    </p>
                  </div>

                  <div className="p-4 border border-indigo-100/40 bg-indigo-50/25 dark:border-indigo-900/30 dark:bg-indigo-950/20 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Paso 2: Registrar Productos</p>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Agrega productos fácilmente desde el módulo de <strong>Inventario</strong>, asignándoles categoría, costo, precio al público y stock mínimo.
                    </p>
                  </div>

                  <div className="p-4 border border-teal-100/40 bg-teal-50/25 dark:border-teal-900/30 dark:bg-teal-950/20 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Paso 3: Cobrar en el POS</p>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Escanea códigos de barra o busca el nombre de un artículo en el <strong>Punto de Venta</strong>, selecciona el método de pago y emite el ticket.
                    </p>
                  </div>

                  <div className="p-4 border border-purple-100/40 bg-purple-50/25 dark:border-purple-900/30 dark:bg-purple-950/20 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Paso 4: Realizar Arqueo</p>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Al terminar el turno, ingresa a <strong>Caja</strong> y haz el cuadre ("arqueo a ciegas") contando el efectivo físico para registrar cualquier descuadre.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-slate-705 flex items-start gap-3">
                  <Database className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-1">Respaldo Automático Nube</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Tus transacciones y datos de inventario están protegidos. El sistema realiza sincronizaciones instantáneas con <strong>Firebase Firestore Cloud</strong> para evitar pérdidas si el equipo o terminal se apagan inesperadamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pos' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Mapeo del Punto de Venta (POS)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    El Punto de Venta es sumamente rápido e interactivo. Sigue estas recomendaciones operativas para sacarle el máximo partido:
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 items-start pb-4 border-b border-gray-100 dark:border-slate-705">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Atajo de Enfoque de Búsqueda</h4>
                      <p className="text-xs text-gray-650 dark:text-slate-300 leading-relaxed">
                        No necesitas hacer clic en la barra de búsqueda para empezar una venta. Mientras no tengas una pestaña o modal abierta en pantalla, <strong>simplemente empieza a teclear el nombre o escanea con tu lector de códigos</strong> para capturar el producto.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start pb-4 border-b border-gray-100 dark:border-slate-705">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Carrito en Espera (Suspender Orden)</h4>
                      <p className="text-xs text-gray-650 dark:text-slate-300 leading-relaxed">
                        ¿Un cliente tiene que regresar por más artículos? Usa el botón <strong>"Suspender Carrito"</strong> arriba del panel de cobro. Ponle un nombre de identificación (ej. "Mesa 4" o "Juan"). Podrás restaurar el carrito más tarde y seguir atendiendo al resto de la fila sin demoras.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start pb-4 border-b border-gray-100 dark:border-slate-705">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Monedero Electrónico (Plan de Puntos)</h4>
                      <p className="text-xs text-gray-650 dark:text-slate-300 leading-relaxed">
                        Cuando asocias un cliente registrado a la venta, acumulará automáticamente el <strong>1% de su compra en pesos canjeables</strong>. Al realizar el cobro, verás una casilla para redimir el saldo de puntos acumulados acumulados por el cliente si así lo desea.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">4</div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Comisión por Pagos en Terminal / CLIP / Transferencias</h4>
                      <p className="text-xs text-gray-650 dark:text-slate-300 leading-relaxed">
                        Configura en Ajustes si la comisión de cobro con tarjeta se reembolsará absorbiéndola el negocio, o bien <strong>se cobra de manera transparente al cliente</strong> durante el flujo del POS para maximizar tus márgenes de ganancias.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'caja' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Operación Segura de la Caja
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    Mantener un control de la cantidad exacta de efectivo en tienda ayuda a disuadir mermas. Sigue este ciclo financiero diario:
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-150 dark:border-slate-705">
                    <h4 className="text-sm font-bold text-gray-950 dark:text-white mb-1.5 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Flujo de Apertura
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Al iniciar operaciones o un turno, es imprescindible ingresar tu <strong>Saldo de Apertura</strong> en el apartado de Caja. Este dinero se considera el fondo para dar cambio. De no hacerlo, el sistema se mantendrá bloqueado para ventas en efectivo previniendo transacciones sin auditoría.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-150 dark:border-slate-705">
                    <h4 className="text-sm font-bold text-gray-950 dark:text-white mb-1.5 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-500" />
                      Registrar Inresos o Retiros de Emergencia
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Si necesitas tomar efectivo para pagar un flete, a un proveedor exprés o un servicio, usa el botón <strong>"Retirar Dinero"</strong>. Asimismo, si ingresas monedas extras para cambio, usa <strong>"Ingresar Dinero"</strong>. Describe siempre el concepto para un correcto balance del arqueo final.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-150 dark:border-slate-705">
                    <h4 className="text-sm font-bold text-gray-950 dark:text-white mb-1.5 flex items-center gap-2">
                      <X className="w-4 h-4 text-red-500" />
                      Cierre de Caja y Arqueo a Ciegas
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      El arqueo en Elite Caja es seguro. El sistema pedirá al cajero contar todo el dinero físico en mano e ingresarlo en la casilla. Solo después de guardar, el sistema calculará y reportará si existe un <strong>sobrante o faltante</strong>, evitando que el cajero simplemente digite la cifra que espera la computadora.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventario' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Control de Productos y Abastecimiento
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    Mantener existencias sanas es la clave de tus ventas. Conoce las principales herramientas de tu almacén digital:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 border border-slate-100 dark:border-slate-700/55 rounded-xl space-y-2 text-left bg-transparent">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Código de Barras</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Registra códigos de barras existentes del empaque del fabricante escaneándolos o capturándolos manualmente al dar de alta el producto para mayor agilidad en el cobro.
                    </p>
                  </div>

                  <div className="p-5 border border-slate-100 dark:border-slate-700/55 rounded-xl space-y-2 text-left bg-transparent">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Alertas de Stock Mínimo</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      El sistema muestra un indicador en color rojo cuando un artículo baja de su stock mínimo. Revisa el listado de <strong>"Sugerencias de Abastecimiento"</strong> para cotizar inventario rápido con tus proveedores.
                    </p>
                  </div>

                  <div className="p-5 border border-slate-100 dark:border-slate-700/55 rounded-xl space-y-2 text-left bg-transparent">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Ajustes Rápidos de Inventario</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      No necesitas editar la ficha completa de un producto para cambiar sus piezas. Usa la acción de <strong>"Ajuste Rápido"</strong> para sumar o restar existencias directamente, auditando el motivo de la corrección.
                    </p>
                  </div>

                  <div className="p-5 border border-slate-100 dark:border-slate-700/55 rounded-xl space-y-2 text-left bg-transparent">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Garantías de Artículos</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Configura plazos de garantía correspondientes por producto (ej. 3 meses, 1 año). Podrás validar vigencias y pólizas directas desde el menú de <strong>"Garantías"</strong> buscando el identificador de venta.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seguridad' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Seguridad por Roles y Licenciamiento
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    Elite Caja tiene reglas de seguridad estrictas para salvaguardar tu rentabilidad y evitar pérdidas informativas:
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-rose-100/30 bg-rose-50/10 dark:border-rose-900/30 dark:bg-rose-950/20 rounded-xl">
                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-405 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-4.5 h-4.5" />
                      Restricciones para el Cajero (Cajero)
                    </h4>
                    <p className="text-xs text-gray-650 dark:text-slate-300 leading-relaxed">
                      La interfaz se adapta automáticamente cuando un cajero inicia sesión:
                    </p>
                    <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-slate-300 space-y-1 mt-2">
                      <li>Se ocultan los módulos de: Proveedores, Reportes Financieros, Nota de Remisión, y Configuración del Sistema.</li>
                      <li>No puede editar costos de compra u obtener reportes de rentabilidad / ganancias netas totales del negocio.</li>
                      <li>No puede editar stock manualmente en masa ni vaciar / formatear la base de datos local o de la nube.</li>
                    </ul>
                  </div>

                  <div className="p-4 border border-blue-100/30 bg-blue-50/10 dark:border-blue-900/30 dark:bg-blue-950/20 rounded-xl">
                    <h4 className="text-sm font-bold text-blue-700 dark:text-blue-405 mb-1.5 flex items-center gap-1.5">
                      <Award className="w-4.5 h-4.5" />
                      Privilegios de Administrador (Admin)
                    </h4>
                    <p className="text-xs text-gray-650 dark:text-slate-300 leading-relaxed">
                      El Administrador tiene el control total para visualizar la rentabilidad real de la tienda (Ganancia Neta, Costo de Inventario y Margen), registrar o administrar cajeros, realizar respaldos manuales JSON y configurar la moneda, tarifas y plantillas de impresión del negocio.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-150 dark:border-slate-705 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Manual de Usuario & Operación de Elite Caja</span>
          <span>Desarrollado de manera Segura & Optimizado</span>
        </div>
      </motion.div>
    </div>
  );
}
