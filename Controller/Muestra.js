let fechadefinidarecoleccionInput;
let hiddenPrecioAnterior;
let hiddennVeces;

// funcion generica para cargar select
async function cargarSelect(storeName, selectElement, keyField, displayField, sortField, filterField = null, filterValue = null) {
    try {
        let query = db[storeName];
        if (filterField && filterValue) {
            query = query.where(filterField).equals(filterValue);
        }
        const items = await query.toArray(); // Obtener todos los elementos

        if (sortField) {
            items.sort((a, b) => (a[sortField] > b[sortField]) ? 1 : -1); // Ordenar manualmente
        }

        selectElement.innerHTML = ''; // Limpiar opciones existentes
        if (items.length > 0) {
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item[keyField];
                option.textContent = item[displayField];
                selectElement.appendChild(option);
            });
            selectElement.selectedIndex = -1; // Desseleccionar por defecto
        } else {
            selectElement.innerHTML = '<option value="">No hay datos disponibles</option>';
        }
        $(selectElement).trigger('change'); // Para Select2
    } catch (error) {
         mostrarMensajeAlertify(`Error al cargar ${storeName} - ${error.message}`, 'error');
        selectElement.innerHTML = '<option value="">Error al cargar datos</option>';
        $(selectElement).trigger('change');
    }
}

/**
 * Carga un <select> agrupando las variedades en "Con Registro" y "Sin Registro"
 * según si ya existen en la tabla Detalle.
 *
 * @param {number|string} canasta - objIdCatCanasta
 * @param {number|string} municipio - objCodMuni
 * @param {number|string} establecimiento - objIdEstablecimientoCanasta
 * @param {HTMLSelectElement} selectElement - Elemento <select> a llenar
 * @param {string} keyField - Campo a usar como valor (ej: 'objIdCatVariedad')
 * @param {string} displayField - Campo a mostrar (ej: 'nombreVariedad')
 */
async function CargarSelectFiltros(canasta, municipio, establecimiento, selectElement, keyField = 'objIdCatVariedad', displayField = 'nombreVariedad') {
    try {
        // === 0. Asegurar que selectElement sea un HTMLElement nativo ===
        if (selectElement.jquery) {
            // Es un objeto jQuery: obtenemos el primer elemento
            selectElement = selectElement[0];
        }

        if (!selectElement || !(selectElement instanceof HTMLElement)) {
            throw new Error("El parámetro 'selectElement' debe ser un elemento HTML válido (HTMLElement).");
        }

        // === 1. Validar y convertir parámetros a números ===
        const objIdCatCanasta = Number.parseInt(canasta, 10);
        const objCodMuni = Number.parseInt(municipio, 10);
        const objIdEstablecimientoCanasta = Number.parseInt(establecimiento, 10);

        if (isNaN(objIdCatCanasta) || isNaN(objCodMuni) || isNaN(objIdEstablecimientoCanasta)) {
            throw new Error("Parámetros numéricos no válidos.");
        }

        // === 2. Obtener variedades del establecimiento ===
        const variedades = await db.Variedades
            .where('[objIdCatCanasta+objIdEstablecimientoCanasta]')
            .equals([objIdCatCanasta, objIdEstablecimientoCanasta])
            .toArray();

        if (variedades.length === 0) {
            selectElement.innerHTML = '<option value="" disabled selected>No hay variedades para este establecimiento</option>';
            $(selectElement).trigger('change');
            return;
        }

        // === 3. Obtener registros ya guardados en Detalle ===
        const registrosDetalle = await db.Detalle
            .where('[objIdCatCanasta+objCodMuni+objIdEstablecimientoCanasta]')
            .equals([objIdCatCanasta, objCodMuni, objIdEstablecimientoCanasta])
            .toArray();

        // Extraer los objIdCatVariedad como números
        const idsEnDetalle = new Set(registrosDetalle.map(d => Number(d.objIdCatVariedad)));

        // === 4. Clasificar variedades: Con Registro vs Sin Registro ===
        const conRegistro = [];
        const sinRegistro = [];

        for (const varItem of variedades) {
            const id = Number(varItem.objIdCatVariedad); // Asegurar que sea número
            //const nombre = varItem[displayField] || `Variedad ${id}`;
            // Asegurar que el campo de visualización exista
            const nombre = varItem[displayField] != null ? varItem[displayField] : `Variedad ${id}`;

            const item = {
                [keyField]: id,
                [displayField]: nombre
            };

            if (idsEnDetalle.has(id)) {
                conRegistro.push(item);
            } else {
                sinRegistro.push(item);
            }
        }

        // === 5. Ordenar alfabéticamente por el campo de visualización ===
        // const compare = (a, b) => a[displayField].localeCompare(b[displayField]);
        const compare = (a, b) => {
            const valA = a[displayField] != null ? String(a[displayField]) : '';
            const valB = b[displayField] != null ? String(b[displayField]) : '';
            return valA.localeCompare(valB);
        };

        conRegistro.sort(compare);
        sinRegistro.sort(compare);

       // === 6. Limpiar y llenar el <select> ===
        selectElement.innerHTML = ''; // Esto sí funciona

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.textContent = 'Seleccione una opción';
        selectElement.appendChild(defaultOption); // ✅ Ahora funciona

        // Grupo: Sin Registro
        if (sinRegistro.length > 0) {
            const optgroupSin = document.createElement('optgroup');
            optgroupSin.label = 'Sin Registro';

            sinRegistro.forEach(item => {
                const option = document.createElement('option');
                option.value = item[keyField];
                option.textContent = `${item[displayField]} / ${item[keyField]}`;
                optgroupSin.appendChild(option);
            });

            selectElement.appendChild(optgroupSin);
        }

        // Grupo: Con Registro
        if (conRegistro.length > 0) {
            const optgroupCon = document.createElement('optgroup');
            optgroupCon.label = 'Con Registro';

            conRegistro.forEach(item => {
                const option = document.createElement('option');
                option.value = item[keyField];
                option.textContent = `${item[displayField]} / ${item[keyField]}`;
                optgroupCon.appendChild(option);
            });

            selectElement.appendChild(optgroupCon);
        }

        // === 7. Notificar a Select2 u otros listeners ===
        $(selectElement).trigger('change');
    } catch (error) {
        mostrarMensajeAlertify(`Error al cargar el select de variedades: ${error.message}`, 'error');
        selectElement.innerHTML = '<option value="" disabled selected>Error al cargar datos</option>';
        $(selectElement).trigger('change');
    }
}

// Función para cargar el select de variedades usando un índice compuesto
async function cargarSelectVariedades(selectElement, objIdCatCanasta, objIdEstablecimientoCanasta) {
    try {
        const idEstCanasta = Number(objIdCatCanasta);
        const idEstablecimiento = Number(objIdEstablecimientoCanasta);
        // Consulta usando el índice compuesto
        const query = db.Variedades
            .where('[objIdCatCanasta+objIdEstablecimientoCanasta]')
            .equals([idEstCanasta, idEstablecimiento]);

        const items = await query.toArray(); // Obtener todos los elementos

        // Limpiar opciones existentes
        selectElement.innerHTML = ''; 
        if (items.length > 0) {
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.objIdCatVariedad; // Asignar objIdCatCanasta como valor
                option.textContent = item.nombreVariedad + ' / ' + item.objIdCatVariedad; // Asignar nombreVariedad como texto
                selectElement.appendChild(option);
            });
            selectElement.selectedIndex = -1; // Desseleccionar por defecto
        } else {
            selectElement.innerHTML = '<option value="">No hay datos disponibles</option>';
        }
        $(selectElement).trigger('change'); // Para Select2
    } catch (error) {
        mostrarMensajeAlertify(`Error al cargar variedades: ${error.message}`, 'error');
        selectElement.innerHTML = '<option value="">Error al cargar datos</option>';
        $(selectElement).trigger('change');
    }
}

//inicializar combos de la pagina GrabaMuestra
function initListarCombos() {
    const canastaSelect = document.getElementById('canastaSelect');    
    const causalSelect = document.getElementById('causalSelect');

    if (canastaSelect) {
        cargarSelect('Canasta', canastaSelect, 'idCatCanasta', 'nombre', 'nombre');
    }    

    if (causalSelect) {
        cargarSelect('Causales', causalSelect, 'idCatValorCatalogo', 'nombre', 'nombre');
    }
}

