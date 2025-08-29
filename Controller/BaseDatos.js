// Inicializar la base de datos Dexie
const db = new Dexie('IPP');

// Definir el esquema de la base de datos
db.version(1).stores({
    Users: 'UsuarioId',
	Muestra: '[objIdCatCanasta+objIdEstablecimientoCanasta+objIdCatVariedad], objIdEstablecimientoCanasta, objIdCatCanasta',
	Variedades: '[objIdCatCanasta+objIdEstablecimientoCanasta+objIdCatVariedad],[objIdCatCanasta+objIdEstablecimientoCanasta]',
    Establecimientos: '[idCatCanasta+objCodMuni+idEstablecimientoCanasta], [idCatCanasta+objCodMuni],idEstablecimientoCanasta',
	Calendario: 'fecha,[idCalendario+fecha]',
	Municipios: '[iD_Muni+objIdCatCanasta], iD_Muni, objIdCatCanasta',	
	Canasta: 'idCatCanasta',    
	Causales: 'idCatValorCatalogo',
	Estados: 'idCatValorCatalogo',
	Monedas: 'idCatValorCatalogo',
	TipoCambio: 'fecha',
	UnidadMedida: 'objIdCatVariedad, [objIdCatVariedad+objURecolId]',
	MuestraPrevia: '[objIdEstablecimientoCanasta+objIdCatVariedad]',
    Detalle: '[objIdCatCanasta+objCodMuni+objIdEstablecimientoCanasta+objIdCatVariedad], [objIdCatCanasta+objCodMuni+objIdEstablecimientoCanasta], [objIdCatCanasta+objCodMuni], [objIdEstablecimientoCanasta+objIdCatVariedad], Enviado'
});

// Función para abrir la base de datos y realizar la configuración inicial si es necesario
async function IniciarBaseDatos() {
    try {
        // Abrir la base de datos
        await db.open();
        
        // Verificar si los usuarios por defecto ya existen
        const adminUser = await db.Users.get('administrador');
        if (!adminUser) {
            await db.Users.bulkAdd([
                { UsuarioId: 'administrador', password: '9175E455384B20A983DDAB1408E35E3F3789B794' },
                { UsuarioId: 'Autoriza', password: '2FF731A2CCA6918F55903702391A2D1A1AF6CF51' }
            ]);
            
        }
        return db;
    } catch (error) {
        console.error('Error al abrir o inicializar la base de datos', error);
        throw error;
    }
}

async function validarLogin(usuarioId, password) {
    try {
        const user = await db.Users.get(usuarioId);
        if (!user) {
            return false;
        }
        const isValid = user.password === password;
        return isValid;
    } catch (error) {
        console.error('Error Validando Sesión:', error);
        return false;
    }
}

