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
    const apiUrl = `${API_BASE_URL}/api/${path}?${searchParams.toString()}`;
    
    console.log('🔄 GPS Proxy request to:', apiUrl);
    
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
      console.error('❌ GPS API Error:', response.status, response.statusText);
      
      // Si es 401, devolver datos mock
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized - using mock GPS data',
          result: generateMockGPSData(path)
        }, { status: 200 }); // Devolver 200 con datos mock
      }
      
      return NextResponse.json(
        { success: false, error: `GPS API Error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ GPS API Response received');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('💥 GPS Proxy error:', error);
    
    // En caso de error, devolver datos mock
    return NextResponse.json({
      success: false,
      error: 'GPS Connection failed - using mock data',
      result: generateMockGPSData(params.path.join('/'))
    }, { status: 200 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const body = await request.json();
    const path = params.path.join('/');
    
    const apiUrl = `${API_BASE_URL}/api/${path}`;
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
    console.error('💥 GPS POST Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'GPS Proxy error' },
      { status: 500 }
    );
  }
}

// Función para generar datos mock de GPS
function generateMockGPSData(path: string) {
  if (path.includes('recent') || path.includes('points')) {
    // Mock data para puntos GPS recientes
    return Array.from({ length: 20 }, (_, i) => ({
      id: `mock-${i}`,
      deviceId: '865468050102444',
      latitude: -12.0464 + (Math.random() - 0.5) * 0.01,
      longitude: -77.0428 + (Math.random() - 0.5) * 0.01,
      speed: Math.floor(Math.random() * 60),
      course: Math.floor(Math.random() * 360),
      timestamp: new Date(Date.now() - i * 60000).toISOString(), // Cada minuto
      receivedAt: new Date().toISOString()
    }));
  }
  
  // Mock data genérico para GPS
  return {
    success: true,
    data: [],
    message: 'Mock GPS data - API not available',
    timestamp: new Date().toISOString(),
  };
}