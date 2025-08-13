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
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {children}
        </div>
    );
}