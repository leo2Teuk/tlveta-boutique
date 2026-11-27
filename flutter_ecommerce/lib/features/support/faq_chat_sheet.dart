import 'package:flutter/material.dart';

import '../../shared/theme/app_theme.dart';

class FaqChatSheet extends StatelessWidget {
  const FaqChatSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final compact = size.width < 600;
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: SizedBox(
            height: size.height * (compact ? 0.88 : 0.76),
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                compact ? 16 : 24,
                8,
                compact ? 16 : 24,
                16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: AppTheme.forest,
                        foregroundColor: Colors.white,
                        child: Icon(Icons.support_agent_outlined),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Aide TLveta',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const Text(
                              'Réponses aux questions fréquentes',
                              style: TextStyle(color: AppTheme.muted),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'Fermer',
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const Divider(height: 28),
                  const Expanded(
                    child: Align(
                      alignment: Alignment.topLeft,
                      child: _WelcomeMessage(),
                    ),
                  ),
                  const Divider(height: 20),
                  const Text(
                    'Les réponses sont basées sur les informations disponibles '
                    'dans la boutique.',
                    style: TextStyle(color: AppTheme.muted, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _WelcomeMessage extends StatelessWidget {
  const _WelcomeMessage();

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 420),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F3EF),
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Text(
        'Bonjour ! Posez une question sur le compte, le paiement, la livraison '
        'ou le suivi de commande.',
      ),
    );
  }
}
