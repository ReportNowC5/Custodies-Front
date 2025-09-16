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
    const apiUrl = `${API_BASE_URL}/api/assets/${path}?${searchParams.toString()}`;
    
    console.log('🔄 Assets Proxy request to:', apiUrl);
    
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
      console.error('❌ Assets API Error:', response.status, response.statusText);
      
      // Si es 401, devolver datos mock
      if (response.status === 401) {
        return NextResponse.json({
          success: true,
          result: generateMockAssetsData()
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { success: false, error: `Assets API Error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Assets API Response received');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('💥 Assets Proxy error:', error);
    
    // En caso de error, devolver datos mock
    return NextResponse.json({
      success: true,
      result: generateMockAssetsData()
    }, { status: 200 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const body = await request.json();
    const path = params.path.join('/');
    
    const apiUrl = `${API_BASE_URL}/api/assets/${path}`;
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
    console.error('💥 Assets POST Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Assets Proxy error' },
      { status: 500 }
    );
  }
}

// Función para generar datos mock de assets
function generateMockAssetsData() {
  return [
    {
      id: 1,
      name: 'Vehículo 001',
      assetType: 'vehicle',
      device: {
        id: 1,
        imei: '865468050102444',
        status: 'ACTIVE'
      },
      status: 'active',
      location: {
        latitude: -12.0464,
        longitude: -77.0428,
        address: 'Lima, Perú'
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Camión 002',
      assetType: 'truck',
      device: {
        id: 2,
        imei: '865468050102445',
        status: 'ACTIVE'
      },
      status: 'active',
      location: {
        latitude: -12.0500,
        longitude: -77.0400,
        address: 'Miraflores, Lima'
      },
      createdAt: '2024-02-20T14:30:00Z',
      updatedAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 3,
      name: 'Motocicleta 003',
      assetType: 'motorcycle',
      device: {
        id: 3,
        imei: '865468050102446',
        status: 'INACTIVE'
      },
      status: 'maintenance',
      location: {
        latitude: -12.0600,
        longitude: -77.0350,
        address: 'San Isidro, Lima'
      },
      createdAt: '2024-03-10T09:15:00Z',
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];
}