import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tlveta/features/catalog/catalog_page.dart';
import 'package:tlveta/features/catalog/catalog_providers.dart';
import 'package:tlveta/features/support/faq_chat_launcher.dart';

void main() {
  testWidgets('visitors can open the FAQ chat from the public catalogue', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          productCategoriesProvider.overrideWith((ref) async => []),
          catalogProductsProvider.overrideWith((ref, query) async => []),
        ],
        child: const MaterialApp(home: CatalogPage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(FaqChatLauncher), findsOneWidget);
    expect(find.byTooltip('Ouvrir l’aide TLveta'), findsOneWidget);
  });
}
