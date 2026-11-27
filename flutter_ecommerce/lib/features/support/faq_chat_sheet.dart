import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/theme/app_theme.dart';
import 'faq_answer.dart';

class FaqChatSheet extends StatefulWidget {
  const FaqChatSheet({super.key});

  @override
  State<FaqChatSheet> createState() => _FaqChatSheetState();
}

class _FaqChatSheetState extends State<FaqChatSheet> {
  final _questionController = TextEditingController();
  final _messagesController = ScrollController();
  final _messages = <_FaqChatMessage>[
    const _FaqChatMessage(
      text:
          'Bonjour ! Posez une question sur le compte, le paiement, la '
          'livraison ou le suivi de commande.',
      fromVisitor: false,
    ),
  ];

  @override
  void dispose() {
    _questionController.dispose();
    _messagesController.dispose();
    super.dispose();
  }

  void _sendQuestion([String? question]) {
    final text = (question ?? _questionController.text).trim();
    if (text.isEmpty) return;

    final answer = FaqMatcher.findAnswer(text);
    setState(() {
      _messages
        ..add(_FaqChatMessage(text: text, fromVisitor: true))
        ..add(
          _FaqChatMessage(
            text: answer?.answer ??
                'Je n’ai pas trouvé de réponse dans les informations '
                    'disponibles. Aucun canal de contact n’est configuré pour '
                    'le moment. Essayez une question sur le compte, le '
                    'paiement, la livraison ou le suivi.',
            fromVisitor: false,
          ),
        );
      _questionController.clear();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_messagesController.hasClients) {
        _messagesController.animateTo(
          _messagesController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final compact = size.width < 600;
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    final availableHeight = (size.height - keyboardInset)
        .clamp(0.0, size.height)
        .toDouble();
    final sheetHeight = math.min(
      availableHeight * (compact ? 0.88 : 0.76),
      compact ? 680.0 : 640.0,
    );
    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      padding: EdgeInsets.only(bottom: keyboardInset),
      child: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: SizedBox(
              height: sheetHeight,
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
                    Expanded(
                      child: ListView.builder(
                        controller: _messagesController,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) =>
                            _MessageBubble(message: _messages[index]),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        for (final question in _suggestedQuestions)
                          ActionChip(
                            label: Text(question),
                            onPressed: () => _sendQuestion(question),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _questionController,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _sendQuestion(),
                            decoration: const InputDecoration(
                              hintText: 'Écrivez votre question',
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          tooltip: 'Envoyer',
                          onPressed: () => _sendQuestion(),
                          icon: const Icon(Icons.send_outlined),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    const Text(
                      'Réponses automatiques limitées aux informations '
                      'confirmées de la boutique.',
                      style: TextStyle(color: AppTheme.muted, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

const _suggestedQuestions = [
  'Frais de livraison ?',
  'Le paiement est-il réel ?',
  'Comment suivre ma commande ?',
];

class _FaqChatMessage {
  const _FaqChatMessage({required this.text, required this.fromVisitor});

  final String text;
  final bool fromVisitor;
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final _FaqChatMessage message;

  @override
  Widget build(BuildContext context) {
    final background = message.fromVisitor
        ? AppTheme.forest
        : const Color(0xFFF0F3EF);
    final foreground = message.fromVisitor ? Colors.white : AppTheme.ink;
    return Align(
      alignment: message.fromVisitor
          ? Alignment.centerRight
          : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(message.text, style: TextStyle(color: foreground)),
      ),
    );
  }
}
