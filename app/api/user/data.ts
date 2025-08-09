export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  image?: string;
  role?: string;
}

export const user: User[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    password: "password123", // En producción, usa contraseñas hasheadas
    image: "/images/avatar/avatar-3.jpg",
    role: "admin"
  },
  {
    id: "2",
    name: "Test User",
    email: "test@example.com",
    password: "test123",
    image: "/images/avatar/avatar-4.jpg",
    role: "user"
  }
];