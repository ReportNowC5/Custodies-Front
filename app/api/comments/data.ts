import { faker } from "@faker-js/faker";

export interface Author {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface Reply {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  likes: number;
}

export interface Comment {
  id: string;
  postId: string;
  author: Author;
  content: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  replies: Reply[];
}

export const comments: Comment[] = [
  {
    id: faker.string.uuid(),
    postId: "1",
    author: {
      id: "1",
      name: "John Doe",
      avatar: "/images/avatar/avatar-1.jpg",
      email: "john.doe@example.com"
    },
    content: "This is a great post! Thanks for sharing your insights.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 5,
    replies: [
      {
        id: faker.string.uuid(),
        author: {
          id: "2",
          name: "Jane Smith",
          avatar: "/images/avatar/avatar-2.jpg",
          email: "jane.smith@example.com"
        },
        content: "I completely agree with your point!",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        likes: 2
      }
    ]
  },
  {
    id: faker.string.uuid(),
    postId: "1",
    author: {
      id: "3",
      name: "Mike Johnson",
      avatar: "/images/avatar/avatar-3.jpg",
      email: "mike.johnson@example.com"
    },
    content: "Very informative article. I learned something new today.",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    likes: 3,
    replies: []
  },
  {
    id: faker.string.uuid(),
    postId: "2",
    author: {
      id: "4",
      name: "Sarah Wilson",
      avatar: "/images/avatar/avatar-4.jpg",
      email: "sarah.wilson@example.com"
    },
    content: "Could you provide more details about the implementation?",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    likes: 1,
    replies: [
      {
        id: faker.string.uuid(),
        author: {
          id: "1",
          name: "John Doe",
          avatar: "/images/avatar/avatar-1.jpg",
          email: "john.doe@example.com"
        },
        content: "Sure! I'll write a follow-up post with more technical details.",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likes: 4
      }
    ]
  },
  {
    id: faker.string.uuid(),
    postId: "3",
    author: {
      id: "5",
      name: "Alex Brown",
      avatar: "/images/avatar/avatar-5.jpg",
      email: "alex.brown@example.com"
    },
    content: "This approach saved me hours of work. Thank you!",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    likes: 7,
    replies: []
  }
];