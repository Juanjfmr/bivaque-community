# Inventário de navegação — before

Candidato SHA256: `3a89428131ea76386ca0966d8dc7964cb0b7a58e398ed350a88148e35682e8c2`. Scanner SHA256: `ae1cf1b0b236c0eb920a149c666a8bc5da74dfa370d49c0aba1259b7f2dbc634`.

19 rotas, 147 ações concretas, 26 sem handler, 6 testadas com evidência, 115 implementadas sem prova específica.
11 emissores genéricos/dinâmicos retidos; 806 variantes HTML analisadas em DOM inerte.

Acorn analisa declarações, callbacks, cases e comparações de ação; Chromium apenas parseia templates inertes. Não há execução da aplicação nem teste de clique neste scanner.
Status 1 exige evidência de runtime compatível com o hash; case sem prova fica implemented-unverified / categoria 4 com dependência de verificação runtime futura do domínio. Isso não remove a função nem afirma que está testada. Defeitos e incompatibilidades só entram por decisão explícita com reason/authority no --classification.

## Todas as ações concretas

| Ação | Estado | Origem de um emissor | Handler |
| --- | --- | --- | --- |
| accept-confirm | implemented-unverified | prototypes/bivaque-html/src/shell/dialogs.js:12 | perform:41 |
| activate-plan | implemented-unverified | prototypes/bivaque-html/src/features/profile/demo-actions.js:1 | perform:82 |
| add-mod | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:25 | groupAction:12 |
| agenda | no-handler | prototypes/bivaque-html/src/features/home/views.js:20 | ausente |
| answer-origin | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:96 |
| apply-city | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:1 | perform:22 |
| apply-prototype | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:31 |
| approve-req | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:25 | groupAction:11, groupAction:11 |
| ask | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:18 | perform:86 |
| ask-from-search | implemented-unverified | prototypes/bivaque-html/src/features/search/views.js:10 | perform:87 |
| attend-event | no-handler | prototypes/bivaque-html/src/shell/primitives.js:22 | ausente |
| attend-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:78 | groupAction:32 |
| back | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:18 | perform:7 |
| biz-filter | implemented-unverified | prototypes/bivaque-html/src/features/businesses/catalog.js:1 | perform:18 |
| biz-leads | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:7 | perform:62 |
| businesses | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:14 | perform:17 |
| cancel-confirm | implemented-unverified | prototypes/bivaque-html/src/shell/dialogs.js:12 | perform:40 |
| cap | no-handler | prototypes/bivaque-html/src/features/profile/views.js:3 | ausente |
| catalog-all | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:12 | perform:14 |
| catalog-filter | implemented-unverified | prototypes/bivaque-html/src/features/listings/catalog.js:3 | perform:15 |
| city | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:18 | perform:21 |
| claim-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:76 |
| clear-filters | implemented-unverified | prototypes/bivaque-html/src/features/listings/catalog.js:7 | perform:16 |
| clear-search | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:20 | perform:10 |
| close-dialog | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:11 | perform:39 |
| community-tab | implemented-unverified | prototypes/bivaque-html/src/features/community/views.js:1 | perform:19 |
| confirm-claim | implemented-unverified | prototypes/bivaque-html/src/app/handlers.js:76 | perform:77 |
| copy-invite | no-handler | prototypes/bivaque-html/src/features/profile/demo-actions.js:2 | ausente |
| copy-share | no-handler | prototypes/bivaque-html/src/features/messaging/actions.js:81 | ausente |
| create | implemented-unverified | prototypes/bivaque-html/src/features/listings/catalog.js:3 | perform:42 |
| create-event | no-handler | prototypes/bivaque-html/src/features/events/views.js:1 | ausente |
| create-group | implemented-unverified | prototypes/bivaque-html/src/features/community/views.js:1 | groupAction:14 |
| create-item | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:12 | perform:43 |
| create-property | implemented-unverified | prototypes/bivaque-html/src/shell/create-menu.js:15 | perform:44 |
| delete-draft | implemented-unverified | prototypes/bivaque-html/src/features/profile/views.js:7 | perform:60 |
| delete-event | no-handler | prototypes/bivaque-html/src/features/events/views.js:5 | ausente |
| delete-item | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:59 |
| deny-req | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:25 | groupAction:11 |
| edit-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:68 |
| edit-event | no-handler | prototypes/bivaque-html/src/features/events/views.js:4 | ausente |
| edit-interests | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:69 | groupAction:35 |
| edit-item | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:5 | perform:45 |
| family | no-handler | prototypes/bivaque-html/src/features/profile/views.js:3 | ausente |
| follow-question | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:3 | perform:94 |
| gallery | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:61 |
| group-filter | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:98 | groupAction:28 |
| group-menu | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:91 | groupAction:6 |
| group-tpl | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:19 | groupAction:15 |
| groups | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:115 | perform:98 |
| guide | no-handler | prototypes/bivaque-html/src/features/home/views.js:21 | ausente |
| guide-search | implemented-unverified | prototypes/bivaque-html/src/features/transfers/guide.js:1 | perform:11 |
| hide-question | implemented-unverified | prototypes/bivaque-html/src/motion/gestures.js:26 | perform:95 |
| home | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:1 | perform:6 |
| home-city | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:39 | perform:27 |
| indicate | implemented-unverified | prototypes/bivaque-html/src/features/businesses/catalog.js:1 | perform:73 |
| instagram | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:79 |
| intent | implemented-unverified | prototypes/bivaque-html/src/features/transfers/guide.js:1 | perform:13 |
| interest-toggle | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:28 | groupAction:36 |
| invite-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:91 | groupAction:9 |
| invite-owner | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:75 |
| item-interest | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:5 | perform:54 |
| item-leads | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:62, perform:63 |
| item-offer | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:55 |
| item-status | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:58 |
| item-visit | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:57 |
| join-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:56 | groupAction:3 |
| leave-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/handlers.js:6 | groupAction:8 |
| like-answer | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:93 |
| like-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:82 | groupAction:30 |
| manage-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:91 | groupAction:10 |
| map | implemented-unverified | prototypes/bivaque-html/src/features/listings/detail.js:6 | perform:100 |
| my-ads | no-handler | prototypes/bivaque-html/src/features/profile/views.js:3 | ausente |
| my-ads-filter | no-handler | prototypes/bivaque-html/src/features/profile/views.js:7 | ausente |
| my-biz | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:16 | perform:67 |
| my-questions | implemented-unverified | prototypes/bivaque-html/src/features/profile/views.js:3 | perform:97 |
| nav | implemented-unverified | prototypes/bivaque-html/src/features/home/views.js:18 | perform:5 |
| new-invite | no-handler | prototypes/bivaque-html/src/features/profile/demo-actions.js:2 | ausente |
| new-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:97 | groupAction:17 |
| new-post-empty | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:100 | groupAction:17, groupAction:17 |
| noop | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:88 | groupAction:38 |
| notices | no-handler | prototypes/bivaque-html/src/shell/navigation.js:18 | ausente |
| notif-level | implemented-unverified | prototypes/bivaque-html/src/features/groups/handlers.js:6 | groupAction:7 |
| onboard-finish | implemented-unverified | prototypes/bivaque-html/src/features/auth/onboarding.js:7 | perform:107 |
| onboard-next | implemented-unverified | prototypes/bivaque-html/src/features/auth/onboarding.js:3 | perform:103 |
| onboard-prev | implemented-unverified | prototypes/bivaque-html/src/features/auth/onboarding.js:4 | perform:102 |
| onboarding | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:101 |
| open-biz | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:20 | perform:65 |
| open-draft | implemented-unverified | prototypes/bivaque-html/src/features/profile/views.js:7 | perform:46 |
| open-event | no-handler | prototypes/bivaque-html/src/shell/primitives.js:22 | ausente |
| open-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:57 | perform:99 |
| open-item | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:18 | perform:50 |
| open-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:82 | groupAction:29 |
| open-question | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:21 | perform:83 |
| open-thread | functional-tested | prototypes/bivaque-html/src/app/handlers.js:63 | messagingAction:22, messagingAction:25 |
| pin-thread | functional-tested | prototypes/bivaque-html/src/features/messaging/actions.js:49 | messagingAction:22, messagingAction:51 |
| plan | no-handler | prototypes/bivaque-html/src/features/home/views.js:24 | ausente |
| plan-check | no-handler | prototypes/bivaque-html/src/features/home/views.js:24 | ausente |
| plan-go | no-handler | prototypes/bivaque-html/src/features/home/views.js:24 | ausente |
| plans | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:7 | perform:81 |
| post-type | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:5 | groupAction:18 |
| prototype | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:21 | perform:30 |
| question-filter | implemented-unverified | prototypes/bivaque-html/src/features/community/views.js:4 | perform:20 |
| quote | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:70 |
| recent-search | implemented-unverified | prototypes/bivaque-html/src/features/search/views.js:8 | perform:11 |
| recommend-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:3 | perform:71 |
| remove-invite | no-handler | prototypes/bivaque-html/src/features/profile/demo-actions.js:2 | ausente |
| remove-photo | implemented-unverified | prototypes/bivaque-html/src/features/listings/editor.js:2 | perform:49 |
| reopen-question | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:92 |
| report | no-handler | prototypes/bivaque-html/src/features/listings/detail.js:6 | ausente |
| reset-prototype | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:36 |
| resume | no-handler | prototypes/bivaque-html/src/features/home/views.js:7 | ausente |
| save-biz | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:20 | perform:66 |
| save-draft | implemented-unverified | prototypes/bivaque-html/src/features/listings/editor.js:7 | perform:47 |
| save-interests | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:29 | groupAction:37 |
| save-item | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:18 | perform:53 |
| save-manage | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:26 | groupAction:13 |
| save-settings | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:2 | perform:29 |
| saved | no-handler | prototypes/bivaque-html/src/features/profile/views.js:3 | ausente |
| saved-filter | no-handler | prototypes/bivaque-html/src/features/profile/views.js:6 | ausente |
| search | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:18 | perform:8 |
| search-type | implemented-unverified | prototypes/bivaque-html/src/features/search/views.js:6 | perform:12 |
| send-answer | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:6 | perform:89 |
| send-comment | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:107 | groupAction:33 |
| send-message | functional-tested | prototypes/bivaque-html/src/features/messaging/views.js:7 | messagingAction:22, messagingAction:31 |
| send-offer | implemented-unverified | prototypes/bivaque-html/src/app/handlers.js:55 | perform:56 |
| settings | implemented-unverified | prototypes/bivaque-html/src/shell/navigation.js:21 | perform:28 |
| share | no-handler | prototypes/bivaque-html/src/features/listings/detail.js:5 | ausente |
| simulate-answer | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:37 |
| simulate-message | implemented-unverified | prototypes/bivaque-html/src/features/profile/settings.js:3 | perform:38 |
| solve-comment | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:106 | groupAction:34 |
| solve-question | implemented-unverified | prototypes/bivaque-html/src/features/community/question.js:5 | perform:92, perform:92 |
| submit-ask | implemented-unverified | prototypes/bivaque-html/src/features/community/editor.js:1 | perform:88 |
| submit-biz | implemented-unverified | prototypes/bivaque-html/src/features/businesses/editor.js:1 | perform:69 |
| submit-event | no-handler | prototypes/bivaque-html/src/features/events/editor.js:1 | ausente |
| submit-group | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:20 | groupAction:16 |
| submit-indicate | implemented-unverified | prototypes/bivaque-html/src/features/businesses/indication.js:1 | perform:74 |
| submit-item | implemented-unverified | prototypes/bivaque-html/src/features/listings/editor.js:7 | perform:48 |
| submit-post | implemented-unverified | prototypes/bivaque-html/src/features/groups/editors.js:11 | groupAction:19 |
| submit-recommend | implemented-unverified | prototypes/bivaque-html/src/app/handlers.js:71 | perform:72 |
| submit-report | no-handler | prototypes/bivaque-html/src/features/profile/demo-actions.js:3 | ausente |
| swipe-delete-thread | functional-tested | prototypes/bivaque-html/src/features/messaging/actions.js:49 | messagingAction:22 |
| thread-menu | functional-tested | prototypes/bivaque-html/src/features/messaging/views.js:1 | messagingAction:22, messagingAction:48 |
| thread-origin | functional-tested | prototypes/bivaque-html/src/features/messaging/views.js:8 | messagingAction:22, messagingAction:42 |
| undo | implemented-unverified | prototypes/bivaque-html/src/shell/primitives.js:24 | perform:108 |
| vote-poll | implemented-unverified | prototypes/bivaque-html/src/features/groups/views.js:79 | groupAction:31 |
| website | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:80 |
| whatsapp | implemented-unverified | prototypes/bivaque-html/src/features/businesses/detail.js:5 | perform:78 |

O JSON mantém TODOS os emissores/origens, variantes dinâmicas, rotas, calls/modais e bindings; esta tabela é somente índice.

## Reproduzir antes/depois

```powershell
node scripts/bivaque-html/navigation-inventory.mjs --output .visual/bivaque-html-round01/inventory-before.json --phase before
node scripts/bivaque-html/navigation-inventory.mjs --output .visual/bivaque-html-round01/inventory-after.json --phase after --compare .visual/bivaque-html-round01/inventory-before.json
```

Configure PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH quando necessário. --evidence troca o report de runtime, que pode fornecer actionCheckpoints: {action: [checkpoint, ...]} (todos presentes nos cases PASS e hash correspondente); --classification recebe JSON action -> {category: 2|4|5, reason, authority}. Sem nova prova compatível, o scanner nunca transforma handler em funcional testado.
