
# Descripción General de `Muestra.js`

El archivo `Muestra.js` es el controlador principal para la gestión de muestras en la aplicación IPP. Contiene funciones para consultar, mostrar, cargar, enviar y actualizar registros relacionados con muestras, utilizando Dexie.js para la base de datos local y Fetch API para la comunicación con el backend.

## Explicación de Funciones Principales

### Funciones de carga y consulta

- **cargarSelect**: Carga datos en un `<select>` desde la base local, con opciones de filtrado y ordenamiento.
- **CargarSelectFiltros**: Llena un `<select>` agrupando variedades en "Con Registro" y "Sin Registro" según si existen en la tabla Detalle.
- **cargarSelectVariedades**: Carga variedades específicas en un `<select>` usando un índice compuesto.
- **filterAndPopulateEstablecimientos**: Filtra establecimientos por canasta y municipio y los carga en el `<select>` correspondiente.
- **cargarDatosEstablecimiento**: Busca y muestra los datos de un establecimiento en el formulario.
- **cargarDatosVariedad**: Busca y muestra los datos de una variedad en el formulario, mostrando información de referencia.
- **mostrarDiferencias**: Muestra las variedades que están en Muestra pero no han sido registradas en Detalle.
- **mostrarListadoFaltantes**: Muestra en un modal las variedades faltantes por registrar.
- **marcarEstablecimientosconDatos**: Marca en el `<select>` los establecimientos que ya tienen registros en Detalle.
- **marcarVariedadesRegistradas**: Marca en el `<select>` las variedades que ya tienen registro en Detalle.

### Funciones de registro y validación

- **InsertarRegistroCausal**: Inserta registros en Detalle para variedades asociadas a un causal (no levantamiento efectivo).
- **insertarDetalle**: Inserta un registro individual en Detalle con los datos del formulario.
- **validarCampoTexto / validarNumero / validarBoolean / validarFecha**: Validan los datos ingresados en los formularios.
- **checkIncrementoPrecio**: Verifica si el precio ingresado supera el 15% respecto al anterior y muestra una alerta.
- **validateDecimal**: Limita la cantidad de decimales en un input numérico.

### Funciones de envío y sincronización

- **enviarDatos**: Prepara los datos no enviados, los envía al backend y actualiza el estado local.
- **jsonSeriesPrecios**: Obtiene y estructura los registros no enviados para el backend.
- **marcarComoEnviados**: Marca los registros como enviados en la base local tras la confirmación del backend.

### Funciones de interacción y utilidades

- **initListarCombos**: Inicializa los combos de la página GrabaMuestra.
- **setCurrentDateTime**: Asigna la fecha y hora actual al input correspondiente.
- **setupMuestraEventListeners**: Configura los listeners de eventos para la interacción de la página.
- **limpiarCamposEstablecimiento / limpiarVariedadDetalle**: Limpian y/o deshabilitan los campos del formulario.
- **obtenerCambioDelDia**: Obtiene el tipo de cambio del día desde la base local.
- **formatLocalDateTime**: Formatea la fecha y hora local en formato ISO.
- **obtenerValidaMuestra**: Consulta al backend los establecimientos con variedades pendientes de enviar y muestra el resultado en un modal.
- **irMuestra**: Navega al formulario de grabación y asigna los valores seleccionados.

### Funciones de consulta y carga de detalle

- **cargarRegistroCausal**: Busca un registro en Detalle por clave compuesta y llena los inputs si existe y si el estado lo permite.
- **cargarDetalleRegistro**: Busca un registro en Detalle por clave compuesta y llena los inputs si existe y si el estado lo permite.

## Ejemplos de Uso

### Ejemplo: Cargar variedades en un select

```javascript
const variedadesSelect = document.getElementById('variedadSelect');
cargarSelect('Variedades', variedadesSelect, 'objIdCatVariedad', 'nombreVariedad', 'nombreVariedad');
```

### Ejemplo: Insertar un registro de detalle

```javascript
insertarDetalle()
    .then(resultado => {
        if (resultado.success) {
            mostrarMensaje('Registro guardado', 'success');
        }
    });
```

### Ejemplo: Enviar datos al backend

```javascript
await enviarDatos();
```

## Detalles de la Estructura de Datos

### Objeto Detalle (registro de muestra)

