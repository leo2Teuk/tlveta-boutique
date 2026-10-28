import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register() {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const roleUid = 'plugin::users-permissions.role';
    const permissionUid = 'plugin::users-permissions.permission';
    const authenticatedRole = await strapi.db.query(roleUid).findOne({
      where: { type: 'authenticated' },
      select: ['id'],
    });
    const publicRole = await strapi.db.query(roleUid).findOne({
      where: { type: 'public' },
      select: ['id'],
    });
    if (!authenticatedRole || !publicRole) {
      throw new Error('Strapi customer roles are not initialized.');
    }

    const authenticatedActions = [
      'api::commande.commande.checkout',
      'api::commande.commande.startSimulation',
      'api::commande.commande.confirmSimulation',
      'api::commande.commande.saveShippingAddress',
      'api::commande.commande.findOneMine',
      'api::commande.commande.mine',
      'api::panier.panier.mine',
      'api::panier.panier.addLine',
      'api::panier.panier.updateLine',
      'api::panier.panier.removeLine',
    ];
    const grantActions = async (roleId: number, actions: string[]) => {
      for (const action of actions) {
        const existing = await strapi.db.query(permissionUid).findOne({
          where: { action, role: { id: roleId } },
          select: ['id'],
        });
        if (!existing) {
          await strapi.db.query(permissionUid).create({
            data: { action, role: roleId },
          });
        }
      }
    };

    await grantActions(authenticatedRole.id, authenticatedActions);
    await grantActions(publicRole.id, [
      'api::category.category.find',
      'api::category.category.findOne',
      'api::produit.produit.find',
      'api::produit.produit.findOne',
    ]);

    const publicPermissions = (await strapi.db
      .query(permissionUid)
      .findMany({
        where: { role: { id: publicRole.id } },
        select: ['id', 'action'],
      })) as { id: number; action: string }[];
    for (const permission of publicPermissions) {
      if (
        permission.action.startsWith('api::panier.panier.') ||
        permission.action === 'api::commande.commande.checkout'
      ) {
        await strapi.db.query(permissionUid).delete({
          where: { id: permission.id },
        });
      }
    }
  },
};
