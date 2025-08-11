import { faker } from "@faker-js/faker";

export const demoBoards = [
  {
    id: faker.string.uuid(),
    title: "Project Planning",
    description: "Planning and organizing project tasks",
    color: "primary",
    tasks: [
      {
        id: faker.string.uuid(),
        title: "Define project scope",
        status: "todo",
        priority: "high",
        assignee: "John Doe"
      },
      {
        id: faker.string.uuid(),
        title: "Create wireframes",
        status: "in-progress",
        priority: "medium",
        assignee: "Jane Smith"
      }
    ]
  },
  {
    id: faker.string.uuid(),
    title: "Development",
    description: "Development tasks and features",
    color: "success",
    tasks: [
      {
        id: faker.string.uuid(),
        title: "Setup project structure",
        status: "completed",
        priority: "high",
        assignee: "Mike Johnson"
      },
      {
        id: faker.string.uuid(),
        title: "Implement authentication",
        status: "todo",
        priority: "high",
        assignee: "Sarah Wilson"
      }
    ]
  },
  {
    id: faker.string.uuid(),
    title: "Testing",
    description: "Quality assurance and testing",
    color: "warning",
    tasks: [
      {
        id: faker.string.uuid(),
        title: "Write unit tests",
        status: "todo",
        priority: "medium",
        assignee: "Alex Brown"
      }
    ]
  }
];

export type Board = (typeof demoBoards)[number];
export type Task = Board['tasks'][number];