// Asignar la fecha actual al input de fecha y hora (sin cambios)
function setCurrentDateTime() {
    const input = document.getElementById('fechaInput');
    if (!input) return;
    const now = new Date();
    // Format YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    input.value = formatted;
}

// Encapsula todos los eventos de ListarMuestra.html
function setupMuestraEventListeners() {
    $('#canastaSelect').on('select2:select',  function (e) { 
        const municipioSelect = document.getElementById('municipioSelect');
        if (municipioSelect) {
            cargarSelect('Municipios', municipioSelect, 'iD_Muni', 'noM_MUNI', 'iD_Muni', 'objIdCatCanasta', Number.parseInt($(this).val()));
        }
    });

    //selecciona causal y carga establecimiento
  $('#causalSelect').on('select2:select',  function (e) { 
    const canasta = document.getElementById('canastaSelect');
    const municipio = document.getElementById('municipioSelect');

    // Validar al menos un empleado seleccionado
    if (!canasta.value || !municipio.value) {
        mostrarMensaje("Por favor, seleccione canasta y municipio.", "error");
        return;
    }

      filterAndPopulateEstablecimientos(canasta, municipio)
      .then(() => { // Usa una función flecha para asegurar que `this` se mantenga correcto.
         $("#establecimientoSelect").prop("disabled", false);
        return marcarEstablecimientosconDatos(canasta.value, municipio.value); // Retorna la promesa 
      })
      .catch(error => {
          console.error("Ocurrió un error en la cadena de promesas:", error);
          // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
          // throw error;        
      });
  });

  //selecciona establecimiento y carga datos
  $('#establecimientoSelect').on('select2:select',  async function (e) {    
    const canastaId = $("#canastaSelect").val();   
    const municipioId = $("#municipioSelect").val();    
    const establecimientoId = $(this).val();
    const noCausal = await cargarRegistroCausal(canastaId, municipioId, establecimientoId);
    if (noCausal) {
        cargarDatosEstablecimiento(establecimientoId)
            .then(() => {
                getLocation();
                $("#filtrarBtn").prop("disabled", false);
                return mostrarDiferencias(canastaId, municipioId, establecimientoId); // Retorna la promesa
            })
            .catch(error => {
                console.error("Ocurrió un error en la cadena de promesas:", error);
                // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
                // throw error;        
            });
    }
  });

  // Manejador de evento para el botón de filtrar
    document.getElementById('filtrarBtn').addEventListener('click', () => {
        const estadoId = $("#causalSelect").val();
        const canastaId = $("#canastaSelect").val()
        const municipioId = $("#municipioSelect").val()
        const establecimientoId = $("#establecimientoSelect").val();
        const variedadesSelect = document.getElementById('variedadSelect');
        const monedaSelect = document.getElementById('monedaSelect');
        if (estadoId==58) {  
            document.getElementById('variedadDetalle').style.display = 'block';
            CargarSelectFiltros(canastaId, municipioId, establecimientoId, variedadesSelect, "objIdCatVariedad", "nombreVariedad")
            cargarSelect('Estados', estadoSelect, 'idCatValorCatalogo', 'nombre', 'nombre'); 
            cargarSelect('Monedas', monedaSelect, 'idCatValorCatalogo', 'nombre', 'nombre'); 
            marcarVariedadesRegistradas(canastaId, municipioId, establecimientoId, 'variedadSelect')
        }
        else {
            confirmarCausal();            
        }
    });    

    //selecciona variedad y carga datos
  $('#variedadSelect').on('select2:select',  async function (e) { 
    const canastaId = $("#canastaSelect").val();   
    const municipioId = $("#municipioSelect").val();   
    const establecimientoId = $("#establecimientoSelect").val();
    const variedadId = $(this).val();
    const undmedSelect = document.getElementById('undmedSelect');
    cargarSelect('UnidadMedida', undmedSelect, 'objURecolId', 'nombreUnidad', 'nombreUnidad', 'objIdCatVariedad', Number.parseInt(variedadId))
    .then(() => {
        cargarDatosVariedad(establecimientoId, variedadId)
        .then(() => {
                 return cargarDetalleRegistro(canastaId, municipioId, establecimientoId, variedadId);  
            })
            .catch(error => {
                console.error("Ocurrió un error en la cadena de promesas:", error);
                // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
                // throw error;        
            });
       
    })
    .catch(error => {
        mostrarMensajeAlertify(`ocurrio un error en la cadena de promesas : ${error.message}`, 'error');
        // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
        // throw error;        
    });
  });

  //selecciona moneda y obtiene tipo de cambio
  $('#monedaSelect').on('select2:select',  async function (e) { 
    const precioCalculadoInput = document.getElementById('preciocalculadoInput');
    if ($(this).val() == 42) { // C$ es el ID de la moneda local
        const precioInput = document.getElementById('precioInput');
        precioCalculadoInput.value = precioInput.value;
    }
    else {
         const cambioDelDia = await obtenerCambioDelDia();
        const precioSelect = document.getElementById('precioInput');
        const PrecioCalculado =  cambioDelDia * Number.parseFloat(precioSelect.value || 0);        
        precioCalculadoInput.value = Number.parseFloat(PrecioCalculado);
    }   
  });

  //validar precio
  document.getElementById('precioInput').addEventListener('blur', checkIncrementoPrecio);

  //estado
  $('#estadoSelect').on('select2:select',  async function (e) { 
    if ($(this).val() != 16) { // no recolectado
        $("#precioInput").prop("disabled", true); 
        if ($("#undmedSelect").val() == null) {
            $("#undmedSelect").prop("disabled", false);
        } 
        else {
            $("#undmedSelect").prop("disabled", true);
        }              
        $("#monedaSelect").val(42).trigger('change'); // Seleccionar C$ por defecto 
        $("#monedaSelect").prop("disabled", true);
    }
    else {
        $("#precioInput").prop("disabled", false);
        $("#undmedSelect").prop("disabled", false);
        $("#monedaSelect").prop("disabled", false);
        $("#monedaSelect").val("CA").trigger('change');         
    }
  });

  document.getElementById('guardarBtn').addEventListener('click', () => {        
        insertarDetalle()
        .then(resultado => {
            if (!resultado.success) {
                mostrarMensaje(`Error guardarBtn: ${resultado.message}`, 'error');
            } 
            else {
                const canastaVal = document.getElementById('canastaSelect').value;
                const municipioVal = document.getElementById('municipioSelect').value;
                const establecimientoVal = document.getElementById('establecimientoSelect').value;
                const selectElement = document.getElementById('variedadSelect');
                // Limpiar formulario después de guardar
                limpiarVariedadDetalle('nuevo');
                marcarEstablecimientosconDatos(canastaVal,municipioVal);
                CargarSelectFiltros(canastaVal,municipioVal,establecimientoVal,selectElement,'objIdCatVariedad','nombreVariedad');
                marcarVariedadesRegistradas(canastaVal, municipioVal, establecimientoVal, 'variedadSelect');
            }
        })
        .catch(error => {
            mostrarMensajeAlertify(`Error en guardarBtn : ${error.message}`, 'error');
        });
    });
}

