<div align="center">

# <img src="https://raw.githubusercontent.com/vrcx-team/VRCX/master/images/VRCX.ico" width="64" height="64"> </img> VRCXM

**Un fork de [VRCX](https://github.com/vrcx-team/VRCX) con un tema oscuro moderno y funciones mejoradas.**

[![GitHub release](https://img.shields.io/github/release/vrcx-team/VRCX.svg)](https://github.com/vrcx-team/VRCX/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/vrcx-team/VRCX/total?color=6451f1)](https://github.com/vrcx-team/VRCX/releases/latest)
[![GitHub Workflow Status](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml/badge.svg)](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml)
[![VRCX Discord Invite](https://img.shields.io/discord/854071236363550763?color=%237289DA&logo=discord&logoColor=white&label=discord)](https://vrcx.app/discord)

| [English](/README.md) |

**Nota:** Esta traducción puede no estar actualizada. Consulta la [versión en inglés](/README.md) para obtener la información más reciente, especialmente sobre la migración desde VRCX.

VRCXM es un fork de VRCX, una aplicación asistente/compañera para VRChat que proporciona información y te ayuda a realizar varias tareas relacionadas con VRChat de una manera más conveniente que depender únicamente del cliente de VRChat (escritorio o VR) o del sitio web. Este fork presenta un rediseño completo con un tema oscuro moderno y funciones adicionales mientras mantiene una funcionalidad 1:1 con el VRCX original.

# Empezando

<div align="center">

**Nota:** VRCXM es un fork y debe compilarse desde el código fuente. Consulta [Compilación desde el código fuente](#compilación-desde-el-código-fuente) a continuación.

El instalador VRCX original (`VRCX_Setup.exe`) está disponible [aquí](https://github.com/vrcx-team/VRCX/releases/latest).

# Características

<div align="left">

- :family: Gestión de listas de amigos, mundos y avatares
    - Administra tu lista de amigos, listas de mundos/grupos/avatares fuera de VRChat.
    - Monitorea la actividad de mundos/avatares de tus amigos y verifica su estado en línea.
    - Lleva un registro de cuándo los agregaste por primera vez y cuándo los viste por última vez.
    - Ve cuánto tiempo han pasado juntos en mundos y cuántas veces.
    - Lleva un registro de los cambios de nombre de amigos.
    - Guarda notas para recordar cómo los conociste.
- :electric_plug: Inicia automáticamente aplicaciones cuando inicias VRChat
    - Puedes configurar VRCX para iniciar otras aplicaciones cuando inicias VRChat.
    - Por ejemplo, podrías hacer que VRCX inicie una aplicación OSC o una aplicación de cambio de voz cuando se abra VRChat.
- :mag: Busca avatares, usuarios, mundos y grupos
- :earth_americas: Crea una lista de favoritos de mundos local y sin restricciones
- :camera: Almacena datos de mundos en las fotos que tomas en el juego, para que puedas recordar ese mundo donde tomaste esas fotos geniales hace como... 6 meses.
- :bell: Monitorea/responde a notificaciones
    - Puedes enviar/recibir invitaciones y solicitudes de amistad desde VRCX, así como ver la información de la instancia de las invitaciones que recibes.
- :scroll: Ve estadísticas/jugadores de tu instancia actual
- :tv: Ve los enlaces a videos que se están reproduciendo en el mundo en el que estás, así como varios otros datos registrados.
- :bar_chart: Presencia mejorada en Discord
    - Opcionalmente, puedes mostrar más información sobre tu instancia actual en Discord.
    - Integración de mundos para mundos populares como PyPyDance, LSMedia, Movies&Chill y VRDancing.
    - Esto incluye la miniatura del mundo, nombre, ID de instancia y cantidad de jugadores, dependiendo de tu configuración y si el lobby es privado. ¡También puedes agregar un botón de unirse para lobbies públicos!
- :crystal_ball: Superposición de VR con feed en vivo configurable de todos los eventos/notificaciones soportados
- :outbox_tray: Sube imágenes de avatares/mundos sin Unity
- :page_facing_up: Administra y edita detalles de avatares/mundos subidos sin Unity
- :skull: Reinicia automáticamente y únete a la última instancia cuando VRChat se crashea
- :left_right_arrow: Exporta/importa grupos de favoritos

## Compilación desde el código fuente

VRCXM debe compilarse desde el código fuente. Consulta la guía original de VRCX [Compilación desde el código fuente](https://github.com/vrcx-team/VRCX/wiki/Building-from-source) para obtener instrucciones. El proceso de compilación es idéntico a VRCX.

## Migración desde VRCX

VRCXM utiliza una carpeta de datos separada (`VRCXM`) para evitar conflictos con el VRCX original. Si deseas migrar tus datos VRCX existentes (amigos, historial de feed, favoritos, etc.) a VRCXM, consulta la [versión en inglés del README](/README.md#migrating-from-vrcx) para obtener instrucciones detalladas.

## Diferencias con VRCX

- **Tema Oscuro Moderno**: Rediseño visual completo con una estética oscura moderna
- **Filtros de Feed Avanzados**: Filtrado por rango de fechas y filtros de etiquetas/tipos mejorados para el feed de actividad
- **Ocultar Amigos del Feed**: Opción para ocultar amigos específicos del feed de actividad mientras se continúa rastreando sus datos
- **Panel de Análisis**: Página de análisis completa con:
  - Análisis de Actividad: Desglose de tiempo por mundo/avatar
  - Estadísticas Sociales: Clasificación de amigos más activos
  - Análisis de Mundo y Avatar: Mundos más visitados y estadísticas de uso de avatares
- **Configuración de Rendimiento**: Tamaño máximo de tabla configurable para consultas de feed y registro de juego
- **Datos de Aplicación Separados**: Utiliza la carpeta `VRCXM` en lugar de `VRCX`
- **Todas las funciones originales de VRCX preservadas**: Paridad funcional 1:1 con el original

## Mantenedor

VRCXM es mantenido por [naiolune](https://github.com/naiolune).

El VRCX original es desarrollado por [pypy](https://github.com/pypy-vrc) y [Natsumi](https://github.com/Natsumi-sama).

## Recursos de VRCX Original

- ¿Quieres un nuevo aspecto para VRCX? Revisa [Temas](https://github.com/vrcx-team/VRCX/wiki/Themes)
- Consulta [Construir desde el código fuente](https://github.com/vrcx-team/VRCX/wiki/Building-from-source) para instrucciones sobre cómo construir VRCX desde el código fuente.
- Para una guía sobre cómo ejecutar VRCX en Linux, consulta [aquí](https://github.com/vrcx-team/VRCX/wiki/Running-VRCX-on-Linux)

# Capturas de pantalla

<div align="center">

<h3>Iniciar sesión</h3>

<table>
  <tr>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251994190-5e6a961e-b2fe-4d3b-bf66-455d8626b8bf.png" alt="iniciar sesión"></td>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251994414-a21faf59-6199-45de-94e7-a093a6b8c0ac.png" alt="2fa"></td>
  </tr>
</table>

<h3>Feed</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251987020-9839a2c9-47db-4271-b1bf-8e07669a7056.png" alt="feed">

<h3>Registro de juego</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251987498-b82266ed-131d-42ad-be2f-b167f24acf9f.png" alt="registro de juego">

<h3>Información del usuario</h3>

<h4>Yo</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251990237-0c863d27-141c-4447-82de-4279ab8973ea.png" alt="yo">

<h4>Amigo</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251989666-8f918786-e632-451d-be29-f92d2c681b80.png" alt="amigo">

<h3>Mundo</h3>

<table>
  <tr>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251991003-37a986bb-470c-442b-8ada-31918f7b2017.png" alt="instancia"></td>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251991217-0d40846f-ac08-48c0-8e4d-18c35fe0999b.png" alt="información"></td>
  </tr>
</table>

<h3>Favorito</h3>

<h4>Amigo</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251992424-ba406d0f-787e-4e2d-89bd-4caa0a05d31f.png" alt="amigo">

<h4>Mundo</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251992950-8f2c6cdc-dc9a-4a60-b59f-9fa80d071359.png" alt="mundo">

<h4>Avatar</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251993408-66d11100-15a8-484f-b9fd-82be1516c9be.png" alt="avatar">

<h3>Registro de amigos</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251993741-e2033095-4ceb-4552-8b79-9285325c1e49.png" alt="registro de amigos">

<h3>Presencia en Discord</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251997318-5a71249c-59fc-4ad6-9194-d6b1d4165600.png" alt="discord">

<!-- Las otras imágenes serán similares a esta -->
</div>

## ¿VRCXM está en contra de los TOS de VRChat?

**No.**

VRCXM (como VRCX) es una herramienta externa que utiliza la API de VRChat para proporcionar las características que ofrece.

No modifica el juego de ninguna manera, solo utiliza la API de manera responsable para proporcionar las características que ofrece. No es un mod, ni un truco, ni ninguna otra forma de modificación del juego.

Para ver la postura de VRChat sobre el uso de la API, consulta el canal #faq en el Discord de VRChat.

---

VRCXM no está respaldado por VRChat y no refleja las opiniones o puntos de vista de VRChat ni de nadie oficialmente involucrado en la producción o gestión de las propiedades de VRChat. VRChat y todas las propiedades asociadas son marcas comerciales o marcas registradas de VRChat Inc. VRChat © VRChat Inc.

VRCXM es un fork de [VRCX](https://github.com/vrcx-team/VRCX) y no está afiliado al equipo de VRCX.
