import { NextResponse, NextRequest } from "next/server";
import { chats } from "../data";

export async function POST(request: NextRequest, response: NextResponse) {
  const obj = await request.json();

  let activeChat = chats.find((item) => item.id === parseInt(obj.contact.id));

  const newMessageData = {
    id: Date.now().toString(),
    text: obj.message,
    sender: 'user',
    timestamp: new Date().toISOString(),
    read: false,
  };
  if (!activeChat) {
    activeChat = {
      id: obj.contact.id,
      contactId: obj.contact.id,
      messages: [newMessageData],
    };
    chats.push(activeChat);
  } else {
    activeChat.messages.push(newMessageData);
  }

  return NextResponse.json(
    {
      chat: activeChat,
      contact: obj.contact,
      newMessageData,
      id: obj.contact.id,
    },
    { status: 201 }
  );
}