//filtrar y pobar establecimiento
async function filterAndPopulateEstablecimientos(canasta, municipio) {
    const db = await IniciarBaseDatos();

    const establecimientoSelect = document.getElementById('establecimientoSelect');

    const canastaValue = Number.parseInt(canasta.value);
    const municipioValue = Number.parseInt(municipio.value);

    if (!canastaValue) {
        mostrarMensajeAlertify('Por favor seleccione una Canasta.', 'error');
        return;
    }
    if (!municipioValue) {
        mostrarMensajeAlertify('Por favor seleccione un Municipio.', 'error');
        return;
    }

    // Usar Dexie para filtrar por Canasta y municipio
    const filteredEstablecimientos = await db.Establecimientos
        .where('[idCatCanasta+objCodMuni]')
        .equals([canastaValue, municipioValue])
        .toArray();

    // Limpiar select
    establecimientoSelect.innerHTML = '<option value="" disabled selected>Seleccione Establecimiento</option>';

    // Cargar opciones
    if (filteredEstablecimientos.length > 0) {
        const establecimientosUnicosMap = new Map();

        for (const establecimientos of filteredEstablecimientos) {
            // Asegurar que CodInformante sea único
            if (!establecimientosUnicosMap.has(establecimientos.idEstablecimientoCanasta)) {
                establecimientosUnicosMap.set(establecimientos.idEstablecimientoCanasta, establecimientos);
            }
        }

        for (const { idEstablecimientoCanasta, nombreEstablecimieto } of establecimientosUnicosMap.values()) {
            const option = document.createElement('option');
            option.value = idEstablecimientoCanasta;
            option.textContent = nombreEstablecimieto + ' / ' + idEstablecimientoCanasta;
            establecimientoSelect.appendChild(option);
        }
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No hay establecimientos disponibles";
        option.disabled = true;
        establecimientoSelect.appendChild(option);
    }
}

// Función para cargar datos establecimiento
async function cargarDatosEstablecimiento(idEstablecimientoCanasta) {
    try {
        // Buscar el establecimiento por el índice idEstablecimientoCanasta
        const establecimiento = await db.Establecimientos
            .where('idEstablecimientoCanasta')
            .equals(Number.parseInt(idEstablecimientoCanasta))
            .first();

        if (establecimiento) {
            // Objeto que mapea IDs de inputs con sus propiedades correspondientes
            const campos = {
                razonsocialInput: { valor: establecimiento.razon_soc },
                telefonoInput: { valor: establecimiento.telefono },
                encargadoInput: { valor: establecimiento.encargado },
                cargoInput: { valor: establecimiento.cargo },
                direccionlInput: { valor: establecimiento.direccion },
                diahabilInput: { valor: establecimiento.diaHabil }
            };

            fechadefinidarecoleccionInput = establecimiento.FechaDefinidaRecoleccion

            // Asignar valores y deshabilitar campos
            Object.entries(campos).forEach(([id, {valor}]) => {
                const input = document.getElementById(id);
                if (input ) {
                    input.value = valor || '';
                    if (input.id =="razonsocialInput" || input.id == "diahabilInput") {
                        input.disabled = true;
                        input.classList.add('disabled-input');
                    }
                    else {
                        input.disabled = false;
                        input.classList.remove('disabled-input');
                    }
                }
            });

        } else {
            limpiarCamposEstablecimiento(true); // Limpiar y deshabilitar
            document.getElementById('resultadoestablecimiento').innerHTML = '<p>Establecimiento no encontrado</p>';
        }
    } catch (error) {
        mostrarMensajeAlertify(`Error al cargar los datos : ${error.message}`, 'error');
        limpiarCampos(true); // Limpiar y deshabilitar
        document.getElementById('resultadoestablecimiento').innerHTML = '<p>Error al cargar los datos del establecimiento.</p>';
    }
}

// Función para limpiar y opcionalmente deshabilitar campos
function limpiarCamposEstablecimiento(deshabilitar = false) {
    const ids = [
        'observacionesInput',
        'razonsocialInput',
        'telefonoInput',
        'encargadoInput',
        'cargoInput',
        'direccionlInput',
        'diahabilInput'
    ];

    ids.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = '';
            // if (deshabilitar) {
            //     input.disabled = true;
            //     input.classList.add('disabled-input');
            // } else {
            //     input.disabled = false;
            //     input.classList.remove('disabled-input');
            // }
        }
    });
    $('#causalSelect').select2("val", "ca");
    $('#establecimientoSelect').select2("val", "ca");
    fechadefinidarecoleccionInput = '';
}

//confirmar causal
async function confirmarCausal() {
    // Mostrar el modal de confirmación
    new bootstrap.Modal(document.getElementById("modalConfirmacion")).show();

    // Agregar evento al botón de eliminar
    $('#btnConfirmar').off('click').on('click', async function() {
        try {
             $("#filtrarBtn").prop("disabled", true);
            InsertarRegistroCausal()
            // .then(() => { // Usa una función flecha para asegurar que `this` se mantenga correcto.                
            //     return marcarInformantesConDatosHoy(semana.value, dia.value); // Retorna la promesa de marcarInformantesConDatosHoy()
            // })
            .catch(error => {
                mostrarMensajeAlertify(`Error en la cadena de promesas: ${error.message}`, 'error');
                // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
                // throw error;        
            });
        } catch (error) {
            mostrarMensajeAlertify(`Error inesperado: ${error.message}`, 'error');
        } finally {
            // Ocultar el modal de confirmación
            $('#modalConfirmacion').modal('hide');
        }
    });

    $('#btnCancelar').off('click').on('click', function() { 
        $('#modalConfirmacion').modal('hide');
    })
}

// Función para insertar un arreglo de registros en detalle que son causal
async function InsertarRegistroCausal() {
    try {
        // Si no, usa: const db = await openDB();

        const canastaSelect = document.getElementById('canastaSelect');
        const municipioSelect = document.getElementById('municipioSelect');
        const establecimientoSelect = document.getElementById('establecimientoSelect');
        const fechaInput = document.getElementById('fechaInput');
        const usuarioInput = document.getElementById('hidden-usuarioId');
        const causalSelect = document.getElementById('causalSelect');
        const observacionesInput = document.getElementById('observacionesInput');

        // Validar elementos del DOM
        if (!canastaSelect || !municipioSelect || !establecimientoSelect || !usuarioInput || !causalSelect) {
            throw new Error("Faltan elementos del formulario: verifica que todos los controles existan.");
        }

        // Parsear valores
        const canasta = Number.parseInt(canastaSelect.value, 10);
        const municipio = Number.parseInt(municipioSelect.value, 10);
        const establecimiento = Number.parseInt(establecimientoSelect.value, 10);
        const causal = Number.parseInt(causalSelect.value, 10);
        const usuario = usuarioInput.value?.trim();
        const observacion = observacionesInput?.value?.trim() || '';
        const telefono = document.getElementById('telefonoInput')?.value?.trim() || null;
        const direccion = document.getElementById('direccionlInput')?.value?.trim() || null;
        const encargado = document.getElementById('encargadoInput')?.value?.trim() || null;
        const cargo = document.getElementById('cargoInput')?.value?.trim() || null;
        const fechaStr = fechaInput?.value?.trim() || new Date().toISOString().split('T')[0];

        const fechaActual = new Date();
        const mesActual = fechaActual.getMonth() + 1; // Los meses van de 0-11
        const añoActual = fechaActual.getFullYear();
        const muestraid = mesActual + añoActual.toString();
        
        // Validaciones
        if (isNaN(canasta) || isNaN(municipio) || isNaN(establecimiento) || isNaN(causal)) {
            throw new Error("Canasta, Municipio, Establecimiento o Causal no son válidos.");
        }
        if (!usuario) throw new Error("Usuario no válido.");

        const fecha = validarFecha(fechaStr, 'Fecha');

        // Paso 1: Obtener variedades del establecimiento
        const variedades = await db.Variedades
            .where('[objIdCatCanasta+objIdEstablecimientoCanasta]')
            .equals([canasta, establecimiento])
            .toArray();

        if (variedades.length === 0) {
            throw new Error("No se encontraron variedades para esta combinación de canasta y establecimiento.");
        }

        // Extraer claves para MuestraPrevia
        const keysMuestraPrevia = variedades.map(v => [v.objIdEstablecimientoCanasta, v.objIdCatVariedad]);

        // Paso 2: Obtener datos de MuestraPrevia
        const muestrasPrevias = await db.MuestraPrevia
            .where('[objIdEstablecimientoCanasta+objIdCatVariedad]')
            .anyOf(keysMuestraPrevia)
            .toArray();

        // Mapear a estructura útil
        const mapMuestra = new Map(
            muestrasPrevias.map(m => [
                `${m.objIdEstablecimientoCanasta}_${m.objIdCatVariedad}`,
                m
            ])
        );

        // Paso 3: Preparar registros para Detalle
        const hoy = new Date();
        const coordenadaX = parseFloat(document.getElementById('lblLongitud')?.value || 0);
        const coordenadaY = parseFloat(document.getElementById('lblLatitud')?.value || 0);

        const nuevosRegistros = [];

        for (const variedad of variedades) {
            const key = `${variedad.objIdEstablecimientoCanasta}_${variedad.objIdCatVariedad}`;
            const muestra = mapMuestra.get(key);
            
            nuevosRegistros.push({
                objIdCatCanasta: canasta,
                objCodMuni: municipio,
                objIdEstablecimientoCanasta: variedad.objIdEstablecimientoCanasta,
                objIdCatVariedad: variedad.objIdCatVariedad,

                fechaDefinidaRecoleccion: fechadefinidarecoleccionInput, 
                PrecioCalculado: 0,
                PrecioRealRecolectado: 0,
                Cantidad: 1,
                FechaRecoleccion: fecha,
                ObjIdTipoMoneda: 42, // default C$
                ObjIdEstadoVar: causal,
                ObjIdUnidRecolectada: muestra?.ObjIdUnidRecolectada || null,
                Observacion: observacion,
                Telefono: telefono,
                Encargado: encargado,
                Cargo: cargo,
                Direccion: direccion,
                TasaCambio : 0,

                FechaCreacion: formatLocalDateTime(hoy),
                UsuarioCreacion: usuario,
                Nveces: (muestra?.nVeces || 0) + 1,
                Enviado: 0,
                FechaEnvio: null,
                muestraid: muestraid,
                CoordenadaX: !isNaN(coordenadaX) ? coordenadaX : null,
                CoordenadaY: !isNaN(coordenadaY) ? coordenadaY : null
            });
        }

        // Paso 4: Insertar en Detalle con transacción Dexie nativa
        await db.transaction('rw', db.Detalle, async () => {
            await db.Detalle.bulkPut(nuevosRegistros);
        });

        // ✅ Éxito
        const count = nuevosRegistros.length;
        limpiarCamposEstablecimiento();
        mostrarMensajeAlertify('Registros guardados exitosamente', 'success');

        return {
            success: true,
            message: `Se insertaron ${count} registros.`,
        };

    } catch (error) {
        mostrarMensajeAlertify(`Error in InsertarResgistroCausal: ${error.message}`, 'error');
        return {
            success: false,
            message: error.message
        };
    }
}

