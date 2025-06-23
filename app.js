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

  db.collection("productos").add(producto).then(() => {
    alert("✅ Producto registrado");
    cargarProductos();
  });
}

function cargarProductos() {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "Cargando...";

  db.collection("productos").get().then(snapshot => {
    contenedor.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      contenedor.innerHTML += `
        <div class="p-3 bg-white rounded shadow">
          <strong>${p.nombre}</strong> (${p.categoria})<br/>
          Stock: ${p.stock} ${p.unidad} | Umbral: ${p.umbral} | Vida útil: ${p.vida_util} días
        </div>`;
    });
  });
}

function calcularPredicciones() {
  const contenedor = document.getElementById("predicciones");
  contenedor.innerHTML = "Calculando...";

  db.collection("productos").get().then(snapshot => {
    let html = `<table class="table-auto w-full text-left">
      <thead><tr class="bg-gray-100">
        <th class="px-2 py-1">Producto</th>
        <th class="px-2 py-1">Consumo Prom.</th>
        <th class="px-2 py-1">Stock</th>
        <th class="px-2 py-1">Vida útil</th>
        <th class="px-2 py-1">Máx. seguro</th>
        <th class="px-2 py-1">Sugerido</th>
      </tr></thead><tbody>`;

    snapshot.forEach(doc => {
      const p = doc.data();
      const historial = p.historial || {};
      const consumos = Object.values(historial);
      const promedio = consumos.length > 0
        ? consumos.reduce((a, b) => a + b, 0) / consumos.length
        : 0;

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
    contenedor.innerHTML = html;
  });
}

window.onload = cargarProductos;