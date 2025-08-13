import { redirect } from 'next/navigation';

const PageNotFound = () => {
    console.log('not-found.tsx ejecutándose'); // Debug log
    // Redirigir a la página 404 personalizada
    redirect('/es/error-page/404');
};

export default PageNotFound;