//funcion para insertar detalle
async function insertarDetalle() {
    try {
        const canastaSelect = document.getElementById('canastaSelect');
        const municipioSelect = document.getElementById('municipioSelect');
        const establecimientoSelect = document.getElementById('establecimientoSelect');
        const variedadSelect = document.getElementById('variedadSelect');
        const fechaInput = document.getElementById('fechaInput');
        const usuarioInput = document.getElementById('hidden-usuarioId');
        const causalSelect = document.getElementById('causalSelect');
        const observacionesInput = document.getElementById('observaciones2Input');
        const estadoSelect = document.getElementById('estadoSelect');
        const monedaSelect = document.getElementById('monedaSelect');
        const undmedSelect = document.getElementById('undmedSelect');

        // Validar elementos del DOM
        if (!canastaSelect || !municipioSelect || !establecimientoSelect || !variedadSelect || !usuarioInput || !causalSelect) {
            throw new Error("Faltan elementos del formulario: verifica que todos los controles existan.");
        }

        // Parsear valores
        const canasta = Number.parseInt(canastaSelect.value, 10);
        const municipio = Number.parseInt(municipioSelect.value, 10);
        const establecimiento = Number.parseInt(establecimientoSelect.value, 10);
        const variedad = Number.parseInt(variedadSelect.value, 10);
        const causal = Number.parseInt(causalSelect.value, 10);
        const estado = Number.parseInt(estadoSelect.value, 10);
        const usuario = usuarioInput.value?.trim();
        const observacion = observacionesInput?.value?.trim() || '';
        const telefono = document.getElementById('telefonoInput')?.value?.trim() || null;
        const direccion = document.getElementById('direccionlInput')?.value?.trim() || null;
        const encargado = document.getElementById('encargadoInput')?.value?.trim() || null;
        const cargo = document.getElementById('cargoInput')?.value?.trim() || null;
        const fechaStr = fechaInput?.value?.trim() || new Date().toISOString().split('T')[0];
        const fecha = validarFecha(fechaStr, 'Fecha');
        const precio = validarNumero(document.getElementById('precioInput')?.value, 'Precio', true, estado);
        const precioCalculado = validarNumero(document.getElementById('preciocalculadoInput')?.value, 'Precio Calculado', true, estado);
        const moneda = Number.parseInt(monedaSelect.value, 10);
        const undmed = Number.parseInt(undmedSelect.value, 10);

        // Paso 1: Calcular TasaCambio
        let TasaCambio;
        if (moneda == 42) { TasaCambio = 0; } else {
            TasaCambio = await obtenerCambioDelDia(); }

        const fechaActual = new Date();
        const mesActual = fechaActual.getMonth() + 1; // Los meses van de 0-11
        const añoActual = fechaActual.getFullYear();
        const muestraid = mesActual + añoActual.toString();
        
        // Validaciones
        if (isNaN(canasta) || isNaN(municipio) || isNaN(establecimiento) || isNaN(causal) || isNaN(variedad) || isNaN(estado)) {
            throw new Error("Canasta, Municipio, Establecimiento, Causal, Variedad o Estado no son válidos.");
        }
        if (!usuario) throw new Error("Usuario no válido.");

        // Preparar registros para Detalle
        const hoy = new Date();
        const coordenadaX = parseFloat(document.getElementById('lblLongitud')?.value || 0);
        const coordenadaY = parseFloat(document.getElementById('lblLatitud')?.value || 0);

        const nuevosRegistro = {
            objIdCatCanasta: canasta,
            objCodMuni: municipio,
            objIdEstablecimientoCanasta: establecimiento,
            objIdCatVariedad: variedad,

            fechaDefinidaRecoleccion: fechadefinidarecoleccionInput,
            PrecioCalculado: precioCalculado,
            PrecioRealRecolectado: precio,
            Cantidad: 1,
            FechaRecoleccion: fecha,
            ObjIdTipoMoneda: moneda, 
            ObjIdEstadoVar: estado,
            ObjIdUnidRecolectada: undmed || null,
            Observacion: observacion,
            Telefono: telefono,
            Encargado: encargado,
            Cargo: cargo,
            Direccion: direccion,
            TasaCambio: TasaCambio,

            FechaCreacion: formatLocalDateTime(hoy),
            UsuarioCreacion: usuario,
            Nveces: 0,
            Enviado: 0,
            FechaEnvio: null,
            muestraid: muestraid,
            CoordenadaX: !isNaN(coordenadaX) ? coordenadaX : null,
            CoordenadaY: !isNaN(coordenadaY) ? coordenadaY : null
        };

        // Insertar en Detalle con transacción Dexie nativa
        await db.transaction('rw', db.Detalle, async () => {
            await db.Detalle.put(nuevosRegistro);
        });

        // ✅ Éxito 
        mostrarMensajeAlertify('Registros guardados exitosamente', 'success');

        return {
            success: true,
            message: `Se insertaron correctamente el registro.`,
        };


    } catch (error) {
        mostrarMensajeAlertify(`Error en insertarDtalle: ${error.message}`, 'error');

        return {
            success: false,
            message: error.message
        };
    }
}

function validarCampoTexto(valor, nombreCampo) {
    const valorLimpio = valor?.trim();
    if (!valorLimpio) {
        throw new Error(`${nombreCampo} es obligatorio`);
    }
    return valorLimpio;
}

