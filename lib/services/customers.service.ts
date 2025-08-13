import { Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomersResponse, ApiCustomersResponse, ApiCustomer } from '@/lib/types/customer';
import apiClient from '@/lib/api-client';

class CustomersService {
    private readonly BASE_URL = '/api/admin/clients';

    // Función para transformar ApiCustomer a Customer
    private transformApiCustomer(apiCustomer: ApiCustomer): Customer {
        return {
            id: apiCustomer.id.toString(),
            name: apiCustomer.user.name,
            email: apiCustomer.user.email,
            phone: apiCustomer.user.phone,
            rfc: apiCustomer.rfc,
            address: apiCustomer.address,
            postalCode: apiCustomer.postalCode,
            state: apiCustomer.state,
            city: apiCustomer.city,
            colony: apiCustomer.colony,
            interiorNumber: apiCustomer.interiorNumber,
            status: apiCustomer.user.status === 'ACTIVE' ? 'active' : 'inactive',
            createdAt: apiCustomer.createdAt,
            updatedAt: apiCustomer.createdAt,
        };
    }

    async getCustomers(page: number = 1, limit: number = 10, search?: string): Promise<CustomersResponse> {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search })
            });

            const response = await apiClient.get<ApiCustomersResponse>(`${this.BASE_URL}?${params}`);
            
            // Transformar la respuesta del API al formato esperado
            const transformedCustomers = response.result?.map((apiCustomer: ApiCustomer) =>
                this.transformApiCustomer(apiCustomer)
            ) || [];

            return {
                customers: transformedCustomers as Customer[],
                total: transformedCustomers.length,
                page: page,
                limit: limit
            };
        } catch (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }
    }

    async getCustomer(id: string): Promise<Customer> {
        try {
            const response = await apiClient.get<Customer>(`${this.BASE_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching customer:', error);
            throw error;
        }
    }

    async createCustomer(customer: CreateCustomerRequest): Promise<Customer> {
        try {
            const response = await apiClient.post<Customer>(this.BASE_URL, customer);
            return response.data;
        } catch (error) {
            console.error('Error creating customer:', error);
            throw error;
        }
    }

    async updateCustomer(customer: UpdateCustomerRequest): Promise<Customer> {
        try {
            const response = await apiClient.put<Customer>(`${this.BASE_URL}/${customer.id}`, customer);
            return response.data;
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    }

    async deleteCustomer(id: string): Promise<void> {
        try {
            await apiClient.delete(`${this.BASE_URL}/${id}`);
        } catch (error) {
            console.error('Error deleting customer:', error);
            throw error;
        }
    }
}

export const customersService = new CustomersService();
export default customersService;