import { NextResponse, NextRequest } from "next/server";
import { demoBoards } from "../data";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const payloadItem = await request.json();
        const index = demoBoards.findIndex((item) => item.id === payloadItem.id);

        if (index !== -1) {
            demoBoards[index] = payloadItem;
            return createSuccessResponse([payloadItem], "Board actualizado exitosamente", request.url);
        } else {
            return createErrorResponse("Board no encontrado", 404, "BOARD_NOT_FOUND", request.url);
        }
    } catch (error) {
        return handleApiError(error, request.url, "Error al actualizar board");
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const index = demoBoards.findIndex((item) => item.id === id);

        if (index !== -1) {
            const deletedItem = demoBoards.splice(index, 1)[0];
            return createSuccessResponse([deletedItem], "Board eliminado exitosamente", request.url);
        } else {
            return createErrorResponse("Board no encontrado", 404, "BOARD_NOT_FOUND", request.url);
        }
    } catch (error) {
        return handleApiError(error, request.url, "Error al eliminar board");
    }
}