function validarNumero(valor, nombreCampo, esRequerido = false, estado = 0) {
    // Verificar si el valor es una cadena vacía
    if (esRequerido && (!valor || valor.trim() === '')) {
        throw new Error(`${nombreCampo} es obligatorio y debe ser un número ${estado === 16 ? 'mayor que 0' : 'positivo'}`);
    }
    
    const valorNumerico = Number(valor?.trim());
    
    // Validar si el valor no es un número
    if (Number.isNaN(valorNumerico)) {
        if (esRequerido) {
            throw new Error(`${nombreCampo} es obligatorio y debe ser un número ${estado === 16 ? 'mayor que 0' : 'positivo'}`);
        }
        return 0; // Valor por defecto para campos no requeridos
    }
    
    // Validar según el estado
    if ((estado === 16) && valorNumerico <= 0) {
        if (esRequerido) {
            throw new Error(`${nombreCampo} debe ser mayor que 0`);
        }
        return 0; // Valor por defecto para campos no requeridos
    } else if (estado !== 16 && valorNumerico < 0) {
        if (esRequerido) {
            throw new Error(`${nombreCampo} es obligatorio y debe ser un número positivo`);
        }
        return 0; // Valor por defecto para campos no requeridos
    }
    
    return valorNumerico;
}

function validarBoolean(valor, nombreCampo) {
    if (valor?.trim().toLowerCase() === 'true') return true;
    if (valor?.trim().toLowerCase() === 'false') return false;
    throw new Error(`${nombreCampo} debe ser true o false`);
}

function validarFecha(fecha, nombreCampo) {
    const fechaValida = new Date(fecha);
    if (Number.isNaN(fechaValida.getTime())) {
        throw new Error(`${nombreCampo} no es una fecha válida`);
    }
    return fecha;
}

function validateDecimal(input) {
    // Obtenemos el valor del input
    let value = input.value;
    
    // Si hay un punto decimal
    if (value.includes('.')) {
        // Dividimos en parte entera y decimal
        const parts = value.split('.');
        
        // Si hay más de 2 decimales, truncamos
        if (parts[1] && parts[1].length > 2) {
            input.value = parts[0] + '.' + parts[1].substring(0, 2);
        }
    }
}

// Función para cargar datos variedad en tabla
async function cargarDatosVariedad(objIdEstablecimientoCanasta, objIdCatVariedad) {
    try {
         // Convertir parámetros a números
        const idEstCanasta = Number.parseInt(objIdEstablecimientoCanasta);
        const idVariedad = Number.parseInt(objIdCatVariedad);
        // Consulta usando Dexie.js
        const variedad = await db.MuestraPrevia
            .where('[objIdEstablecimientoCanasta+objIdCatVariedad]') // Índice compuesto
            .equals([idEstCanasta, idVariedad])
            .first();

        // Verificar si se encontró el establecimiento
        if (variedad) {
            // Crear la tabla
            const tabla = `
                <table class="table table-sm table-bordered tabla-variedad">
                    <thead>
                        <tr>
                            <th colspan="4">Datos Referencia</th>                       
                        </tr>
                        <tr>
                            <th colspan="2">Precio</th>
                            <th colspan="2"></th>                        
                        </tr>
                        <tr>
                            <th>Anterior</th>
                            <th>Calculado</th>
                            <th>Estado</th>
                            <th>Especificacion</th>                           
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${variedad.precioRealRecolectado || ''}</td>
                            <td>${variedad.precioCalculado || ''}</td>
                            <td>${variedad.nombreEstado || ''}</td>
                            <td class="especificacion-cell">${variedad.especificacion || ''}</td>                            
                        </tr>
                    </tbody>
                </table>
            `;

            // Insertar la tabla en el div 
            document.getElementById('resultadovariedad').innerHTML = tabla;
            $("#undmedSelect").val(variedad.ObjIdUnidRecolectada).trigger('change'); // Actualizar select de unidad de medida
            hiddenPrecioAnterior = variedad.precioRealRecolectado; 
            hiddennVeces = variedad.nVeces;         
        } else {
            document.getElementById('resultadovariedad').innerHTML = '<p>Variedad no encontrado</p>';
            hiddenPrecioAnterior = 0; 
            hiddennVeces = 0;     
        }
    } catch (error) {
        mostrarMensajeAlertify(`Error al cargar los datos de la variedad: ${error.message}`, 'error');
        document.getElementById('resultadovariedad').innerHTML = '<p>Error al cargar los datos de la variedad.</p>';
    }
}

// Función para verificar el aumento del 15%
function checkIncrementoPrecio() {
    const precioInput = document.getElementById('precioInput');    
    const nuevoPrecio = parseFloat(precioInput.value);
    const precioAnterior = parseFloat(hiddenPrecioAnterior);
    
    if (isNaN(nuevoPrecio) || isNaN(precioAnterior)) return;
    
    const aumentoPermitido = precioAnterior * 1.15;
    const decrementoPermitido = precioAnterior * 0.85;
    
    if (nuevoPrecio > aumentoPermitido) {
        mostrarMensajeAlertify(`¡Aumento significativo de precio!\n\nPrecio anterior: ${precioAnterior.toFixed(2)}\nNuevo precio: ${nuevoPrecio.toFixed(2)}\n\nEl aumento supera el 15% permitido.`, 'error');
    } else if (nuevoPrecio < decrementoPermitido) {
        mostrarMensajeAlertify(`¡Decremento significativo de precio!\n\nPrecio anterior: ${precioAnterior.toFixed(2)}\nNuevo precio: ${nuevoPrecio.toFixed(2)}\n\nLa reducción supera el 15% permitido.`, 'error');
    }
}

//funcion para obtener tipocambio del dia
async function obtenerCambioDelDia() {
    try {
        // Obtener la fecha actual en formato DD-MM-YYYY
        const fechaHoy = formatDateToDDMMYYYY(new Date());
        // Buscar el registro en TipoCambio que coincida con la fecha de hoy
        const registro = await db.TipoCambio.get(fechaHoy);
        // Verificar si se encontró el registro y devolver el cambio
        if (registro) {
            return registro.cambio;
        } else {
            return null; // O puedes lanzar un error o devolver un valor por defecto
        }
    } catch (error) {
        mostrarMensajeAlertify(`Error al obtener cambioCambioDelDia: ${error.message}`, 'error');
        throw error;
    }
}

//limpiar formulario
function limpiarVariedadDetalle(obj) { 
    hiddenPrecioAnterior = '';
    fechadefinidarecoleccionInput = '';
    hiddennVeces = '';

    document.getElementById('resultadovariedad').style.display = 'none';
    $('#undmedSelect').select2("val", "ca");
    if (obj ==="nuevo") {
        $('#variedadSelect').select2("val", "ca");
    }    
    $('#estadoSelect').select2("val", "ca");
    $('#cantidadInput').val("0");
    $('#precioInput').val("0");
    $('#monedaSelect').prop("disabled", false);     
    $('#monedaSelect').select2("val", "ca");
    $('#preciocalculadoInput').val("0");
    $('#nvecesInput').prop("disabled", true); 
    $('#nvecesInput').val("0");
    $('#observaciones2Input').val("");
    $("#guardarBtn").prop("disabled", false );
}

/**
 * Marca en un Select2 los establecimientos que ya tienen registros en Detalle
 * para una combinación específica de canasta y municipio.
 */
async function marcarEstablecimientosconDatos(canasta, municipio) {
    try {
        // Asegurar que los parámetros sean números enteros
        const canastaId = Number.parseInt(canasta, 10);
        const municipioId = Number.parseInt(municipio, 10);

        if (isNaN(canastaId) || isNaN(municipioId)) {
            mostrarMensajeAlertify(`Error canasta o municipio no válidos: ${canasta} - ${municipio}`, 'error');
            return;
        }

        // Consultar registros en Detalle usando el índice compuesto
        const registros = await db.Detalle
            .where('[objIdCatCanasta+objCodMuni]')
            .equals([canastaId, municipioId])
            .toArray();        

        // Si no hay registros, no hacemos nada (pero igual podríamos limpiar marcas)
        if (registros.length === 0) {
            // Opcional: desmarcar todos
            // const $select = $('#informantesSelect'); // Asumimos ID fijo o pasar como parámetro
            // if ($select.length > 0) {
            //     inicializarSelect2ConMarcacion($select, new Set());
            // }
            return;
        }

        // Extraer objIdEstablecimientoCanasta únicos
        // const establecimientosUnicos = new Set(
        //     registros.map(reg => reg.objIdEstablecimientoCanasta)
        // );

        const establecimientosUnicos = new Set(
            registros.map(reg => String(reg.objIdEstablecimientoCanasta)) // ← string
        );

        // Asegurar que el select sea un jQuery object y exista
        const $select = $('#establecimientoSelect'); // Puedes pasar como parámetro si es dinámico
        if ($select.length === 0) {
            mostrarMensajeAlertify('No se encontró el elemento #establecimientoSelect', 'error');
            return;
        }

        // Inicializar Select2 con marcas
        inicializarSelect2ConMarcacion($select, establecimientosUnicos);

    } catch (error) {
        mostrarMensajeAlertify(`Error marcarEstablecimientosconDatos ${error.message}`, 'error');
    }
}

