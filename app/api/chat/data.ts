import { faker } from "@faker-js/faker";

export const contacts = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    avatar: "/images/avatar/avatar-1.jpg",
    status: "online",
    lastSeen: new Date().toISOString()
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    avatar: "/images/avatar/avatar-2.jpg",
    status: "offline",
    lastSeen: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike.johnson@example.com",
    avatar: "/images/avatar/avatar-3.jpg",
    status: "online",
    lastSeen: new Date().toISOString()
  }
];

export const chats = [
  {
    id: 1,
    contactId: 1,
    messages: [
      {
        id: faker.string.uuid(),
        text: "Hello! How are you doing today?",
        sender: "contact",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true
      },
      {
        id: faker.string.uuid(),
        text: "I'm doing great, thanks for asking! How about you?",
        sender: "user",
        timestamp: new Date(Date.now() - 7000000).toISOString(),
        read: true
      },
      {
        id: faker.string.uuid(),
        text: "I'm good too! Are we still on for the meeting tomorrow?",
        sender: "contact",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true
      }
    ]
  },
  {
    id: 2,
    contactId: 2,
    messages: [
      {
        id: faker.string.uuid(),
        text: "Hey, can you review the project proposal?",
        sender: "contact",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: false
      }
    ]
  },
  {
    id: 3,
    contactId: 3,
    messages: [
      {
        id: faker.string.uuid(),
        text: "The new feature is ready for testing",
        sender: "contact",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        read: true
      },
      {
        id: faker.string.uuid(),
        text: "Great! I'll test it this afternoon",
        sender: "user",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        read: true
      }
    ]
  }
];

export const profileUser = {
  id: 1,
  name: "Current User",
  email: "user@example.com",
  avatar: "/images/avatar/avatar-1.jpg",
  status: "online",
  bio: "Software developer passionate about creating amazing user experiences.",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA"
};

export type Contact = (typeof contacts)[number];
export type Chat = (typeof chats)[number];
export type Message = Chat['messages'][number];
export type ProfileUser = typeof profileUser;