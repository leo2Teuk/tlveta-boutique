import type { Core } from '@strapi/strapi';
import { factories } from '@strapi/strapi';

const cartUid = 'api::panier.panier';
const lineUid = 'api::ligne-panier.ligne-panier';
const productUid = 'api::produit.produit';

type CartProduct = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | string | null;
  image: { url: string } | null;
  category: { documentId: string; name: string } | null;
};

type CartLine = {
  id: number;
  documentId: string;
  qte: number;
  produit: CartProduct | null;
  panier?: { id: number; user?: { id: number } | null } | null;
};

type CartEntity = {
  id: number;
  documentId: string;
  lignes: CartLine[];
};

async function findCart(
  strapi: Core.Strapi,
  userId: number,
): Promise<CartEntity | null> {
  const cart: CartEntity | null = await strapi.db.query(cartUid).findOne({
    where: { user: { id: userId } },
    populate: {
      lignes: {
        populate: {
          produit: {
            populate: {
              image: true,
              category: true,
            },
          },
        },
      },
    },
  });
  return cart;
}

function serializeCart(cart: CartEntity | null) {
  if (!cart) return null;

  const lines = Array.isArray(cart.lignes) ? cart.lignes : [];
  return {
    documentId: cart.documentId,
    quantity: lines.reduce((total, line) => total + line.qte, 0),
    items: lines.map((line) => ({
      documentId: line.documentId,
      quantity: line.qte,
      product: line.produit
        ? {
            documentId: line.produit.documentId,
            title: line.produit.title,
            slug: line.produit.slug,
            description: line.produit.description,
            price: line.produit.price,
            image: line.produit.image,
            category: line.produit.category,
          }
        : null,
    })),
  };
}

async function updateCartQuantity(
  strapi: Core.Strapi,
  cartId: number,
  userId: number,
) {
  const cart = await findCart(strapi, userId);
  if (!cart || cart.id !== cartId) return;
  const quantity = cart.lignes.reduce((total, line) => total + line.qte, 0);
  await strapi.db.query(cartUid).update({
    where: { id: cartId },
    data: { qte: quantity },
  });
}

export default factories.createCoreController(
  'api::panier.panier',
  ({ strapi }) => ({
    async mine(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      ctx.body = { data: serializeCart(await findCart(strapi, user.id)) };
    },

    async addLine(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const body = ctx.request.body as {
        productDocumentId?: unknown;
        quantity?: unknown;
      };
      if (
        typeof body?.productDocumentId !== 'string' ||
        !Number.isInteger(body.quantity) ||
        Number(body.quantity) < 1 ||
        Number(body.quantity) > 99
      ) {
        return ctx.badRequest('productDocumentId and quantity (1-99) are required.');
      }

      const product = await strapi.db.query(productUid).findOne({
        where: {
          documentId: body.productDocumentId,
          publishedAt: { $notNull: true },
        },
        select: ['id', 'documentId'],
      });
      if (!product) return ctx.notFound('Published product not found.');

      let cart = await strapi.db.query(cartUid).findOne({
        where: { user: { id: user.id } },
        select: ['id'],
      });
      if (!cart) {
        cart = await strapi.db.query(cartUid).create({
          data: { titre: 'Panier', qte: 0, user: user.id },
          select: ['id'],
        });
      }

      const line: { id: number; qte: number } | null = await strapi.db.query(
        lineUid,
      ).findOne({
        where: { panier: { id: cart.id }, produit: { id: product.id } },
        select: ['id', 'qte'],
      });
      const quantity = Number(body.quantity) + (Number(line?.qte) || 0);
      if (quantity > 99) {
        return ctx.badRequest('A maximum of 99 units per product is allowed.');
      }

      if (line) {
        await strapi.db.query(lineUid).update({
          where: { id: line.id },
          data: { qte: quantity },
        });
      } else {
        await strapi.db.query(lineUid).create({
          data: { qte: quantity, panier: cart.id, produit: product.id },
        });
      }
      await updateCartQuantity(strapi, cart.id, user.id);
      ctx.body = { data: serializeCart(await findCart(strapi, user.id)) };
    },

    async updateLine(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const body = ctx.request.body as { quantity?: unknown };
      if (
        !Number.isInteger(body?.quantity) ||
        Number(body.quantity) < 1 ||
        Number(body.quantity) > 99
      ) {
        return ctx.badRequest('quantity must be an integer between 1 and 99.');
      }

      const line: CartLine | null = await strapi.db.query(lineUid).findOne({
        where: { documentId: ctx.params.lineId },
        populate: { panier: { populate: { user: true } } },
      });
      const cartId = line?.panier?.id;
      if (!line || !cartId || line.panier?.user?.id !== user.id) {
        return ctx.notFound('Cart line not found.');
      }

      await strapi.db.query(lineUid).update({
        where: { id: line.id },
        data: { qte: Number(body.quantity) },
      });
      await updateCartQuantity(strapi, cartId, user.id);
      ctx.body = { data: serializeCart(await findCart(strapi, user.id)) };
    },

    async removeLine(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const line: CartLine | null = await strapi.db.query(lineUid).findOne({
        where: { documentId: ctx.params.lineId },
        populate: { panier: { populate: { user: true } } },
      });
      const cartId = line?.panier?.id;
      if (!line || !cartId || line.panier?.user?.id !== user.id) {
        return ctx.notFound('Cart line not found.');
      }

      await strapi.db.query(lineUid).delete({ where: { id: line.id } });
      await updateCartQuantity(strapi, cartId, user.id);
      ctx.body = { data: serializeCart(await findCart(strapi, user.id)) };
    },
  }),
);
