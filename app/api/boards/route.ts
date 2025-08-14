import { NextResponse, NextRequest } from "next/server";
import { demoBoards } from "./data";
import { createSuccessResponse, createCreatedResponse, createErrorResponse, handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        return createSuccessResponse("Boards obtenidos exitosamente", request.url, true, undefined, demoBoards);
    } catch (error) {
        return handleApiError(error, request.url);
    }
}

export async function POST(request: NextRequest) {
    try {
        const newItem = await request.json();
        newItem.id = demoBoards.length + 1;
        demoBoards.push(newItem);

        return createCreatedResponse("Board creado exitosamente", request.url, true, undefined, newItem);
    } catch (error) {
        return handleApiError(error, request.url, "Error al crear board");
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const payloadItem = await request.json();
        const { activeBoardId, overBoardId } = payloadItem;

        const activeIndex = demoBoards.findIndex((item) => item.id === activeBoardId);
        const overIndex = demoBoards.findIndex((item) => item.id === overBoardId);

        if (activeIndex !== -1 && overIndex !== -1) {
            [demoBoards[activeIndex], demoBoards[overIndex]] = [
                demoBoards[overIndex],
                demoBoards[activeIndex],
            ];

            return createSuccessResponse("Boards reordenados exitosamente", request.url, true, undefined, demoBoards);
        } else {
            return createErrorResponse("Board no encontrado", 404, "BOARD_NOT_FOUND", request.url);
        }
    } catch (error) {
        return handleApiError(error, request.url, "Error al reordenar boards");
    }
}
