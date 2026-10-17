# Inventário de navegação — after

Candidato SHA256: `e6acf9e62140d396b2f9df0e74557ebc1c8a24a67a19d03c1ac2bdb6eadaaf87`. Scanner SHA256: `4ff8ec18c2c0fbf3de92ee66ce859a1e03765f35a1be93f4d70609f82cc5a7ea`.

19 rotas, 151 ações concretas, 0 sem handler, 55 testadas com evidência, 88 implementadas sem prova específica.
11 emissores genéricos/dinâmicos retidos; 812 variantes HTML analisadas em DOM inerte.

Acorn analisa declarações, callbacks, cases e comparações de ação; Chromium apenas parseia templates inertes. Não há execução da aplicação nem teste de clique neste scanner.
Status 1 exige evidência de runtime compatível com o hash; case sem prova fica implemented-unverified / categoria 4 com dependência de verificação runtime futura do domínio. Isso não remove a função nem afirma que está testada. Defeitos e incompatibilidades só entram por decisão explícita com reason/authority no --classification.

## Todas as ações concretas

| Ação | Estado | Origem de um emissor | Handler |
| --- | --- | --- | --- |
| accept-confirm | functional-tested | prototypes/bivaque-html/src/shell/dialogs.js:14 | perform:53 |
| activate-plan | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:1 | perform:94 |
| add-mod | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:25 | groupAction:12 |
| agenda | functional-tested | prototypes/bivaque-html/src/features/home/views.js:20 | perform:11 |
| answer-origin | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:108 |
| apply-city | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:1 | perform:34 |
| apply-prototype | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:43 |
| approve-req | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:25 | groupAction:11, groupAction:11 |
| ask | functional-tested | prototypes/bivaque-html/src/features/home/views.js:18 | perform:98 |
| ask-from-search | implemented-unverified | prototypes/bivaque-html/src/features/search/views.js:10 | perform:99 |
| attend-event | future-round | prototypes/bivaque-html/src/shell/primitives.js:22 | perform:19 |
| attend-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:78 | groupAction:32 |
| back | functional-tested | prototypes/bivaque-html/src/shell/navigation.js:53 | perform:9 |
| biz-filter | functional-tested | prototypes/bivaque-html/src/features/businesses/catalog.js:1 | perform:30 |
| biz-leads | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:7 | perform:74 |
| businesses | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:14 | perform:29 |
| cancel-confirm | functional-tested | prototypes/bivaque-html/src/shell/dialogs.js:14 | perform:52 |
| cap | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:3 | profileGlobalAction:26, profileGlobalAction:64 |
| catalog-all | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:12 | perform:26 |
| catalog-filter | functional-tested | prototypes/bivaque-html/src/features/listings/catalog.js:3 | perform:27 |
| city | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:53 | perform:33 |
| claim-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:88 |
| clear-filters | functional-tested | prototypes/bivaque-html/src/features/listings/catalog.js:7 | perform:28 |
| clear-search | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:55 | perform:22 |
| close-dialog | functional-tested | prototypes/bivaque-html/src/features/groups/editors.js:11 | perform:51 |
| community-tab | functional-tested | prototypes/bivaque-html/src/features/community/views.js:1 | perform:31 |
| confirm-claim | implemented-unverified | prototypes/bivaque-html/src/app/handlers.js:88 | perform:89 |
| copy-invite | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:4 | profileGlobalAction:26, profileGlobalAction:42 |
| copy-share | functional-tested | prototypes/bivaque-html/src/features/messaging/actions.js:87 | perform:18 |
| create | functional-tested | prototypes/bivaque-html/src/features/listings/catalog.js:3 | perform:54 |
| create-event | future-round | prototypes/bivaque-html/src/features/events/views.js:1 | perform:19 |
| create-group | implemented-unverified | prototypes/bivaque-html/src/features/community/views.js:1 | groupAction:14 |
| create-item | functional-tested | prototypes/bivaque-html/src/features/home/views.js:12 | perform:55 |
| create-property | functional-tested | prototypes/bivaque-html/src/app/handlers.js:16 | perform:56 |
| delete-draft | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:7 | perform:72 |
| delete-event | future-round | prototypes/bivaque-html/src/features/events/views.js:5 | perform:19 |
| delete-item | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:71 |
| deny-req | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:25 | groupAction:11 |
| edit-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:80 |
| edit-event | future-round | prototypes/bivaque-html/src/features/events/views.js:4 | perform:19 |
| edit-interests | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:69 | groupAction:35 |
| edit-item | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:5 | perform:57 |
| family | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:3 | profileGlobalAction:26, profileGlobalAction:32 |
| family-settings | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:3 | profileGlobalAction:26, profileGlobalAction:33 |
| follow-question | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:3 | perform:106 |
| gallery | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:73 |
| group-filter | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:98 | groupAction:28 |
| group-menu | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:91 | groupAction:6 |
| group-tpl | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:19 | groupAction:15 |
| groups | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:115 | perform:110 |
| guide | functional-tested | prototypes/bivaque-html/src/features/home/views.js:21 | perform:10 |
| guide-search | functional-tested | prototypes/bivaque-html/src/features/transfers/guide.js:1 | perform:23 |
| hide-question | implemented-unverified | prototypes/bivaque-html/src/motion/gestures.js:26 | perform:107 |
| home | functional-tested | prototypes/bivaque-html/src/shell/navigation.js:73 | perform:8 |
| home-city | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:74 | perform:39 |
| indicate | functional-tested | prototypes/bivaque-html/src/features/businesses/catalog.js:1 | perform:85 |
| instagram | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:91 |
| intent | implemented-unverified | prototypes/bivaque-html/src/features/transfers/guide.js:1 | perform:25 |
| interest-toggle | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:28 | groupAction:36 |
| invite-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:91 | groupAction:9 |
| invite-owner | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:87 |
| item-interest | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:5 | perform:66 |
| item-leads | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:74, perform:75 |
| item-offer | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:67 |
| item-status | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:70 |
| item-visit | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:69 |
| join-group | existing-defective | prototypes/bivaque-html/src/features/groups/views.js:56 | groupAction:3 |
| leave-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/handlers.js:6 | groupAction:8 |
| like-answer | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:105 |
| like-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:82 | groupAction:30 |
| manage-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:91 | groupAction:10 |
| map | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:112 |
| my-ads | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:3 | profileGlobalAction:26, profileGlobalAction:29 |
| my-ads-filter | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:7 | profileGlobalAction:26, profileGlobalAction:31 |
| my-biz | functional-tested | prototypes/bivaque-html/src/features/home/views.js:16 | perform:79 |
| my-questions | implemented-unverified | prototypes/bivaque-html/src/features/profile/views.js:3 | perform:109 |
| nav | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:18 | perform:7 |
| new-invite | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:4 | profileGlobalAction:26, profileGlobalAction:34 |
| new-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:97 | groupAction:17 |
| new-post-empty | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:100 | groupAction:17, groupAction:17 |
| noop | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:88 | groupAction:38 |
| notice-home | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:15 | profileGlobalAction:26, profileGlobalAction:56 |
| notice-open | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:15 | profileGlobalAction:26, profileGlobalAction:57, profileGlobalAction:59, profileGlobalAction:60 |
| notice-read | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:15 | profileGlobalAction:26, profileGlobalAction:57, profileGlobalAction:62 |
| notices | functional-tested | prototypes/bivaque-html/src/shell/navigation.js:53 | profileGlobalAction:26, profileGlobalAction:55 |
| notif-level | implemented-unverified | prototypes/bivaque-html/src/features/groups/handlers.js:6 | groupAction:7 |
| onboard-finish | implemented-unverified | prototypes/bivaque-html/src/features/auth/onboarding.js:7 | perform:119 |
| onboard-next | implemented-unverified | prototypes/bivaque-html/src/features/auth/onboarding.js:3 | perform:115 |
| onboard-prev | implemented-unverified | prototypes/bivaque-html/src/features/auth/onboarding.js:4 | perform:114 |
| onboarding | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:113 |
| open-biz | implemented-unverified | prototypes/bivaque-html/src/app/handlers.js:13 | perform:77 |
| open-draft | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:7 | perform:58 |
| open-event | functional-tested | prototypes/bivaque-html/src/shell/primitives.js:22 | perform:12 |
| open-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:57 | perform:111 |
| open-item | functional-tested | prototypes/bivaque-html/src/app/handlers.js:13 | perform:62 |
| open-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:82 | groupAction:29 |
| open-question | functional-tested | prototypes/bivaque-html/src/app/handlers.js:13 | perform:95 |
| open-thread | functional-tested | prototypes/bivaque-html/src/app/handlers.js:75 | messagingAction:22, messagingAction:25 |
| pin-thread | functional-tested | prototypes/bivaque-html/src/features/messaging/actions.js:49 | messagingAction:22, messagingAction:51 |
| plan | functional-tested | prototypes/bivaque-html/src/features/home/views.js:24 | perform:14 |
| plan-check | functional-tested | prototypes/bivaque-html/src/features/home/views.js:24 | perform:15 |
| plan-go | functional-tested | prototypes/bivaque-html/src/features/home/views.js:24 | perform:16 |
| plans | functional-tested | prototypes/bivaque-html/src/features/businesses/detail.js:7 | perform:93 |
| post-type | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:5 | groupAction:18 |
| prototype | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:56 | perform:42 |
| question-filter | functional-tested | prototypes/bivaque-html/src/features/community/views.js:4 | perform:32 |
| quote | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:82 |
| recent-search | implemented-unverified | prototypes/bivaque-html/src/features/search/views.js:8 | perform:23 |
| recommend-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:83 |
| remove-invite | functional-tested | prototypes/bivaque-html/src/features/profile/demo-actions.js:4 | profileGlobalAction:26, profileGlobalAction:48 |
| remove-photo | implemented-unverified | prototypes/bivaque-html/src/features/listings/editor.js:2 | perform:61 |
| reopen-question | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:104 |
| report | future-round | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:19 |
| reset-prototype | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:48 |
| resume | functional-tested | prototypes/bivaque-html/src/features/home/views.js:7 | perform:13 |
| save-biz | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:20 | perform:78 |
| save-draft | implemented-unverified | prototypes/bivaque-html/src/features/listings/editor.js:7 | perform:59 |
| save-interests | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:29 | groupAction:37 |
| save-item | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:18 | perform:65 |
| save-manage | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:26 | groupAction:13 |
| save-settings | functional-tested | prototypes/bivaque-html/src/features/profile/settings.js:2 | perform:41 |
| saved | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:3 | profileGlobalAction:26, profileGlobalAction:28 |
| saved-filter | functional-tested | prototypes/bivaque-html/src/features/profile/views.js:6 | profileGlobalAction:26, profileGlobalAction:30 |
| search | functional-tested | prototypes/bivaque-html/src/shell/navigation.js:53 | perform:20 |
| search-type | functional-tested | prototypes/bivaque-html/src/features/search/views.js:6 | perform:24 |
| send-answer | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:6 | perform:101 |
| send-comment | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:107 | groupAction:33 |
| send-message | functional-tested | prototypes/bivaque-html/src/features/messaging/views.js:7 | messagingAction:22, messagingAction:31 |
| send-offer | implemented-unverified | prototypes/bivaque-html/src/app/handlers.js:67 | perform:68 |
| settings | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:56 | perform:40 |
| share | functional-tested | prototypes/bivaque-html/src/features/listings/detail.js:5 | perform:17 |
| simulate-answer | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:49 |
| simulate-message | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:50 |
| solve-comment | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:106 | groupAction:34 |
| solve-question | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:104, perform:104 |
| submit-ask | implemented-unverified | prototypes/bivaque-html/src/features/community/editor.js:1 | perform:100 |
| submit-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/editor.js:1 | perform:81 |
| submit-event | future-round | prototypes/bivaque-html/src/features/events/editor.js:1 | perform:19 |
| submit-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:20 | groupAction:16 |
| submit-indicate | implemented-unverified | prototypes/bivaque-html/src/features/businesses/indication.js:1 | perform:86 |
| submit-item | implemented-unverified | prototypes/bivaque-html/src/features/listings/editor.js:7 | perform:60 |
| submit-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:11 | groupAction:19 |
| submit-recommend | implemented-unverified | prototypes/bivaque-html/src/app/handlers.js:83 | perform:84 |
| submit-report | future-round | prototypes/bivaque-html/src/features/profile/demo-actions.js:71 | perform:19 |
| swipe-delete-thread | functional-tested | prototypes/bivaque-html/src/features/messaging/actions.js:49 | messagingAction:22 |
| thread-menu | functional-tested | prototypes/bivaque-html/src/features/messaging/views.js:1 | messagingAction:22, messagingAction:48 |
| thread-origin | functional-tested | prototypes/bivaque-html/src/features/messaging/views.js:8 | messagingAction:22, messagingAction:42 |
| undo | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:24 | perform:120 |
| vote-poll | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:79 | groupAction:31 |
| website | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:92 |
| whatsapp | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:90 |

O JSON mantém TODOS os emissores/origens, variantes dinâmicas, rotas, calls/modais e bindings; esta tabela é somente índice.

## Reproduzir antes/depois

```powershell
node scripts/bivaque-html/navigation-inventory.mjs --output .visual/bivaque-html-round01/inventory-before.json --phase before
node scripts/bivaque-html/navigation-inventory.mjs --output .visual/bivaque-html-round01/inventory-after.json --phase after --compare .visual/bivaque-html-round01/inventory-before.json
```

Configure PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH quando necessário. --evidence troca o report de runtime, que pode fornecer actionCheckpoints: {action: [checkpoint, ...]} (todos presentes nos cases PASS e hash correspondente); --classification recebe JSON action -> {category: 2|4|5, reason, authority}. Sem nova prova compatível, o scanner nunca transforma handler em funcional testado.
