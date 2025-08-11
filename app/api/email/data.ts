import { faker } from "@faker-js/faker";

export const mails = [
  {
    id: 1,
    from: {
      name: "John Doe",
      email: "john.doe@example.com",
      avatar: "/images/avatar/avatar-1.jpg"
    },
    to: [
      {
        name: "You",
        email: "you@example.com"
      }
    ],
    subject: "Welcome to our platform!",
    body: "Thank you for joining our platform. We're excited to have you on board and look forward to helping you achieve your goals.",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    starred: false,
    important: true,
    labels: ["welcome", "onboarding"],
    attachments: []
  },
  {
    id: 2,
    from: {
      name: "Jane Smith",
      email: "jane.smith@company.com",
      avatar: "/images/avatar/avatar-2.jpg"
    },
    to: [
      {
        name: "You",
        email: "you@example.com"
      }
    ],
    subject: "Project Update - Q4 2024",
    body: "Here's the latest update on our Q4 project. We've made significant progress and are on track to meet our deadlines. Please review the attached documents and let me know if you have any questions.",
    date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: true,
    important: false,
    labels: ["work", "project"],
    attachments: [
      {
        name: "project-report.pdf",
        size: "2.5 MB",
        type: "application/pdf"
      }
    ]
  },
  {
    id: 3,
    from: {
      name: "Mike Johnson",
      email: "mike.johnson@tech.com",
      avatar: "/images/avatar/avatar-3.jpg"
    },
    to: [
      {
        name: "You",
        email: "you@example.com"
      },
      {
        name: "Sarah Wilson",
        email: "sarah.wilson@tech.com"
      }
    ],
    subject: "Meeting Reminder - Tomorrow 2 PM",
    body: "Just a friendly reminder about our meeting tomorrow at 2 PM. We'll be discussing the new feature implementation and timeline. The meeting will be held in Conference Room A.",
    date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: false,
    important: true,
    labels: ["meeting", "reminder"],
    attachments: []
  },
  {
    id: 4,
    from: {
      name: "Support Team",
      email: "support@platform.com",
      avatar: "/images/avatar/avatar-4.jpg"
    },
    to: [
      {
        name: "You",
        email: "you@example.com"
      }
    ],
    subject: "Your ticket has been resolved",
    body: "Good news! Your support ticket #12345 has been resolved. Our team has implemented the fix you requested. If you have any further questions, please don't hesitate to reach out.",
    date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    read: false,
    starred: false,
    important: false,
    labels: ["support", "resolved"],
    attachments: []
  },
  {
    id: 5,
    from: {
      name: "Newsletter",
      email: "newsletter@industry.com",
      avatar: "/images/avatar/avatar-5.jpg"
    },
    to: [
      {
        name: "You",
        email: "you@example.com"
      }
    ],
    subject: "Weekly Industry Updates",
    body: "Stay up to date with the latest industry trends and news. This week we're covering AI developments, new frameworks, and upcoming conferences.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: false,
    important: false,
    labels: ["newsletter", "industry"],
    attachments: [
      {
        name: "weekly-report.html",
        size: "1.2 MB",
        type: "text/html"
      }
    ]
  }
];

export type Mail = (typeof mails)[number];
export type Attachment = Mail['attachments'][number];
export type Recipient = Mail['to'][number];