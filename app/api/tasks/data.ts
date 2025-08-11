import { faker } from "@faker-js/faker";

export const tasks = [
  {
    id: faker.string.uuid(),
    title: "Design new landing page",
    description: "Create a modern and responsive landing page for the new product launch",
    status: "todo",
    priority: "high",
    assignee: {
      id: "1",
      name: "John Doe",
      avatar: "/images/avatar/avatar-1.jpg"
    },
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    tags: ["design", "frontend", "urgent"]
  },
  {
    id: faker.string.uuid(),
    title: "Implement user authentication",
    description: "Add login and registration functionality with JWT tokens",
    status: "in-progress",
    priority: "high",
    assignee: {
      id: "2",
      name: "Jane Smith",
      avatar: "/images/avatar/avatar-2.jpg"
    },
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["backend", "security"]
  },
  {
    id: faker.string.uuid(),
    title: "Write API documentation",
    description: "Document all API endpoints with examples and response formats",
    status: "completed",
    priority: "medium",
    assignee: {
      id: "3",
      name: "Mike Johnson",
      avatar: "/images/avatar/avatar-3.jpg"
    },
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["documentation", "api"]
  },
  {
    id: faker.string.uuid(),
    title: "Setup CI/CD pipeline",
    description: "Configure automated testing and deployment pipeline",
    status: "todo",
    priority: "medium",
    assignee: {
      id: "4",
      name: "Sarah Wilson",
      avatar: "/images/avatar/avatar-4.jpg"
    },
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    tags: ["devops", "automation"]
  }
];

export const subTasks = [
  {
    id: faker.string.uuid(),
    parentTaskId: tasks[0].id,
    title: "Create wireframes",
    description: "Design wireframes for the landing page layout",
    status: "completed",
    assignee: {
      id: "1",
      name: "John Doe",
      avatar: "/images/avatar/avatar-1.jpg"
    },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: faker.string.uuid(),
    parentTaskId: tasks[0].id,
    title: "Choose color scheme",
    description: "Select appropriate colors for the brand",
    status: "in-progress",
    assignee: {
      id: "1",
      name: "John Doe",
      avatar: "/images/avatar/avatar-1.jpg"
    },
    createdAt: new Date().toISOString()
  },
  {
    id: faker.string.uuid(),
    parentTaskId: tasks[1].id,
    title: "Setup JWT middleware",
    description: "Configure JWT token validation middleware",
    status: "completed",
    assignee: {
      id: "2",
      name: "Jane Smith",
      avatar: "/images/avatar/avatar-2.jpg"
    },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export type Task = (typeof tasks)[number];
export type SubTask = (typeof subTasks)[number];