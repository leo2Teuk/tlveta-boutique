import 'package:flutter/material.dart';

import 'faq_chat_sheet.dart';

class FaqChatLauncher extends StatelessWidget {
  const FaqChatLauncher({super.key});

  void _openChat(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (context) => const FaqChatSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 600;
    if (compact) {
      return FloatingActionButton(
        tooltip: 'Ouvrir l’aide TLveta',
        onPressed: () => _openChat(context),
        child: const Icon(Icons.support_agent_outlined),
      );
    }
    return FloatingActionButton.extended(
      tooltip: 'Ouvrir l’aide TLveta',
      onPressed: () => _openChat(context),
      icon: const Icon(Icons.support_agent_outlined),
      label: const Text('Aide'),
    );
  }
}
