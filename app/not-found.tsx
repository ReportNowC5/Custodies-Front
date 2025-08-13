import { redirect } from 'next/navigation';

const GlobalNotFound = () => {
    // Redirigir directamente a la página 404 personalizada
    redirect('/es/error-page/404');
};

export default GlobalNotFound;