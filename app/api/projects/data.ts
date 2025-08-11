import { faker } from "@faker-js/faker";

// Definir el tipo Project primero
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'planning' | 'on-hold';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  team: TeamMember[];
  technologies: string[];
  priority: 'low' | 'medium' | 'high';
  client: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export const projects: Project[] = [
  {
    id: faker.string.uuid(),
    name: "E-commerce Platform",
    description: "A modern e-commerce platform with advanced features",
    status: "active",
    progress: 75,
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    budget: 50000,
    spent: 37500,
    team: [
      {
        id: "1",
        name: "John Doe",
        role: "Project Manager",
        avatar: "/images/avatar/avatar-1.jpg"
      },
      {
        id: "2",
        name: "Jane Smith",
        role: "Frontend Developer",
        avatar: "/images/avatar/avatar-2.jpg"
      },
      {
        id: "3",
        name: "Mike Johnson",
        role: "Backend Developer",
        avatar: "/images/avatar/avatar-3.jpg"
      }
    ],
    technologies: ["React", "Node.js", "MongoDB", "TypeScript"],
    priority: "high",
    client: "TechCorp Inc."
  },
  {
    id: faker.string.uuid(),
    name: "Mobile Banking App",
    description: "Secure mobile banking application with biometric authentication",
    status: "active",
    progress: 45,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    budget: 80000,
    spent: 36000,
    team: [
      {
        id: "4",
        name: "Sarah Wilson",
        role: "Mobile Developer",
        avatar: "/images/avatar/avatar-4.jpg"
      },
      {
        id: "5",
        name: "Alex Brown",
        role: "Security Specialist",
        avatar: "/images/avatar/avatar-5.jpg"
      }
    ],
    technologies: ["React Native", "Firebase", "Biometric API"],
    priority: "high",
    client: "SecureBank Ltd."
  },
  {
    id: faker.string.uuid(),
    name: "Content Management System",
    description: "Custom CMS for managing digital content and workflows",
    status: "completed",
    progress: 100,
    startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    budget: 35000,
    spent: 33000,
    team: [
      {
        id: "6",
        name: "Emma Davis",
        role: "Full Stack Developer",
        avatar: "/images/avatar/avatar-6.jpg"
      },
      {
        id: "7",
        name: "Tom Wilson",
        role: "UI/UX Designer",
        avatar: "/images/avatar/avatar-7.jpg"
      }
    ],
    technologies: ["Vue.js", "Laravel", "MySQL", "Redis"],
    priority: "medium",
    client: "MediaCorp"
  },
  {
    id: faker.string.uuid(),
    name: "AI Analytics Dashboard",
    description: "Advanced analytics dashboard with AI-powered insights",
    status: "planning",
    progress: 15,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
    budget: 120000,
    spent: 18000,
    team: [
      {
        id: "8",
        name: "David Lee",
        role: "Data Scientist",
        avatar: "/images/avatar/avatar-8.jpg"
      },
      {
        id: "9",
        name: "Lisa Chen",
        role: "ML Engineer",
        avatar: "/images/avatar/avatar-9.jpg"
      }
    ],
    technologies: ["Python", "TensorFlow", "React", "PostgreSQL"],
    priority: "high",
    client: "DataTech Solutions"
  }
];

// Exportación por defecto para compatibilidad
export default {
  projects,
};