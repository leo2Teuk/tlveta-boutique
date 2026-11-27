import 'package:flutter_test/flutter_test.dart';
import 'package:tlveta/features/support/faq_answer.dart';

void main() {
  test('matches French FAQ phrases despite accents and punctuation', () {
    final answer = FaqMatcher.findAnswer('Combien coûtent les frais ?');
    final deliveryAnswer = FaqMatcher.findAnswer(
      'Combien coûte la livraison ?',
    );

    expect(answer, isNull);
    expect(deliveryAnswer?.question, 'Quels sont les frais de livraison ?');
  });

  test('returns the factual payment answer for a payment question', () {
    final answer = FaqMatcher.findAnswer(
      'Est-ce un paiement réel par carte bancaire ?',
    );

    expect(answer?.question, 'Le paiement est-il réel ?');
    expect(answer?.answer, contains('Aucune carte bancaire'));
  });

  test('does not guess when a question is outside the published FAQ', () {
    expect(
      FaqMatcher.findAnswer('Quelle est votre politique de retour ?'),
      isNull,
    );
    expect(FaqMatcher.findAnswer('   '), isNull);
  });
}
