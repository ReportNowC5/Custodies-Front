"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RouteGuard, SupervisorOnly } from "@/components/auth/route-guard";
import { Loading, TableLoading, useLoading } from "@/components/ui/loading";
import { usersService, User, UsersFilters } from "@/lib/services/users.service";
import { handleError } from "@/lib/services/error-handler.service";

interface UsersPageProps {
  params: {
    lang: string;
  };
}

const UsersPageContent = ({ params }: UsersPageProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const { isLoading, withLoading } = useLoading(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<UsersFilters>({
    search: "",
    role: "",
    status: "",
    page: 1,
    limit: 10,
    sortBy: "name",
    sortOrder: "asc",
  });

  const fetchUsers = async () => {
    try {
      await withLoading(async () => {
        const response = await usersService.getUsers(filters);
        setUsers(response.users);
        setTotalUsers(response.total);
        setCurrentPage(response.page);
        setTotalPages(response.totalPages);
      });
    } catch (error) {
      handleError(error, 'loading users');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleRoleFilter = (value: string) => {
    setFilters(prev => ({ ...prev, role: value === "all" ? "" : value, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setFilters(prev => ({ ...prev, status: value === "all" ? "" : value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await withLoading(async () => {
        await usersService.toggleUserStatus(userId);
        toast.success("Estado del usuario actualizado");
        fetchUsers();
      });
    } catch (error) {
      handleError(error, 'toggling user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      try {
        await withLoading(async () => {
          await usersService.deleteUser(userId);
          toast.success("Usuario eliminado exitosamente");
          fetchUsers();
        });
      } catch (error) {
        handleError(error, 'deleting user');
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "administrator":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "supervisor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "operator":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600 mt-1">Gestiona los usuarios del sistema GPS</p>
        </div>
        <SupervisorOnly>
          <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white">
            <Icon icon="heroicons:plus" className="mr-2 h-4 w-4" />
            Agregar Usuario
          </Button>
        </SupervisorOnly>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:users" className="text-purple-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === "active").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:check-circle" className="text-green-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.role === "administrator").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:shield-check" className="text-purple-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Operadores</p>
                <p className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === "operator").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:cog-6-tooth" className="text-blue-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                Buscar usuarios
              </Label>
              <div className="relative mt-1">
                <Icon 
                  icon="heroicons:magnifying-glass" 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
                <Input
                  id="search"
                  placeholder="Buscar por nombre o email..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label className="text-sm font-medium text-gray-700">Rol</Label>
              <Select value={filters.role || "all"} onValueChange={handleRoleFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="administrator">Administrador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label className="text-sm font-medium text-gray-700">Estado</Label>
              <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-900">Nombre</TableHead>
                  <TableHead className="font-semibold text-gray-900">Teléfono</TableHead>
                  <TableHead className="font-semibold text-gray-900">Correo Electrónico</TableHead>
                  <TableHead className="font-semibold text-gray-900">Rol</TableHead>
                  <TableHead className="font-semibold text-gray-900">Estado</TableHead>
                  <TableHead className="font-semibold text-gray-900">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <TableLoading rows={5} columns={6} />
                    </TableCell>
                  </TableRow>
                ) : isLoading && users.length > 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loading text="Actualizando usuarios..." />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Icon icon="heroicons:users" className="h-12 w-12 text-gray-400" />
                        <span className="text-gray-600">No se encontraron usuarios</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">ID: {user.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {user.phone || "No especificado"}
                      </TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={cn("border", getRoleBadgeColor(user.role))}>
                          {usersService.getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border", getStatusBadgeColor(user.status))}>
                          {usersService.getStatusDisplayName(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Icon icon="heroicons:ellipsis-vertical" className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Icon icon="heroicons:eye" className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Icon icon="heroicons:pencil" className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                              <Icon 
                                icon={user.status === "active" ? "heroicons:pause" : "heroicons:play"} 
                                className="mr-2 h-4 w-4" 
                              />
                              {user.status === "active" ? "Desactivar" : "Activar"}
                            </DropdownMenuItem>
                            <SupervisorOnly>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Icon icon="heroicons:trash" className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </SupervisorOnly>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {(currentPage - 1) * (filters.limit || 10) + 1} a{" "}
            {Math.min(currentPage * (filters.limit || 10), totalUsers)} de {totalUsers} usuarios
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Icon icon="heroicons:chevron-left" className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={currentPage === page ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <Icon icon="heroicons:chevron-right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersPage = ({ params }: UsersPageProps) => {
  return (
    <RouteGuard requiredRole={['administrator', 'supervisor']}>
      <UsersPageContent params={params} />
    </RouteGuard>
  );
};

export default UsersPage;