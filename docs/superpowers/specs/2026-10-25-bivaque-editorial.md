# Bivaque editorial visual redesign (25/10/2026)
## Design specification
**Goal:** Replace the generically generated appearance of the shadcn prototype without changing module URLs, fake-data semantics, or shadcn primitives.
**Evidence:** Visual-baseline R72 and approved brand tokens; component-level audit (23 Card, 17 Alert, 21 Badge appearances in UI code); Mobbin Airbnb listings and Nextdoor feeds.
**Direction selected:** Editorial, content-led, mobile-first. Not dashboard and not landing page. Keep housing photo-dominant, community text-and-person-led, services provider-oriented, home discovery-oriented.
**Constraints:** Bivaque national. Default Brasília is sample; preserve city selection and no fabricated results in other cities. Use brand Grafite/Papel/Brasa, Noto fonts, official logo. Brasa only for Create and decisive CTAs. No payments/back-end. Source page and R72 untouched.
**Screens:** Home, Imóveis, Comunidade, Negócios. Other modules retain existing implementation.
**Navigation:** Desktop compact dark sidebar with 4 primary + key discovery links; rest via More menu. Mobile slim header plus fixed 5-target bottom nav.
**Visual QA:** Ensure at 375/768/1440 width, useful content starts early, no nesting of generic cards, no unreadable dark UI, responsive cards, real clickable actions retained. Contrast test remains active.
## Considered approaches
1. Tune spacing/color only: cheapest, doesn't fix architecture.
2. **Replace the four compositions with editorial patterns while reusing shadcn logic:** selected; best visual improvement and maintains functions.
3. Brand new app in a new stack: higher risk to preserved journeys, rejected.