/**
 * Inicializa un elemento Select2 y marca las opciones cuyo ID está en itemHoySet.
 * @param {jQuery} selectElement - Elemento jQuery del <select>
 * @param {Set} itemHoySet - Conjunto de IDs (objIdEstablecimientoCanasta) a marcar
 */
function inicializarSelect2ConMarcacion(selectElement, itemHoySet) {
    // Validar que sea un jQuery object
    if (!selectElement.jquery || selectElement.length === 0) {
        mostrarMensajeAlertify('inicializarSelect2ConMarcacion: elemento no válido', 'error');
        return;
    }

    // Destruir instancia previa si existe
    if (selectElement.hasClass('select2-hidden-accessible')) {
        selectElement.select2('destroy');
    }

    // Configurar Select2
    selectElement.select2({
        width: 'resolve',
        templateResult: function(option) {
            if (!option.id) {
                return option.text;
            }
            const $option = $('<span></span>').text(option.text);
            if (itemHoySet.has(option.id)) {
                $option.addClass('informante-datos-hoy');
                $option.attr('title', 'Este item tiene datos registrados hoy');
            }
            return $option;
        },
        templateSelection: function(option) {
            if (!option.id) {
                return option.text;
            }
            const $selection = $('<span></span>').text(option.text);
            if (itemHoySet.has(option.id)) {
                $selection.attr('title', 'Este item tiene datos registrados hoy');
            }
            return $selection;
        },
        escapeMarkup: function(markup) {
            return markup; // Permite clases y atributos en las opciones
        }
    });
}

/**
 * Marca en un Select2 los elementos cuyo objIdCatVariedad ya tiene registro en Detalle
 * para una combinación específica de canasta, municipio y establecimiento.
 *
 * @param {number|string} causal - objIdCatCanasta
 * @param {number|string} municipio - objCodMuni
 * @param {number|string} establecimiento - objIdEstablecimientoCanasta
 * @param {string} selectElementId - ID del <select> (ej: 'variedadSelect')
 */
async function marcarVariedadesRegistradas(causal, municipio, establecimiento, selectElementId) {
    try {
        // Convertir a números
        const objIdCatCanasta = Number.parseInt(causal, 10);
        const objCodMuni = Number.parseInt(municipio, 10);
        const objIdEstablecimientoCanasta = Number.parseInt(establecimiento, 10);

        if (isNaN(objIdCatCanasta) || isNaN(objCodMuni) || isNaN(objIdEstablecimientoCanasta)) {
            mostrarMensajeAlertify('marcarVariedadesRegistradas: Parámetros numéricos no válidos', 'warning');
            return;
        }

        // 1. Consultar Detalle usando índice compuesto
        const registros = await db.Detalle
            .where('[objIdCatCanasta+objCodMuni+objIdEstablecimientoCanasta]')
            .equals([objIdCatCanasta, objCodMuni, objIdEstablecimientoCanasta])
            .toArray();

        // 2. Extraer objIdCatVariedad únicos
        const variedadesUnicas = new Set(registros.map(r => String(r.objIdCatVariedad)));

        // 3. Verificar si hay registros
        if (variedadesUnicas.size === 0) {
            // Aún así inicializamos para limpiar marcas
            const $select = $(`#${selectElementId}`);
            if ($select.length > 0) {
                inicializarSelect2ConMarcacion($select, new Set());
            }
            return;
        }

        // 4. Obtener el elemento select y aplicar marcas
        const $select = $(`#${selectElementId}`);
        if ($select.length === 0) {
            mostrarMensajeAlertify(`No se encontró el elemento #${selectElementId}`, 'warning');
            return;
        }

        // 5. Inicializar Select2 con las variedades marcadas
        inicializarSelect2ConMarcacion($select, variedadesUnicas);

    } catch (error) {
        mostrarMensajeAlertify(`Error en marcarVariedadesRegistradas: ${error.message}`, 'error');
    }
}

