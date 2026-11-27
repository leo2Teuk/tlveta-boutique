import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tlveta/features/support/faq_chat_launcher.dart';

void main() {
  testWidgets('opens the FAQ chat and answers a suggested question', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(floatingActionButton: FaqChatLauncher()),
      ),
    );

    await tester.tap(find.byTooltip('Ouvrir l’aide TLveta'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Frais de livraison ?'));
    await tester.pumpAndSettle();

    expect(find.text('Aide TLveta'), findsOneWidget);
    expect(find.textContaining('4,00 €'), findsOneWidget);
  });

  testWidgets('explains that no contact channel is configured on fallback', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(floatingActionButton: FaqChatLauncher()),
      ),
    );
    await tester.tap(find.byTooltip('Ouvrir l’aide TLveta'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField),
      'Quelle est la politique de retour ?',
    );
    await tester.tap(find.byTooltip('Envoyer'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Aucun canal de contact'), findsOneWidget);
  });
}
