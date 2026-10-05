// Del Campo a tu Mesa Maule — utilidades puras compartidas (sin almacenamiento)
const WHATSAPP_NUMERO = '56945051752'; // +56 9 4505 1752
const ORDEN_COMUNAS_DEFAULT = ['Viña del Mar', 'Villa Alemana', 'Peña Blanca', 'Quilpué'];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtCLP(n) {
  n = Math.round(n || 0);
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function fmtFecha(iso) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtFechaLarga(iso) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function addDias(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Codifica los datos del pedido en un solo parámetro corto y opaco en vez de
// 8 parámetros legibles con datos personales a la vista en la URL.
function encodePedidoParam(obj) {
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodePedidoParam(str) {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function diasDesde(iso) {
  if (!iso) return 0;
  const d1 = new Date(iso + 'T00:00:00');
  const d2 = new Date(hoyISO() + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}

function calcViaje(viaje, pedidos) {
  const pedidosViaje = pedidos.filter(p => p.viajeId === viaje.id);
  const kilosVendidos = pedidosViaje.reduce((s, p) => s + Number(p.kilos || 0), 0);
  const ingresos = kilosVendidos * Number(viaje.precioVentaKg || 0);
  const costoCompra = Number(viaje.kilosComprados || 0) * Number(viaje.precioCompraKg || 0);
  const gastosViaje = (viaje.gastos || []).reduce((s, g) => s + Number(g.monto || 0), 0);
  const costoTotal = costoCompra + gastosViaje;
  const costoPorKilo = kilosVendidos > 0 ? costoTotal / kilosVendidos : 0;
  const utilidadPorKilo = Number(viaje.precioVentaKg || 0) - costoPorKilo;
  const utilidadTotal = ingresos - costoTotal;
  const merma = Math.max(0, Number(viaje.kilosComprados || 0) - kilosVendidos);
  const margenBruto = Number(viaje.precioVentaKg || 0) - Number(viaje.precioCompraKg || 0);
  const puntoEquilibrio = margenBruto > 0 ? gastosViaje / margenBruto : null;
  return {
    kilosVendidos, ingresos, costoCompra, gastosViaje, costoTotal,
    costoPorKilo, utilidadPorKilo, utilidadTotal, merma, puntoEquilibrio, pedidosViaje
  };
}

function estadoPagoInfo(estado) {
  switch (estado) {
    case 'pagado': return { label: 'Pagado', cls: 'pill-green' };
    case 'pendiente_transferencia': return { label: 'Pendiente (transferencia)', cls: 'pill-gold' };
    case 'pendiente_entrega': return { label: 'Paga a la entrega', cls: 'pill-blue' };
    default: return { label: estado, cls: 'pill-red' };
  }
}

function waLink(telefono, texto) {
  const num = (telefono || '').replace(/[^\d]/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Parsea un .txt exportado de WhatsApp ("Exportar chat" > "sin multimedia").
// Soporta el formato iOS "[d/m/aa, h:mm:ss a. m.] Nombre: texto" y el de
// Android "d/m/aaaa, h:mm - Nombre: texto". Líneas sin marca de tiempo se
// consideran continuación del mensaje anterior (saltos de línea dentro de un mensaje).
function parseWhatsappExport(text) {
  const lineRe = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+([\d:]{3,8}(?:\s?[ap]\.?\s?m\.?)?)\]?\s*[-–]?\s*([^:]{1,60}):\s?(.*)$/i;
  const out = [];
  text.split(/\r?\n/).forEach(line => {
    const m = line.match(lineRe);
    if (m) {
      out.push({ fecha: m[1], hora: m[2].trim(), remitente: m[3].trim(), texto: m[4] });
    } else if (out.length && line.trim()) {
      out[out.length - 1].texto += '\n' + line;
    }
  });
  return out;
}
