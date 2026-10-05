-- Constraints Prisma cannot express.
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_exactly_one_target" CHECK (("productId" IS NOT NULL) <> ("companyId" IS NOT NULL));
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_order" CHECK ("priceMin" IS NULL OR "priceMax" IS NULL OR "priceMin" <= "priceMax");
ALTER TABLE "Product" ADD CONSTRAINT "Product_moq_positive" CHECK ("moq" >= 1);
ALTER TABLE "EscrowLedgerEntry" ADD CONSTRAINT "Escrow_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Category" ADD CONSTRAINT "Category_level_range" CHECK ("level" BETWEEN 1 AND 4);
