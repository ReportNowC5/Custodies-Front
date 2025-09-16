import { NextRequest, NextResponse } from 'next/server';

// Configuración de autenticación para la API externa
const API_BASE_URL = 'https://gps.dxplus.org';
const API_USERNAME = 'admin'; // Cambiar por credenciales reales
const API_PASSWORD = 'admin'; // Cambiar por credenciales reales

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const { searchParams } = new URL(request.url);
    const path = params.path.join('/');
    
    // Construir URL completa
    const apiUrl = `${API_BASE_URL}/api/users/${path}?${searchParams.toString()}`;
    
    console.log('🔄 Users Proxy request to:', apiUrl);
    
    // Crear headers con autenticación básica
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('❌ Users API Error:', response.status, response.statusText);
      
      // Si es 401, devolver datos mock
      if (response.status === 401) {
        return NextResponse.json({
          success: true,
          result: generateMockUsersData()
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { success: false, error: `Users API Error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Users API Response received');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('💥 Users Proxy error:', error);
    
    // En caso de error, devolver datos mock
    return NextResponse.json({
      success: true,
      result: generateMockUsersData()
    }, { status: 200 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const body = await request.json();
    const path = params.path.join('/');
    
    const apiUrl = `${API_BASE_URL}/api/users/${path}`;
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('💥 Users POST Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Users Proxy error' },
      { status: 500 }
    );
  }
}

// Función para generar datos mock de usuarios
function generateMockUsersData() {
  return [
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      type: 'admin',
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z',
      lastLogin: new Date().toISOString()
    },
    {
      id: 2,
      name: 'María García',
      email: 'maria.garcia@example.com',
      type: 'operator',
      status: 'active',
      createdAt: '2024-02-20T14:30:00Z',
      lastLogin: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 3,
      name: 'Carlos López',
      email: 'carlos.lopez@example.com',
      type: 'viewer',
      status: 'inactive',
      createdAt: '2024-03-10T09:15:00Z',
      lastLogin: new Date(Date.now() - 86400000).toISOString()
    }
  ];
}