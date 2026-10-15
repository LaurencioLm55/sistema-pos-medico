-- CAMBIO: soporte para venta por pieza (ej. gasas sueltas de una caja)
-- Migración 100% aditiva: no borra ni modifica columnas existentes,
-- todas las columnas nuevas tienen valores por defecto o son opcionales,
-- por lo que los productos y ventas ya existentes no se ven afectados.

-- CreateEnum
CREATE TYPE "SaleUnitType" AS ENUM ('UNIT', 'PIECE');

-- AlterTable: Product
ALTER TABLE "Product" ADD COLUMN     "soldByPiece" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "piecesPerBox" INTEGER,
ADD COLUMN     "piecePrice" DECIMAL(10,2),
ADD COLUMN     "looseStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: SaleDetail
ALTER TABLE "SaleDetail" ADD COLUMN     "unitType" "SaleUnitType" NOT NULL DEFAULT 'UNIT';
