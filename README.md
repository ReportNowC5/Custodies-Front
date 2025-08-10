# 🏢 Custodias ReportNow

> Sistema de gestión y reportes para custodias desarrollado con Next.js 14 y tecnologías modernas.

## 📋 Descripción

Custodias ReportNow es una aplicación web moderna para la gestión integral de custodias, que incluye funcionalidades de dashboard, autenticación, gestión de tareas, calendarios y reportes. Construida con Next.js 14, TypeScript y Tailwind CSS.

## ✨ Características Principales

- 🔐 **Autenticación completa** con NextAuth.js
- 🌐 **Internacionalización** (Español/Inglés)
- 📊 **Dashboard interactivo** con gráficos y métricas
- 📅 **Sistema de calendarios** integrado
- 📋 **Gestión de tareas** con drag & drop
- 🗂️ **Gestión de archivos** y documentos
- 🎨 **Interfaz moderna** con componentes reutilizables
- 📱 **Diseño responsivo** para todos los dispositivos
- 🌙 **Modo oscuro/claro** configurable
- 🔍 **Sistema de búsqueda** avanzado

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 14** - Framework de React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework de CSS
- **Radix UI** - Componentes accesibles
- **Framer Motion** - Animaciones
- **Lucide React** - Iconografía

### Backend & Datos
- **Next.js API Routes** - API endpoints
- **NextAuth.js** - Autenticación
- **Axios** - Cliente HTTP
- **Zod** - Validación de esquemas
- **Zustand** - Gestión de estado

### Herramientas de Desarrollo
- **ESLint** - Linting
- **Sass** - Preprocesador CSS
- **React Hook Form** - Gestión de formularios
- **React Query** - Gestión de datos del servidor

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ 
- npm, yarn o pnpm

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/ReportNowC5/Custodies-Front.git
   cd Custodies-Front
   ```
2. **Instalar dependencias**
   ```bash
   npm install
   # o
   yarn install
   # o
   pnpm install
   ```
3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   Y edita el archivo `.env.local` con tus credenciales.

📁 Estructura del Proyecto

Custodias_ReportNow/
├── app/                    # App Router de Next.js 14
│   ├── [lang]/            # Rutas internacionalizadas
│   ├── api/               # API Routes
│   ├── assets/            # Recursos estáticos
│   └── dictionaries/      # Archivos de traducción
├── components/            # Componentes reutilizables
│   ├── auth/             # Componentes de autenticación
│   ├── ui/               # Componentes de UI base
│   └── partials/         # Componentes de layout
├── config/               # Configuraciones
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y servicios
├── provider/             # Context providers
├── public/               # Archivos públicos
│   ├── images/           # Imágenes
│   └── fonts/            # Fuentes personalizadas
└── store/                # Gestión de estado global

## 🎨 Personalización
### Temas y Colores
El proyecto utiliza un sistema de temas configurable en config/site.ts :
- Modo claro/oscuro
- Paleta de colores personalizada
- Tipografía personalizada

### Configuración de Fuentes
Se utilizan fuentes personalizadas Satoshi. Asegúrate de tener los archivos de fuente en public/fonts/ y actualizar tailwind.config.ts con la ruta correcta.

## 🌐 Internacionalización
El proyecto soporta múltiples idiomas:

- Español ( es ) - Idioma por defecto
- Inglés ( en )
Los archivos de traducción están en app/dictionaries/ .