async function obtenerAlmacenarUsuarios(empleado) {
    try {
         // Mostrar el spinner https://localhost:7062 https://appcepov.inide.gob.ni
        spinner.style.display = 'block';
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipp/Connecter/${empleado}`, {
            method: 'POST',
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

        const user = await response.json();

        if (!user?.usuario) {
            throw new Error('Formato de Respuesta No Válido');
        }

        // Eliminar usuarios existentes excepto admin y Autoriza
        const existingUsers = await db.Users.toCollection().primaryKeys();
        const usersToDelete = existingUsers.filter(key => key !== 'administrador' && key !== 'Autoriza');
        if (usersToDelete.length > 0) {
            await db.Users.bulkDelete(usersToDelete);
        }

        // Almacenar nuevo usuario
        await db.Users.put({
            UsuarioId: user.usuario,
            password: user.pass
        });

        return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    } catch (error) {
        return { success: false, message: error.message };
    } finally {
        // Ocultar el spinner
        spinner.style.display = 'none';
    }
}

async function obtenerAlmacenarCatalogos(empleado) {
    try {
         // Mostrar el spinner
        spinner.style.display = 'block';
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipp/Catalogos/${empleado}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Error en la solicitud HTTP: ${response.status}`);
        }

        const catalog = await response.json();

        if (!catalog || !Array.isArray(catalog.calendarios) || !Array.isArray(catalog.muncipios) || !Array.isArray(catalog.canasta) || !Array.isArray(catalog.causales) || !Array.isArray(catalog.estados) || !Array.isArray(catalog.monedas) || !Array.isArray(catalog.tipoCambios) || !Array.isArray(catalog.unidadMedida)) {
            throw new Error('Formato de respuesta inválido');
        }

        await db.transaction('rw', db.Calendario, db.Municipios, db.Canasta, db.Causales, db.Estados, db.Monedas, db.TipoCambio, db.UnidadMedida, async () => {
            await db.Calendario.bulkPut(catalog.calendarios.map(inf => ({
                idCalendario: Number.parseInt(inf.idCalendario),
                fecha: inf.fecha,
                diaLaboral: Number.parseInt(inf.diaLaboral)
            })));

            await db.Municipios.bulkPut(catalog.muncipios.map(inf => ({
                iD_Muni: Number.parseInt(inf.iD_Muni),
                noM_MUNI: inf.noM_MUNI.trim(),
                objIdCatCanasta : Number.parseInt(inf.objIdCatCanasta)
            })));

            await db.Canasta.bulkPut(catalog.canasta.map(inf => ({
                idCatCanasta: Number.parseInt(inf.idCatCanasta),
                nombre: inf.nombre.trim()
            })));

            await db.Causales.bulkPut(catalog.causales.map(inf => ({
                idCatValorCatalogo: Number.parseInt(inf.idCatValorCatalogo),
                objIdCatCatalogo: Number.parseInt(inf.objIdCatCatalogo),
                nombre: inf.nombre.trim()
            })));

            await db.Estados.bulkPut(catalog.estados.map(inf => ({
                idCatValorCatalogo: Number.parseInt(inf.idCatValorCatalogo),
                objIdCatCatalogo: Number.parseInt(inf.objIdCatCatalogo),
                nombre: inf.nombre.trim()
            })));

            await db.Monedas.bulkPut(catalog.monedas.map(inf => ({
                idCatValorCatalogo: Number.parseInt(inf.idCatValorCatalogo),
                objIdCatCatalogo: Number.parseInt(inf.objIdCatCatalogo),
                nombre: inf.nombre.trim()
            })));

            await db.TipoCambio.bulkPut(catalog.tipoCambios.map(inf => ({
                fecha: formatDateToDDMMYYYY(inf.fecha), // Convertir la fecha
                cambio: Number.parseFloat(inf.cambio)
            })));

            await db.UnidadMedida.bulkPut(catalog.unidadMedida.map(inf => ({
                objIdCatVariedad: Number.parseInt(inf.objIdCatVariedad),
                objURecolId: Number.parseInt(inf.objURecolId),
                nombreUnidad: inf.nombreUnidad.trim()
            })));
        });

        return {
            success: true,
            message: `Datos almacenados: ${catalog.calendarios.length} calendarios , ${catalog.muncipios.length} municipios , ${catalog.canasta.length} canasta ,  ${catalog.causales.length} causales , ${catalog.estados.length} estados , ${catalog.monedas.length} monedas , ${catalog.tipoCambios.length} tipo de cambio , ${catalog.unidadMedida.length} unidad de medida`
        };

    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    } finally {
        // Ocultar el spinner
        spinner.style.display = 'none';
    }
}

async function obtenerAlmacenarMuestra(empleado) {
    try { // https://appcepov.inide.gob.ni https://localhost:7062
         // Mostrar el spinner
        spinner.style.display = 'block';
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipp/Muestra/${empleado}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Error en la solicitud HTTP: ${response.status}`);
        }

        const catalog = await response.json();

        if (!catalog || !Array.isArray(catalog.muestra) || !Array.isArray(catalog.establecimiento)) {
            throw new Error('Formato de respuesta inválido');
        }
       
        const muestras = [];
        const variedades = [];

        catalog.muestra.forEach(inf => {
            const muestra = {
                objIdCatCanasta: Number.parseInt(inf.objIdCatCanasta),
                objIdEstablecimientoCanasta: Number.parseInt(inf.objIdEstablecimientoCanasta),
                objIdCatVariedad: Number.parseInt(inf.objIdCatVariedad),                
                detalle: inf.detalle,
                nVeces: Number.parseInt(inf.nVeces),
                nombreEstablecimiento: inf.nombreEstablecimiento,
                nombreVariedad: inf.nombreVariedad.trim(),
                nombreCanasta: inf.nombreCanasta.trim()
            };
            muestras.push(muestra);

            const variedad = {
                objIdCatCanasta: inf.objIdCatCanasta,
                objIdEstablecimientoCanasta: inf.objIdEstablecimientoCanasta,
                objIdCatVariedad: inf.objIdCatVariedad,
                nombreVariedad: inf.nombreVariedad
            };
            variedades.push(variedad);
        });

        await db.transaction('rw', db.Muestra, db.Variedades , db.Establecimientos , async () => {
            await db.Muestra.bulkPut(muestras);

            await db.Variedades.bulkPut(variedades);

            await db.Establecimientos.bulkPut(catalog.establecimiento.map(inf => ({
                idCatCanasta: Number.parseInt(inf.idCatCanasta),
                objCodMuni: Number.parseInt(inf.objCodMuni),
                idEstablecimientoCanasta: Number.parseInt(inf.idEstablecimientoCanasta),
                idCatEstablecimiento: Number.parseInt(inf.idCatEstablecimiento),
                razon_soc: inf.razon_soc.trim(),
                nombreEstablecimieto: inf.nombreEstablecimiento.trim(),
                encargado: inf.encargado,
                cargo: inf.cargo,
                telefono: inf.telefono,
                direccion: inf.direccion,
                diaHabil: Number.parseInt(inf.diaHabil),
                FechaDefinidaRecoleccion: inf.fechaDefinidaRecoleccion,
            })));
        });

        return {
            success: true,
            message: `Datos almacenados: ${catalog.muestra.length} muestra  y variedades, ${catalog.establecimiento.length} establecimientos`
        };

    } catch (error) {
        return {            
            success: false,
            message: error.message
        };
    } finally {
        // Ocultar el spinner
        spinner.style.display = 'none';
    }
}

async function obtenerAlmacenarPrevio(empleado) {
    try { // https://appcepov.inide.gob.ni https://localhost:7062
        // Mostrar el spinner
        spinner.style.display = 'block';
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipp/Previo/${empleado}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Error en la solicitud HTTP: ${response.status}`);
        }

        const catalog = await response.json();

        if (!catalog || !Array.isArray(catalog)) {
            throw new Error('Formato de respuesta inválido');
        }
       
        await db.transaction('rw', db.MuestraPrevia, async () => {
            await db.MuestraPrevia.bulkPut(catalog.map(inf => ({
                objIdEstablecimientoCanasta: Number.parseInt(inf.objIdEstablecimientoCanasta),
                objIdCatVariedad: Number.parseInt(inf.objIdCatVariedad),
                fechaDefinidaRecoleccion: inf.fechaDefinidaRecoleccion,
                precioRealRecolectado: Number.parseFloat(inf.precioRealRecolectado),
                precioCalculado: Number.parseFloat(inf.precioCalculado),
                especificacion: inf.especificacion,
                nVeces: Number.parseInt(inf.nVeces),
                nombreEstado: inf.nombreEstado.trim(),               
                tasaCambio: Number.parseFloat(inf.tasaCambio),
                ObjIdUnidRecolectada : Number.parseInt(inf.objIdUnidRecolectada)
            })));
        });

        return {
            success: true,
            message: `Datos almacenados: ${catalog.length} muestra previa`
        };

    } catch (error) {
        return {            
            success: false,
            message: error.message
        };
    } finally {
        // Ocultar el spinner
        spinner.style.display = 'none';
    }
}