```javascript
{
    objIdCatCanasta: Number,
    objCodMuni: Number,
    objIdEstablecimientoCanasta: Number,
    objIdCatVariedad: Number,
    fechaDefinidaRecoleccion: String,
    PrecioCalculado: Number,
    PrecioRealRecolectado: Number,
    Cantidad: Number,
    FechaRecoleccion: String,
    ObjIdTipoMoneda: Number,
    ObjIdEstadoVar: Number,
    ObjIdUnidRecolectada: Number,
    Observacion: String,
    Telefono: String,
    Encargado: String,
    Cargo: String,
    Direccion: String,
    TasaCambio: Number,
    FechaCreacion: String,
    UsuarioCreacion: String,
    Nveces: Number,
    Enviado: Number,
    FechaEnvio: String,
    muestraid: String,
    CoordenadaX: Number,
    CoordenadaY: Number
}
```

### Objeto CatEstablecimiento (para envío al backend)

```javascript
{
    IdCatEstablecimiento: Number,
    ObjCodMuni: Number,
    Razon_soc: String,
    Nombre: String,
    Encargado: String,
    Cargo: String,
    Telefono: String,
    Direccion: String,
    DiaHabil: String,
    CoordenadaX: Number,
    CoordenadaY: Number,
    establecimientosCanasta: String
}
```

Estos objetos se utilizan para la gestión y envío de datos entre el frontend, la base local y el backend. Puedes adaptar los ejemplos según la lógica de tu aplicación.

## Funciones Principales

- **mostrarDiferencias**: Muestra diferencias entre canastas, municipios y establecimientos.
- **mostrarListadoFaltantes**: Presenta los registros faltantes.
- **cargarRegistroCausal / cargarDetalleRegistro**: Busca y carga registros específicos en el almacén local.
- **enviarDatos**: Prepara los datos, los envía al backend y actualiza el estado local.
- **jsonSeriesPrecios**: Obtiene y estructura los registros no enviados para el backend.
- **marcarComoEnviados**: Actualiza el estado de los registros en Dexie.js tras el envío exitoso.

## Proceso de Manejo de Consulta de Usuario

1. **Frontend (HTML)**: El usuario interactúa con los archivos `layoutusuario.html` o `GrabaMuestra.html`, que disparan funciones de `Muestra.js` mediante eventos (botones, formularios, etc.).
2. **Controlador JS**: `Muestra.js` recibe la acción y ejecuta la función correspondiente (por ejemplo, consulta, carga o envío de datos).
3. **Dexie.js (IndexedDB)**: Si la consulta es local, se accede a la base de datos local usando Dexie.js para obtener o actualizar registros.
4. **Fetch API (Backend)**: Si se requiere comunicación con el backend, se prepara el JSON y se envía mediante Fetch API a la URL del servidor.
5. **Backend**: El backend recibe la petición, procesa los datos y responde (por ejemplo, confirmando el guardado o devolviendo información adicional).
6. **Actualización Local**: Tras la respuesta, `Muestra.js` actualiza el estado local (por ejemplo, marca registros como enviados) y muestra mensajes al usuario.

## Diagrama de Flujo

```mermaid
graph TD
    A[Usuario en layoutusuario.html / GrabaMuestra.html] -->|Evento (click, submit)| B[Función en Muestra.js]
    B --> C{¿Consulta local?}
    C -- Sí --> D[Dexie.js: Consulta/Actualización en IndexedDB]
    C -- No --> E[Fetch API: Envío/Recepción de datos]
    E --> F[Backend: Procesa petición]
    F --> G[Respuesta JSON]
    G --> H[Muestra.js: Actualiza estado local]
    D --> H
    H --> I[Mostrar mensaje al usuario]
```

## Datos Cenagro

### Municipio: León

| Tipo   | Cantidad |
|--------|----------|
| Aves   | 520      |
| Cerdos | 210      |
| Res    | 310      |

### Municipio: Jinotepe

| Tipo   | Cantidad |
|--------|----------|
| Aves   | 480      |
| Cerdos | 190      |
| Res    | 295      |

### Municipio: Estelí

| Tipo   | Cantidad |
|--------|----------|
| Aves   | 505      |
| Cerdos | 205      |
| Res    | 320      |
  
## Resumen

- El flujo inicia en el frontend HTML, pasa por el controlador JS, accede a la base local o al backend según la acción, y termina mostrando el resultado al usuario.
- El archivo `Muestra.js` centraliza la lógica de negocio y la comunicación entre el frontend y el backend.
- Los archivos `layoutusuario.html` y `GrabaMuestra.html` son la interfaz que ejecuta las funciones de `Muestra.js`.
