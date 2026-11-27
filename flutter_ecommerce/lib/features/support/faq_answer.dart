class FaqAnswer {
  const FaqAnswer({
    required this.question,
    required this.answer,
    required this.matchPhrases,
  });

  final String question;
  final String answer;
  final List<String> matchPhrases;
}

const storefrontFaq = [
  FaqAnswer(
    question: 'Faut-il créer un compte pour commander ?',
    answer:
        'Le catalogue est consultable sans compte. Un compte client est '
        'nécessaire pour ouvrir une fiche produit, utiliser le panier et '
        'passer commande.',
    matchPhrases: [
      'creer un compte',
      'compte client',
      'me connecter',
      'sans compte',
      'acheter sans compte',
    ],
  ),
  FaqAnswer(
    question: 'Le paiement est-il réel ?',
    answer:
        'Le paiement actuel est une démonstration de 10 secondes. Aucune '
        'carte bancaire n’est demandée et aucun paiement réel n’est envoyé.',
    matchPhrases: [
      'paiement',
      'payer ma commande',
      'paiement reel',
      'carte bancaire',
      'simuler le paiement',
      'stripe',
    ],
  ),
  FaqAnswer(
    question: 'Quels sont les frais de livraison ?',
    answer:
        'Les frais de livraison affichés au panier sont de 4,00 € pour la '
        'France et l’Union européenne.',
    matchPhrases: [
      'frais de livraison',
      'cout de livraison',
      'prix de livraison',
      'combien coute la livraison',
      'livraison coute',
    ],
  ),
  FaqAnswer(
    question: 'Comment suivre ma commande ?',
    answer:
        'Connectez-vous, ouvrez Mon compte puis Mes commandes et sélectionnez '
        'la commande. Les étapes et les informations de transport sont '
        'affichées lorsqu’elles sont disponibles.',
    matchPhrases: [
      'suivre ma commande',
      'suivi de commande',
      'ou est mon colis',
      'etat de ma commande',
      'suivi colis',
    ],
  ),
  FaqAnswer(
    question: 'Comment modifier mon profil ?',
    answer:
        'Depuis Mon compte, choisissez Modifier mon profil. Vous pouvez '
        'modifier votre prénom, votre nom, votre téléphone et le lien de votre '
        'photo. L’adresse e-mail reste en lecture seule.',
    matchPhrases: [
      'modifier mon profil',
      'mes informations personnelles',
      'changer mon numero',
      'photo de profil',
      'modifier mes coordonnees',
    ],
  ),
];

class FaqMatcher {
  const FaqMatcher._();

  static FaqAnswer? findAnswer(String question) {
    final normalizedQuestion = _normalize(question);
    if (normalizedQuestion.isEmpty) return null;

    FaqAnswer? match;
    var matchLength = 0;
    var ambiguous = false;
    for (final entry in storefrontFaq) {
      for (final phrase in entry.matchPhrases) {
        final normalizedPhrase = _normalize(phrase);
        if (!normalizedQuestion.contains(normalizedPhrase)) continue;
        final phraseLength = normalizedPhrase.length;
        if (phraseLength > matchLength) {
          match = entry;
          matchLength = phraseLength;
          ambiguous = false;
        } else if (phraseLength == matchLength && match != entry) {
          ambiguous = true;
        }
      }
    }
    return ambiguous ? null : match;
  }

  static String _normalize(String value) {
    var normalized = value.toLowerCase();
    const replacements = {
      'à': 'a',
      'â': 'a',
      'ä': 'a',
      'ç': 'c',
      'é': 'e',
      'è': 'e',
      'ê': 'e',
      'ë': 'e',
      'î': 'i',
      'ï': 'i',
      'ô': 'o',
      'ö': 'o',
      'ù': 'u',
      'û': 'u',
      'ü': 'u',
      'œ': 'oe',
    };
    for (final replacement in replacements.entries) {
      normalized = normalized.replaceAll(replacement.key, replacement.value);
    }
    return normalized.replaceAll(RegExp(r'[^a-z0-9]+'), ' ').trim();
  }
}