function formatLocalDateTime(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // getMonth() es 0-indexado
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Muestra las variedades que están en Muestra pero no han sido registradas en Detalle
 * para una combinación específica de canasta, municipio y establecimiento.
 *
 * @param {number|string} canasta - objIdCatCanasta
 * @param {number|string} municipio - objCodMuni
 * @param {number|string} establecimiento - objIdEstablecimientoCanasta
 */
async function mostrarDiferencias(canasta, municipio, establecimiento) {
    try {
        // Convertir a números
        const objIdCatCanasta = Number.parseInt(canasta, 10);
        const objCodMuni = Number.parseInt(municipio, 10);
        const objIdEstablecimientoCanasta = Number.parseInt(establecimiento, 10);

        if (isNaN(objIdCatCanasta) || isNaN(objCodMuni) || isNaN(objIdEstablecimientoCanasta)) {
            throw new Error("Los parámetros deben ser números válidos.");
        }

        // === 1. Obtener variedades de Muestra ===
        const registrosMuestra = await db.Muestra
            .where('[objIdCatCanasta+objIdEstablecimientoCanasta]')
            .equals([objIdCatCanasta, objIdEstablecimientoCanasta])
            .toArray();

        // Crear Map: objIdCatVariedad → objeto completo de la variedad
        const muestraMap = new Map();
        for (const reg of registrosMuestra) {
            // Normalizamos el objeto para tener consistencia
            muestraMap.set(reg.objIdCatVariedad, {
                objIdCatVariedad: reg.objIdCatVariedad,
                nombreVariedad: reg.nombreVariedad || `Variedad ${reg.objIdCatVariedad}`,
            });
        }

        if (muestraMap.size === 0) {
            mostrarMensajeAlertify('No se encontraron variedades en Muestra para este establecimiento.', 'warning');
            return;
        }

        // === 2. Obtener variedades ya registradas en Detalle ===
        const registrosDetalle = await db.Detalle
            .where('[objIdCatCanasta+objCodMuni+objIdEstablecimientoCanasta]')
            .equals([objIdCatCanasta, objCodMuni, objIdEstablecimientoCanasta])
            .toArray();

        const detalleSet = new Set(registrosDetalle.map(d => d.objIdCatVariedad));

        // === 3. Encontrar faltantes: en Muestra pero no en Detalle ===
        const faltantes = [...muestraMap.keys()].filter(id => !detalleSet.has(id));

        // === 4. Preparar faltantesMap con objetos completos ===
        if (faltantes.length > 0) {
            const faltantesMap = new Map(
                faltantes.map(id => [id, muestraMap.get(id)])
            );
            mostrarListadoFaltantes(faltantes, faltantesMap);
        } else {
            mostrarMensajeAlertify('Todas las variedades ya han sido registradas.', 'success');
        }

    } catch (error) {
        mostrarMensajeAlertify(`Error al comparar resgistros: ${error.message}`, 'error');
    }
}

function mostrarListadoFaltantes(faltantes, faltantesMap) {
    let modal = document.getElementById('modalVariedadesFaltantes');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalVariedadesFaltantes';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'variedadesFaltantesLabel');
        modal.setAttribute('aria-hidden', 'true');

        modal.innerHTML = `
            <div class="modal-dialog modal-sm" role="document">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title" id="variedadesFaltantesLabel">Variedades Faltantes</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body" id="modalVariedadesBody">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const modalBody = document.getElementById('modalVariedadesBody');
    if (!modalBody) return;

    modalBody.innerHTML = '';

    if (faltantes.length === 0) {
        const alerta = document.createElement('div');
        alerta.className = 'alert alert-success';
        alerta.textContent = 'No faltan variedades por ingresar.';
        modalBody.appendChild(alerta);
    } else {
        const listGroup = document.createElement('ul');
        listGroup.className = 'list-group';

        for (const id of faltantes) {
            const data = faltantesMap.get(id);
            if (!data) continue;

            const li = document.createElement('li');
            li.className = 'list-group-item';

            // Mostrar nombre y, si hay especificación o unidad, en una línea secundaria
            li.innerHTML = `
                <div><strong>${data.nombreVariedad}</strong></div>`;
            listGroup.appendChild(li);
        }

        modalBody.appendChild(listGroup);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

/**
 * Busca un registro en el almacén Detalle por clave compuesta y llena los inputs si existe y si el estado lo permite.
 * @param {number|string} canasta
 * @param {number|string} municipio
 * @param {number|string} establecimiento
 * @param {number|string} variedad
 */
async function cargarRegistroCausal(canasta, municipio, establecimiento) {
    try {
        // === Paso 1: Validar parámetros (enteros válidos) ===
        const objIdCatCanasta = Number.parseInt(canasta, 10);
        const objCodMuni = Number.parseInt(municipio, 10);
        const objIdEstablecimientoCanasta = Number.parseInt(establecimiento, 10);

        if (
            isNaN(objIdCatCanasta) ||
            isNaN(objCodMuni) ||
            isNaN(objIdEstablecimientoCanasta) 
        ) {
            mostrarMensajeAlertify('Todos los parámetros deben ser números enteros válidos', 'error');
            return false;
        }

        // === Paso 2: Buscar en el almacén Detalle ===
        const claveCompuesta = [
            objIdCatCanasta,
            objCodMuni,
            objIdEstablecimientoCanasta
        ];

        const registro = await db.Detalle
            .where('[objIdCatCanasta+objCodMuni+objIdEstablecimientoCanasta]')
            .equals(claveCompuesta)
            .first();

        // === Paso 3: Validar si existe el registro ===
        if (!registro) {
            mostrarMensajeAlertify('No se encontró un registro con la combinación especificada', 'warning');         
            return true; // ✅ Éxito
        }

        // === Validación adicional: Estados que indican "No se realizó levantamiento" ===
        const estadosSinLevantamiento = [10, 11, 12, 50];
        if (estadosSinLevantamiento.includes(registro.ObjIdEstadoVar)) {
            $("#causalSelect").val(registro.ObjIdEstadoVar).trigger("change");
            mostrarMensajeAlertify('No se realizó levantamiento Efectivo es un Causal', 'warning');
            //limpiarFormulario(); // Opcional: asegura que no queden datos antiguos
            return false;
        }

        return true; // ✅ Éxito
    } catch (error) {
        mostrarMensajeAlertify(`Error al acceder a la base de datos: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Busca un registro en el almacén Detalle por clave compuesta y llena los inputs si existe y si el estado lo permite.
 * @param {number|string} canasta
 * @param {number|string} municipio
 * @param {number|string} establecimiento
 * @param {number|string} variedad
 */
async function cargarDetalleRegistro(canasta, municipio, establecimiento, variedad) {
    try {
        // === Paso 1: Validar parámetros (enteros válidos) ===
        const objIdCatCanasta = Number.parseInt(canasta, 10);
        const objCodMuni = Number.parseInt(municipio, 10);
        const objIdEstablecimientoCanasta = Number.parseInt(establecimiento, 10);
        const objIdCatVariedad = Number.parseInt(variedad, 10);

        if (
            isNaN(objIdCatCanasta) ||
            isNaN(objCodMuni) ||
            isNaN(objIdEstablecimientoCanasta) ||
            isNaN(objIdCatVariedad)
        ) {
            mostrarMensajeAlertify('Todos los parámetros deben ser números enteros válidos', 'warning');
            return false;
        }

        // === Paso 2: Buscar en el almacén Detalle ===
        const claveCompuesta = [
            objIdCatCanasta,
            objCodMuni,
            objIdEstablecimientoCanasta,
            objIdCatVariedad
        ];

        const registro = await db.Detalle
            .where('[objIdCatCanasta+objCodMuni+objIdEstablecimientoCanasta+objIdCatVariedad]')
            .equals(claveCompuesta)
            .first();

        // === Paso 3: Validar si existe el registro ===
        if (!registro) {
            //limpiarFormulario();
            mostrarMensajeAlertify('No se encontró registro con la combinación especificada', 'warning')
            if (hiddennVeces == 3) {
                mostrarMensajeAlertify('Tiene 3 meses que no se recolecta datos.', 'error');
            }    
            return false;
        }

        // === Paso 4: Asignar valores a los inputs del formulario ===
        $("#estadoSelect").val(registro.ObjIdEstadoVar).trigger("change");
        $("#undmedSelect").val(registro.ObjIdUnidRecolectada).trigger("change");
        $("#cantidadInput").val(registro.Cantidad);
        $("#precioInput").val(registro.PrecioRealRecolectado);
        $("#monedaSelect").val(registro.ObjIdTipoMoneda).trigger("change");
        $("#preciocalculadoInput").val(registro.PrecioCalculado);
        $("#observaciones2Input").val(registro.Observacion || '');

        // ✅ Éxito
        return true;
    } catch (error) {
        mostrarMensajeAlertify(`Error al acceder a la base de datos: ${error.message}`, 'error');
        return false;
    }
}

//Prepara los archivos a enviar al servidor, los sirve al api y luego los marca como enviados
async function enviarDatos() {
    const spinner = document.getElementById('spinner');
    try {
         // Mostrar el spinner
        spinner.style.display = 'block';

        const response = await jsonSeriesPrecios();
        const registrosNoEnviados = response.detalle; // Extraemos los registros no enviados
        if (registrosNoEnviados.length === 0) {
            mostrarMensajeAlertify('No hay registros pendientes por enviar', 'success');
            return;
        }

        const jsonData = JSON.stringify(response); // Convertir a JSON
        //console.error(jsonData)

        const messageDiv = document.getElementById('message');
        messageDiv.classList.add('d-none'); // Ocultar mensaje anterior https://appcepov.inide.gob.ni https://localhost:7062

         const responsess = await fetch('https://appcepov.inide.gob.ni/endpoint/cipp/bulksupin', {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json',
               },
               mode: 'cors',
               body: jsonData,
           });
           
           if (!responsess.ok) {
                mostrarMensajeAlertify(`Error al enviar los datos: ${error.message}`, 'error');   
               throw new Error(`Error: ${responsess.statusText}`);
           }
           const serverResponse = await responsess.json();
           try {
            await marcarComoEnviados(registrosNoEnviados);
            mostrarMensaje(`Datos enviados y actualizados localmente. Respuesta del servidor: ${JSON.stringify(serverResponse)}`, "success");
           } catch (error) { 
            mostrarMensaje(`Datos enviados, pero no se pudo actualizar el estado local: ${error.message}`, "error");
           }
    } catch (error) {
         mostrarMensaje(`Error al enviar los datos: ${error.message}`, "error");  
    } finally {
        // Ocultar el spinner
        spinner.style.display = 'none';
    }
}

/**
 * Obtiene los registros no enviados del almacén Detalle y los estructura
 * para enviar al servidor.
 * 
 * @returns {Promise<{ Detalle: Array, CatEstablecimiento: Array }>}
 */
async function jsonSeriesPrecios() {
    try {
        // 1. Obtener registros no enviados desde Detalle
        const registrosNoEnviados = await db.Detalle
            .where('Enviado').equals(0)
            .toArray();

        // const todos = await db.Detalle.toArray(); const registrosNoEnviados = todos.filter(item => item.Enviado === false);

        if (registrosNoEnviados.length === 0) {
            return {
                Detalle: [],
                CatEstablecimiento: []
            };
        }

        // 2. Mapear registros a formato del API
        const detalle = registrosNoEnviados.map(item => ({
            ObjIdCatCanasta: item.objIdCatCanasta,
            ObjCodMuni: item.objCodMuni,
            ObjIdEstablecimientoCanasta: item.objIdEstablecimientoCanasta,
            ObjIdCatVariedad: item.objIdCatVariedad,
            FechaDefinidaRecoleccion: item.fechaDefinidaRecoleccion,
            muestraid: item.muestraid,
            PrecioCalculado: item.PrecioCalculado,
            PrecioRealRecolectado: item.PrecioRealRecolectado,
            Cantidad: item.Cantidad,
            FechaRecoleccion: item.FechaRecoleccion, // ✅ Corregido: no existe FechaDeRecoleccion
            TasaCambio: item.TasaCambio,
            ObjIdTipoMoneda: item.ObjIdTipoMoneda,
            ObjIdEstadoVar: item.ObjIdEstadoVar,
            ObjIdUnidRecolectada: item.ObjIdUnidRecolectada,
            FechaImputado: null,
            Observacion: item.Observacion,
            UsuarioCreacion: item.UsuarioCreacion
        }));

        // 3. Crear CatEstablecimiento sin duplicados
        const establecimientosMap = new Map();

        registrosNoEnviados.forEach(item => {
            const id = item.objIdEstablecimientoCanasta; // Clave única del establecimiento

            if (!establecimientosMap.has(id)) {
                establecimientosMap.set(id, {
                    IdCatEstablecimiento: id,
                    ObjCodMuni: item.objCodMuni,
                    Razon_soc: null,
                    Nombre: null,
                    Encargado: item.Encargado || null,
                    Cargo: item.Cargo || null,
                    Telefono: item.Telefono || null,
                    Direccion: item.Direccion || null,
                    DiaHabil: null,
                    CoordenadaX: item.CoordenadaX || null,
                    CoordenadaY: item.CoordenadaY || null,
                    Activo: true,
                    establecimientosCanasta: null
                });
            }
        });

        const catEstablecimiento = Array.from(establecimientosMap.values());

        // 4. Retornar estructura esperada
        return {
            detalle,
            catEstablecimiento
        };

    } catch (error) {
        throw new Error(`No se pudieron recuperar los registros pendientes: ${error.message}`);
    }
}

/**
 * Marca una lista de registros como enviados en el almacén Detalle.
 * Utiliza Dexie.js para garantizar consistencia y manejo de errores.
 * 
 * @param {Array} registros - Array de registros con las claves compuestas
 * @returns {Promise<void>}
 */
async function marcarComoEnviados(registros) {
    if (!Array.isArray(registros) || registros.length === 0) {
        mostrarMensajeAlertify('marcarComoEnviados: No se proporcionaron registos para actualizar', 'warning');
        return;
    }

    try {
        // Transacción de escritura
        await db.transaction('rw', db.Detalle, async () => {
            for (const reg of registros) {
                // ✅ Normalizar nombres de campos (de mayúsculas a minúsculas)
                const objIdEstablecimientoCanasta = reg.ObjIdEstablecimientoCanasta;
                const objIdCatVariedad = reg.ObjIdCatVariedad;

                if (objIdEstablecimientoCanasta == null || objIdCatVariedad == null) {
                    console.warn("Registro sin clave válida:", reg);
                    continue;
                }

                // ✅ Buscar usando el índice secundario
                const registrosEncontrados = await db.Detalle
                    .where('[objIdEstablecimientoCanasta+objIdCatVariedad]')
                    .equals([objIdEstablecimientoCanasta, objIdCatVariedad])
                    .toArray();

                // Puede haber múltiples coincidencias (por canasta/municipio), pero asumimos que es único
                for (const item of registrosEncontrados) {
                    // ✅ Solo si no está ya marcado como enviado
                    if (item.Enviado === 0) {
                        // ✅ Actualizar usando la clave principal
                        await db.Detalle.update(
                            [
                                item.objIdCatCanasta,
                                item.objCodMuni,
                                item.objIdEstablecimientoCanasta,
                                item.objIdCatVariedad
                            ],
                            {
                                Enviado: 1,
                                FechaEnvio: new Date().toISOString()
                            }
                        );
                    }
                }
            }
        });
    } catch (error) {
        throw new Error(`No se pudieron actualizar los registros localmente: ${error.message}`);
    }
}

//obtiene el listado de Establecimientos con variedades pendientes de enviar
async function obtenerValidaMuestra(empleado, canasta, municipio) {
    try {
        // Mostrar el spinner
        spinner.style.display = 'block';
        // Obtener datos desde la API https://appcepov.inide.gob.ni https://localhost:7062
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipp/Validamuestra/${empleado}/${canasta}/${municipio}`,  {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        const catalog = await response.json();

        if (!catalog || !Array.isArray(catalog)) {
            throw new Error('Formato de respuesta inválido');
        }

        // Mostrar modal con los resultados
        const modalBody = document.getElementById("modalFaltantesBody");
        const modalTitle = document.getElementById("modalFaltantesLabel");

        if (catalog.length === 0) {
            modalTitle.textContent = "Sin Registros Faltantes";
            modalBody.innerHTML = `
                <div class="alert alert-success text-center" role="alert">
                    ¡No hay establecimientos con variedades faltantes!
                </div>
            `;
        } else {
            modalTitle.textContent = "Establecimientos con Variedades Faltantes";

            const listGroup = document.createElement("ul");
            listGroup.className = "list-group list-group-flush";

            catalog.forEach(item => {
                const li = document.createElement("li");
                li.className = "list-group-item d-flex justify-content-between align-items-center";
                li.innerHTML = `
                    <span><strong>${item.nombreEstablecimiento} - ${item.nombreVariedad} </strong></span>
                    <button class="btn btn-sm btn-primary" onclick="irMuestra(${item.objIdCatCanasta}, '${item.objCodMuni}', '${item.objIdEstablecimientoCanasta}')">
                        Ver
                    </button>                    
                `; 
                listGroup.appendChild(li);
            });

            modalBody.innerHTML = "";
            modalBody.appendChild(listGroup);
        }

        // Mostrar el modal
        const bsModal = new bootstrap.Modal(document.getElementById("modalFaltantes"));
        bsModal.show();

        return {
            success: true,
            message: `Establecimientos con variedades faltantes: ${catalog.length}`,
            data: catalog
        };

    } catch (error) {
        const modalBody = document.getElementById("modalFaltantesBody");
        const modalTitle = document.getElementById("modalFaltantesLabel");

        modalTitle.textContent = "Error al Validar Muestras";
        modalBody.innerHTML = `
            <div class="alert alert-danger text-center" role="alert">
                Error al obtener los datos: ${error.message}
            </div>
        `;

        const bsModal = new bootstrap.Modal(document.getElementById("modalFaltantes"));
        bsModal.show();

        return {
            success: false,
            message: error.message,
            data: []
        };
    } finally {
        // Ocultar el spinner
        spinner.style.display = 'none';
    }
}

//traslada al usuario al formulario de grabación asignando canasta y municipio del establecimiento.
function irMuestra(canasta, municipio, establecimiento) {
    // Obtener instancia del modal
    const modalElement = document.getElementById('modalFaltantes');
    const bsModal = bootstrap.Modal.getInstance(modalElement);

    // Si el modal está abierto, cierra y limpia propiedades
    if (bsModal) {
        bsModal.hide(); // Cierra el modal

        // Opcional: Remover backdrop y backdrop de fondo si queda
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }

    // Navegar a la nueva vista (ajusta esto según tu estructura)
    loadView('GrabaMuestra.html', () => {
        // Asegúrate de que estos elementos existan antes de manipularlos
        const canastaSelect = document.getElementById('canastaSelect');
        const municipioSelect = document.getElementById('municipioSelect');

        if (canastaSelect && municipioSelect) {
            // Seleccionar valor en los combos
            $("#canastaSelect").val(canasta).trigger("change");
            $("#municipioSelect").val(municipio).trigger("change");
            filterAndPopulateEstablecimientos().then(resultado => {
                $("#establecimientoSelect").val(establecimiento).trigger("change");
                mostrarDiferencias(canasta, municipio, establecimiento);
            });
        } else {
             mostrarMensajeAlertify('Alguno de los selects no existe aun', 'warning');
        }
    });
}


