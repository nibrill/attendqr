# Changelog

Todos los cambios relevantes de AttendQR. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [1.2.0] - 2026-11-16

### Added
- Pruebas end-to-end con Playwright (creación de clase, registro de asistencia sin duplicados y código inválido), ejecutadas en el CI.

### Changed
- Rediseño visual: paleta de una sola tinta, tipografía Inter empaquetada y login en dos columnas.

### Fixed
- Tras un intento fallido, el registro manual o por imagen se ignoraba durante 2,5 s: la pausa ahora aplica solo a la cámara.

## [1.1.0] - 2026-11-16

### Added
- QR rotativo: el código cambia cada 20 segundos y solo se acepta el vigente o el anterior.
- PWA instalable con service worker y manifiesto.

## [1.0.0] - 2026-11-16

### Added
- Roles de docente y estudiante, con registro, inicio de sesión y recuperación de contraseña.
- Clases con ventana de registro, escaneo por cámara, imagen o código pegado, lista de asistentes y exportación a CSV.
- Modo demo local y backend opcional con Firebase Auth y Firestore, con reglas de seguridad.
- Demo en GitHub Pages, CI y plantilla de repositorio.
