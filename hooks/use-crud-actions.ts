"use client";
import { useState } from 'react';
import { toast } from 'sonner';

// En la interfaz CrudService, cambiar:
interface CrudService<T, CreateType = Omit<T, 'id'>, UpdateType = Partial<Omit<T, 'id'>>> {
  getAll: () => Promise<T[]>;
  create: (data: CreateType) => Promise<T>;
  update: (id: string | number, data: UpdateType) => Promise<T>;
  delete: (id: string | number) => Promise<void>;
}

export function useCrudActions<T extends { id: string | number }, CreateType = Omit<T, 'id'>, UpdateType = Partial<Omit<T, 'id'>>>(service: CrudService<T, CreateType, UpdateType>) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T[]>([]);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const result = await service.getAll();
        // Asegurar que result sea un array válido
        setData(Array.isArray(result) ? result : []);
    } catch (error) {
        // En lugar de mostrar toast de error, simplemente establecer array vacío
        console.error('Error loading data:', error);
        setData([]);
    } finally {
        setIsLoading(false);
    }
};

  const handleCreate = async (formData: CreateType) => {
    setIsLoading(true);
    try {
      const newItem = await service.create(formData);
      await loadData();
      toast.success('Elemento creado exitosamente');
    } catch (error) {
      toast.error('Error al crear el elemento');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (formData: UpdateType) => {
    if (!selectedItem) return;
    
    setIsLoading(true);
    try {
      const updatedItem = await service.update(selectedItem.id, formData);
      setData(prev => prev.map(item => 
        item.id === selectedItem.id ? updatedItem : item
      ));
      toast.success('Elemento actualizado exitosamente');
    } catch (error) {
      toast.error('Error al actualizar el elemento');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    setIsLoading(true);
    try {
      await service.delete(selectedItem.id);
      setData(prev => prev.filter(item => item.id !== selectedItem.id));
      toast.success('Elemento eliminado exitosamente');
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error('Error al eliminar el elemento');
      console.error('Error deleting item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateForm = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: T) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (item: T) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedItem(null);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  return {
    // Estado
    data,
    isLoading,
    selectedItem,
    isFormOpen,
    isDeleteDialogOpen,
    
    // Acciones
    loadData,
    handleCreate,
    handleUpdate,
    handleDelete,
    
    // Controles de UI
    openCreateForm,
    openEditForm,
    openDeleteDialog,
    closeForm,
    closeDeleteDialog,
  };
}