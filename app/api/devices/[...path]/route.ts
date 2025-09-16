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
    const apiUrl = `${API_BASE_URL}/api/devices/${path}?${searchParams.toString()}`;
    
    console.log('🔄 Proxy request to:', apiUrl);
    
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
      console.error('❌ API Error:', response.status, response.statusText);
      
      // Si es 401, devolver datos mock
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized - using mock data',
          result: generateMockData(path)
        }, { status: 200 }); // Devolver 200 con datos mock
      }
      
      return NextResponse.json(
        { success: false, error: `API Error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ API Response received');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('💥 Proxy error:', error);
    
    // En caso de error, devolver datos mock
    return NextResponse.json({
      success: false,
      error: 'Connection failed - using mock data',
      result: generateMockData(params.path.join('/'))
    }, { status: 200 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const body = await request.json();
    const path = params.path.join('/');
    
    const apiUrl = `${API_BASE_URL}/api/devices/${path}`;
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
    console.error('💥 POST Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Proxy error' },
      { status: 500 }
    );
  }
}

// Función para generar datos mock según el endpoint
function generateMockData(path: string) {
  if (path.includes('/history')) {
    // Mock data para historial de dispositivos
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      device_id: '865468050102444',
      lat: -12.0464 + (Math.random() - 0.5) * 0.01,
      lng: -77.0428 + (Math.random() - 0.5) * 0.01,
      speed_kmh: Math.floor(Math.random() * 60),
      ts: new Date(Date.now() - i * 300000).toISOString(), // Cada 5 minutos
    }));
  }
  
  if (path.includes('/status')) {
    // Mock data para estado del dispositivo
    return {
      deviceId: '865468050102444',
      status: 'online',
      lastSeen: new Date().toISOString(),
      battery: Math.floor(Math.random() * 100),
      signal: Math.floor(Math.random() * 5) + 1,
    };
  }
  
  // Mock data genérico
  return {
    message: 'Mock data - API not available',
    timestamp: new Date().toISOString(),
  };
}