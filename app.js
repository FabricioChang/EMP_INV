// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDlTr-BAF6DMhb4XeYhbkuiPOIc2vLrtDs",
  authDomain: "gestion-inventario-emp.firebaseapp.com",
  databaseURL: "https://gestion-inventario-emp-default-rtdb.firebaseio.com",
  projectId: "gestion-inventario-emp",
  storageBucket: "gestion-inventario-emp.firebasestorage.app",
  messagingSenderId: "733370903687",
  appId: "1:733370903687:web:c2893acb73148f71e15c22"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function registrarProducto() {
  const producto = {
    nombre: document.getElementById('nombre').value,
    categoria: document.getElementById('categoria').value,
    unidad: document.getElementById('unidad').value,
    stock: parseInt(document.getElementById('stock').value),
    umbral: parseInt(document.getElementById('umbral').value),
    vida_util: parseInt(document.getElementById('vida_util').value),
    historial: {},
    fechaCreacion: new Date().toISOString()
  };

  db.ref().push(producto).then(() => {
    alert("✅ Producto registrado");
    cargarProductos();
  });
}

function cargarProductos() {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "Cargando...";

  db.ref().once("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      contenedor.innerHTML = "<p class='text-gray-500'>No hay productos registrados aún.</p>";
      return;
    }

    contenedor.innerHTML = "";
    Object.values(data).forEach(p => {
      contenedor.innerHTML += `
        <div class="p-3 bg-white rounded shadow text-sm">
          <strong>${p.nombre}</strong> (${p.categoria})<br/>
          Stock: ${p.stock} ${p.unidad}<br/>
          Umbral: ${p.umbral} | Vida útil: ${p.vida_util} días
        </div>`;
    });
  });
}

function calcularPredicciones() {
  const contenedor = document.getElementById("predicciones");
  contenedor.innerHTML = "Calculando...";

  db.ref().once("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      contenedor.innerHTML = "<p class='text-gray-500'>No hay datos disponibles.</p>";
      return;
    }

    let html = `<table class="table-auto w-full text-left">
      <thead><tr class="bg-gray-100">
        <th class="px-2 py-1">Producto</th>
        <th class="px-2 py-1">Consumo Prom.</th>
        <th class="px-2 py-1">Stock</th>
        <th class="px-2 py-1">Vida útil</th>
        <th class="px-2 py-1">Máx. seguro</th>
        <th class="px-2 py-1">Sugerido</th>
      </tr></thead><tbody>`;

    Object.values(data).forEach(p => {
      const historial = p.historial || {};
      const consumos = Object.values(historial).filter(n => typeof n === 'number');
      const promedio = consumos.length > 0 ? consumos.reduce((a, b) => a + b, 0) / consumos.length : 0;

      const vidaUtil = p.vida_util || 30;
      const maximoSeguro = (vidaUtil / 30) * promedio;
      let sugerido = Math.ceil(promedio - p.stock);
      if (p.stock >= maximoSeguro) sugerido = 0;
      if (sugerido < 0) sugerido = 0;

      html += `<tr class="border-b">
        <td class="px-2 py-1">${p.nombre}</td>
        <td class="px-2 py-1">${promedio.toFixed(1)}</td>
        <td class="px-2 py-1">${p.stock}</td>
        <td class="px-2 py-1">${vidaUtil}</td>
        <td class="px-2 py-1">${maximoSeguro.toFixed(1)}</td>
        <td class="px-2 py-1 font-semibold">${sugerido}</td>
      </tr>`;
    });

    html += `</tbody></table>`;

    // Sección de pedido sugerido
    html += `<h3 class="mt-6 text-lg font-semibold">Pedido sugerido para el siguiente mes</h3>`;
    html += `<ul class="list-disc pl-5 mt-2 text-gray-700">`;

    Object.values(data).forEach(p => {
      const historial = p.historial || {};
      const consumos = Object.values(historial).filter(n => typeof n === 'number');
      const promedio = consumos.length > 0 ? consumos.reduce((a, b) => a + b, 0) / consumos.length : 0;
      const sugerido = Math.max(0, Math.ceil(promedio - (p.stock || 0)));

      html += `<li><strong>${p.nombre}</strong>: Se recomienda pedir <strong>${sugerido}</strong> ${p.unidad || ''} para cubrir un mes.</li>`;
    });

    html += `</ul>`;

    contenedor.innerHTML = html;
  });
}

window.onload = cargarProductos;