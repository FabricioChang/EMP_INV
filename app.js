// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDlTr-BAF6DMhb4XeYhbkuiPOIc2vLrtDs",
  authDomain: "gestion-inventario-emp.firebaseapp.com",
  databaseURL: "https://gestion-inventario-emp-default-rtdb.firebaseio.com",
  projectId: "gestion-inventario-emp",
  storageBucket: "gestion-inventario-emp.appspot.com",
  messagingSenderId: "733370903687",
  appId: "1:733370903687:web:c2893acb73148f71e15c22"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// === CLIENTE AUTENTICADO ===
const cliente = localStorage.getItem("cliente");
const nombreCliente = localStorage.getItem("nombreCliente");

// Cambiar título dinámicamente si existe encabezado
const header = document.querySelector("header h1");
if (header && nombreCliente) {
  header.innerText = nombreCliente;
}

function registrarProducto() {
  const nombre   = document.getElementById("nombre").value.trim();
  const categoria= document.getElementById("categoria").value.trim();
  const unidad   = document.getElementById("unidad").value.trim();
  const stock    = parseInt(document.getElementById("stock").value, 10);
  const umbral   = parseInt(document.getElementById("umbral").value, 10);
  const vidaUtil = parseInt(document.getElementById("vida_util").value, 10);

  if (!nombre || isNaN(stock) || isNaN(umbral) || isNaN(vidaUtil)) {
    return alert("Completa todos los campos con datos válidos.");
  }

  // Genera una clave única para el producto
  const key = nombre.replace(/\s+/g, "_").toLowerCase();

  db.ref(`/${cliente}/inventario/${key}`).set({
    nombre,
    categoria,
    unidad,
    stock,
    umbral,
    vida_util: vidaUtil,
    historial: {}    // o puedes presemplificar con { [mesActual]: stock }
  })
  .then(() => {
    alert("Producto registrado ✔️");
    cargarProductos();        // refresca inventario si estás en inventario.html
    calcularPredicciones();   // refresca reabastecimiento si estás en esa pestaña
  })
  .catch(err => {
    console.error("Error al registrar:", err);
    alert("Hubo un error al registrar el producto.");
  });
}


// Cargar productos en tarjetas con controles de stock
function cargarProductos() {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "Cargando...";

  db.ref(`/${cliente}/inventario`).once("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      contenedor.innerHTML = "<p class='text-gray-500'>No hay productos registrados aún.</p>";
      return;
    }

    contenedor.innerHTML = "";
    Object.entries(data).forEach(([id, p]) => {
      contenedor.innerHTML += `
        <div class="p-3 bg-white rounded shadow text-sm space-y-1">
          <strong>${p.nombre}</strong> (${p.categoria})<br/>
          Stock: <span id="stock-${id}">${p.stock}</span> ${p.unidad || ""}<br/>
          Umbral: ${p.umbral} | Vida útil: ${p.vida_util} días
          <div class="flex items-center gap-2 mt-2">
            <button onclick="ajustarStock('${id}', -1)" class="px-2 py-1 bg-red-500 text-white rounded">-1</button>
            <button onclick="ajustarStock('${id}', 1)" class="px-2 py-1 bg-blue-500 text-white rounded">+1</button>
            <input type="number" id="ajuste-${id}" placeholder="Cantidad" class="w-20 px-2 py-1 border rounded text-sm input-cantidad" />
            <button onclick="ajustarStock('${id}', parseInt(document.getElementById('ajuste-${id}').value || 0))" class="px-2 py-1 bg-green-500 text-white rounded">Agregar</button>
            <button onclick="ajustarStock('${id}', -parseInt(document.getElementById('ajuste-${id}').value || 0))" class="px-2 py-1 bg-yellow-500 text-white rounded">Reducir</button>
          </div>
        </div>`;
    });
  });
}

// Modificar stock en tiempo real y actualizar visual
function ajustarStock(id, cantidad) {
  const stockEl = document.getElementById(`stock-${id}`);
  const nuevoStock = Math.max(0, parseInt(stockEl.textContent) + cantidad);
  db.ref(`${cliente}/inventario/${id}`).update({ stock: nuevoStock });
  stockEl.textContent = nuevoStock;
  calcularPredicciones(); // Actualiza la predicción en tiempo real
}

// Predicción de reabastecimiento basada en fecha actual
function calcularPredicciones() {
  const contenedor = document.getElementById("predicciones");
  if (!contenedor) return;
  contenedor.innerHTML = "Calculando...";

  const hoy = new Date();
  const diaActual = hoy.getDate();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diasRestantes = diasMes - diaActual;
  console.log("Cliente:", cliente);
  db.ref(`${cliente}/inventario`).once("value", snapshot => {
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

    console.log("PRUEBA:", JSON.stringify(data, null, 2));

    Object.entries(data).forEach(([nombre, p]) => {
      const historial = p.historial || {};
      const consumos = Object.values(historial);
      const promedio = consumos.length > 0 ? consumos.reduce((a, b) => a + b, 0) / consumos.length : 0;

      const vidaUtil = p.vida_util || 30;
      const maximoSeguro = (vidaUtil / 30) * promedio;

      const consumoDiario = promedio / 30;
      const consumoRestanteMes = diasRestantes * consumoDiario;
      const stockProyectado = p.stock - consumoRestanteMes;
      const sugerido = Math.max(0, Math.ceil(promedio - stockProyectado));

      html += `<tr class="border-b">
        <td class="px-2 py-1">${nombre}</td>
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

// Cargar productos al iniciar
window.addEventListener("DOMContentLoaded", () => {
  console.log("Cargando");
  cargarProductos();
  calcularPredicciones();
});
