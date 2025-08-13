class DebugHelper {
  static logRequest(method: string, url: string, data?: any) {
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      console.group(`🚀 ${method.toUpperCase()} ${url}`);
      console.log('URL:', url);
      if (data) console.log('Data:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  static logResponse(status: number, url: string, data?: any) {
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.group(`${emoji} ${status} ${url}`);
      console.log('Status:', status);
      console.log('URL:', url);
      if (data) console.log('Response:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  static logError(error: any, context?: string) {
    console.group(`❌ Error${context ? ` in ${context}` : ''}`);
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
}

export { DebugHelper };