export default {
  routes: [
    {
      method: 'POST',
      path: '/checkout/commandes',
      handler: 'commande.checkout',
      config: { auth: {} },
    },
    {
      method: 'POST',
      path: '/commandes/:documentId/simulation',
      handler: 'commande.startSimulation',
      config: { auth: {} },
    },
    {
      method: 'POST',
      path: '/commandes/:documentId/confirmer-paiement',
      handler: 'commande.confirmSimulation',
      config: { auth: {} },
    },
    {
      method: 'PUT',
      path: '/commandes/:documentId/adresse-livraison',
      handler: 'commande.saveShippingAddress',
      config: { auth: {} },
    },
    {
      method: 'GET',
      path: '/mes-commandes/:documentId',
      handler: 'commande.findOneMine',
      config: { auth: {} },
    },
    {
      method: 'GET',
      path: '/commandes/miennes',
      handler: 'commande.mine',
      config: { auth: {} },
    },
  ],
};
