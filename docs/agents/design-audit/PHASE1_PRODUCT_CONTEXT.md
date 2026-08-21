# Phase 1 product context — sanitized input

> **Purpose:** this is the only Bivaque product-context document that a Phase 1 reference-design agent may consume.
>
> It intentionally excludes incumbent UI, navigation, visual rules, breakpoints, tokens, wrappers, component geometry, screenshots, implementation state, migrations, historical audit findings, and descriptions of how the current product is rendered.
>
> This file is an input to an independent design benchmark. It is not a description of the current interface.

## 1. Product problem

Bivaque is a controlled-access community product for Brazil's federal military community and adjacent eligible roles.

The core problem is not lack of communication channels. Existing large messaging groups mix transient conversation, durable information, local recommendations, events, questions, and service-provider discovery into a single noisy stream. Useful information becomes hard to recover, people mute the channel, and relevant local knowledge does not compound over time.

Bivaque should reduce the tradeoff between **noise** and **missing what matters** by giving durable information and conversation an appropriate context and scope.

## 2. Product proposition

Bivaque is a community network with eligibility checked at entry and access constrained by the user's role and memberships.

Manaus is the initial operational pilot, but the product model must not assume that eligibility or future operation is permanently limited to one city.

Bivaque is community-operated and is not an official channel of the Brazilian Armed Forces.

## 3. Eligible roles

The product must accommodate these product roles:

### Member

A federal military member, veteran, or pensioner whose eligibility is checked through an approved verification path.

Members may access content and capabilities permitted by their locality/community/group memberships.

### Dependent

A person admitted through a verified titular relationship. The dependent has an independent account rather than acting through the titular's account.

### Civil service provider

A provider introduced/endorsed through the community. A provider is not equivalent to a community member and must not gain member-only reading privileges merely because a provider profile exists.

### Operator

A product-governance role responsible for controlled administrative/moderation/admission operations.

### Community owner

A role responsible for governance of a specific community, including membership decisions and delegated governance where permitted.

## 4. Community model

Bivaque has three conceptual membership scopes:

### Locality

A geographic/local operating context. A person may belong to a locality while also belonging to narrower contexts inside it.

### Community

A subset defined by a real-world circumstance or affiliation that exists independently of an interest in the app.

Examples of the category may include a residential military community or another circumstance-based cohort.

### Group

A thematic or interest-based subset inside the relevant community context.

The governing distinction is:

- circumstance-based belonging → community;
- interest-based belonging → group.

Membership is additive: belonging to a narrower context does not erase the broader locality context.

"Public" is relative to the containing access scope. Content that is public inside a restricted community does not thereby become public to every member of the locality or to the open internet.

## 5. Trust and access-control invariants

The reference design must preserve these product invariants without prescribing the incumbent implementation:

- Access is controlled; eligibility is checked according to role.
- Different facts may be attested by different appropriate actors or systems.
- A dependent's eligibility derives from the verified relationship, not by pretending the dependent passed the member verification path.
- A service provider is not a member and must not inherit member-only access.
- Restricted locality/community/group boundaries must remain legible to the user and resistant to accidental disclosure.
- Failure states must not disclose sensitive eligibility information unnecessarily.
- Sensitive verification data should be minimized and should not become decorative social status.
- User-facing design must not imply official Armed Forces endorsement or institutional ownership.

## 6. Privacy principles relevant to UX

The design should follow privacy-by-default principles appropriate to a controlled-access community:

- collect/display only what the user needs to complete the task;
- do not expose sensitive identity/eligibility details merely to signal trust;
- make scope and audience understandable before consequential publishing or sharing;
- provide understandable consent and privacy communication where required;
- distinguish authorization failure, unavailable content, true empty state, recoverable error, and loading where those states materially affect user understanding;
- avoid interaction patterns that encourage accidental publication into a broader scope than intended.

This document intentionally does not prescribe current database fields, current privacy UI, or current implementation state.

## 7. Core user outcomes

A production-quality reference design should support, at minimum, these outcomes without assuming the incumbent navigation solution:

### Understand what matters now

A member should be able to identify relevant current activity and durable information without being forced through one undifferentiated stream.

### Participate in scoped community discussion

A member should be able to read and contribute within the locality/community/group scopes they are entitled to access, while understanding the audience of the contribution.

### Recover durable local knowledge

Useful answers, recommendations, guidance, and recurring information should remain findable after the moment in which they were originally shared.

### Discover local/community services

Eligible members should be able to discover community-relevant service providers and understand the trust context of those listings without confusing providers with verified members.

### Discover relevant events and local information

The product should support discovery of time-bound and durable local/community information without requiring every item to compete in the same conversational stream.

### Join and understand narrower contexts

Users should be able to understand which locality, communities, and groups they belong to, how those contexts relate, and what access/audience consequences follow from that membership.

### Govern safely

Authorized governance roles need clear, auditable operational workflows for admission, moderation, membership, and community governance. Member-facing and operator-facing concerns should not be conflated merely for implementation convenience.

## 8. Product constraints for the pilot

The reference may propose the best interaction architecture for the product, but it should respect these scope constraints unless explicitly labeling a post-pilot recommendation:

- The pilot is intended to reach real users rather than become an open-ended platform build.
- Community participation and durable local knowledge are central to the pilot value proposition.
- Service-provider discovery is a product capability, but Bivaque does not need to intermediate payment in the pilot.
- Private one-to-one chat is not required for the pilot; do not design the product around private messaging as a foundational dependency.
- New dependencies, component libraries, or state-management systems are not authorized merely by the reference-design exercise.

## 9. Technical envelope

The reference design must be feasible within the project's selected implementation envelope:

- Next.js 16.3.x;
- React 19;
- HeroUI v3 as the component-system foundation;
- Tailwind CSS 4;
- Supabase-backed authentication/data services.

These choices constrain implementation feasibility. They do **not** validate any incumbent wrapper, token, component usage, interaction pattern, visual style, or rendered UI.

For framework/component behavior, consult version-matched installed documentation and current maintainer sources rather than model memory.

## 10. What this input deliberately does not answer

Phase 1 must independently determine or explicitly mark for experiment:

- primary navigation model;
- number of primary destinations;
- mobile vs desktop navigation treatment;
- page/surface hierarchy;
- information density;
- layout grids and max widths;
- breakpoints;
- typography family/scale;
- colors and semantic palette;
- spacing scale;
- radii;
- card usage;
- shells/wrappers;
- component geometry;
- iconography;
- motion;
- visual brand expression;
- exact responsive behavior;
- the best presentation of locality/community/group context;
- how events, provider discovery, durable knowledge, and conversation should be surfaced relative to one another.

If a reference-design agent believes one of those answers is already implied by this brief, it must state the reasoning rather than treating an incumbent solution as known.

## 11. Sanitization contract

This file must remain free of incumbent design/implementation evidence.

Do not add:

- statements of what the current UI does;
- current screenshots or screenshot descriptions;
- current file/component names from UI implementation;
- current visual tokens or exact incumbent values;
- current breakpoints/navigation geometry;
- current wrapper/component inventory;
- current visual-audit findings;
- migration/database implementation history unless it is converted into a technology-independent product invariant;
- comparisons such as "currently X, should Y".

If a future product fact cannot be added without carrying incumbent-solution evidence, add only the solution-independent product constraint or leave it as `PHASE_1_INPUT_GAP` for explicit resolution.