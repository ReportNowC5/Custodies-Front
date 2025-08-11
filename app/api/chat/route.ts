import { NextResponse, NextRequest } from "next/server";

import { profileUser, contacts, chats } from "./data";



export async function GET(request: NextRequest, response: NextResponse) {
  const contactsData = contacts; // Assuming this fetches all contacts data

  const chatsContacts = contactsData.map((contact) => {
    const chat = chats.find((chat) => chat.contactId === contact.id);
    const lastMessage = chat && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
    const lastMessageTime = lastMessage ? lastMessage.timestamp : null;

    return {
      ...contact,
      chat: {
        id: chat ? chat.id : null,
        unseenMsgs: 0,
        lastMessage: lastMessage ? lastMessage.text : null,
        lastMessageTime: lastMessageTime || null,
      },
    };
  });

  return NextResponse.json({ contacts: chatsContacts }, { status: 200 });
}