function formatDateToDDMMYYYY(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses son 0-indexados
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// mostrarMensaje (sin cambios)
function mostrarMensaje(mensaje, tipo = 'success') {
    const messageDiv = document.getElementById('message');

    if (!messageDiv) {
        console.warn('No se encontró el contenedor de mensajes');
        return;
    }

    messageDiv.className = 'alert alert-dismissible fade show d-none';

    if (tipo === 'success') {
        messageDiv.classList.remove('d-none', 'alert-danger','alert-warning','alert-info');
        messageDiv.classList.add('alert-success');
    } else if (tipo === 'error') {
        messageDiv.classList.remove('d-none', 'alert-success','alert-warning','alert-info');
        messageDiv.classList.add('alert-danger');
    } else if (tipo === 'warning') {
        messageDiv.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
        messageDiv.classList.add('alert-warning');
    } else if (tipo === 'info') {
        messageDiv.classList.remove('d-none', 'alert-success', 'alert-danger','alert-warning');
        messageDiv.classList.add('alert-info');
    }

    messageDiv.textContent = mensaje;

    setTimeout(() => {
        messageDiv.classList.add('d-none');
        messageDiv.textContent = '';
    }, 2000);
}

//mostrarMensajeAlertify
function mostrarMensajeAlertify(mensaje, tipo = 'success') {
    // Configuración de la posición y el tiempo de duración
    alertify.set('notifier', 'delay', 3);
    alertify.set('notifier', 'position', 'top-right');

    // Mostrar el mensaje según el tipo
    if (tipo === 'success') {
        alertify.success(mensaje);
    } else if (tipo === 'error') {
        alertify.error(`Error: ${mensaje}`);
    } else if (tipo === 'warning') {
        alertify.warning(mensaje);
    } else if (tipo === 'info') {
        alertify.message(mensaje);
    } else {
        console.warn('Tipo de mensaje no reconocido:', tipo);
    }
}


// Función para hashear una cadena usando SHA-1 (sin cambios)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function deleteStore() {
    try {
        await Dexie.delete('IPP');
        console.log("Base de datos eliminada con éxito");
        // Volver a inicializar la base de datos después de eliminarla para recrear las tablas y datos iniciales.
        await IniciarBaseDatos();
        return {
            success: true,
            message: "Base de datos eliminada y reiniciada con éxito"
        };
    } catch (error) {
        console.error("Error al eliminar la base de datos:", error);
        // Intentar reabrir la base de datos incluso si la eliminación falló (podría estar bloqueada)
        try {
            await IniciarBaseDatos();
        } catch (reopenError) {
            console.error("Error al reabrir la base de datos después del fallo de eliminación:", reopenError);
        }
        return {
            success: false,
            message: `Error al eliminar la base de datos: ${error.message}`
        };
    }
}