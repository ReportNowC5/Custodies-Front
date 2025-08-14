import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Clientes',
    description: 'Gestión de clientes',
};

export default function CustomersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            {children}
        </div>
    );
}