---
name: domain-driven-design
description: Apply Domain-Driven Design to business logic. Use when designing or reviewing a domain model, choosing between entity/value-object/service, defining aggregate boundaries, splitting a model across teams, integrating with a legacy or third-party system, or refactoring an anemic domain layer.
---

# Domain-Driven Design

DDD structures software to mirror the business domain it serves. The bet: in a
complex domain, the biggest long-term cost is the mismatch between how the
business thinks and how the code is arranged.

## References

| Read this | When |
|---|---|
| `references/tactical-patterns.md` | Entity, Value Object, Service, Module, Aggregate, Factory, Repository — full semantics and tradeoffs |
| `references/strategic-patterns.md` | Bounded Context, Context Map, Anticorruption Layer, Core Domain distillation — multi-team and integration work |
| `references/refactoring-toward-insight.md` | Deepening a shallow model: implicit concepts, Breakthrough, explicit Constraint/Process/Specification |
| `references/review-checklist.md` | Reviewing an existing design, and the pitfalls to name |

## Where DDD belongs

Apply it where the domain is genuinely intricate: rules with exceptions,
vocabulary experts argue about, invariants spanning several objects, logic that
outlives any particular UI or datastore.

Not everywhere. Evans is explicit: decide where you will push for DDD and stop
worrying about the rest. CRUD screens, reporting shells, thin integration glue
and math-only modules are better served by simpler approaches — forcing DDD onto
them produces ceremony without insight. DDD also assumes a language that can
express a model directly: objects with state *and* behavior, or an equivalent.

## The core loop

Not a phase you finish:

1. **Talk to domain experts.** They own the knowledge. Listen for the nouns and
   verbs they use unprompted, and the words that make them correct you.
2. **Distill a model** — a rigorously organized, *selective* abstraction, not a
   diagram and not the expert's raw knowledge. Deciding what to leave out is the
   design work: a banking model tracks the customer's address, not their eye
   color.
3. **Name it in the Ubiquitous Language** — one agreed term per concept, used in
   speech, writing, diagrams and code.
4. **Express it in code.** If the code can't express the model, that is feedback
   about the *model*.
5. **Refactor toward deeper insight**, and go round again.

The loop must close. A model handed one-way from analysts to developers gets
abandoned at first contact with persistence, performance, and the intricacies
that only surface in implementation.

## Non-negotiable rules

1. **One model serves both analysis and design.** No separate "analysis model"
   that is correct but unimplementable.
2. **Modelers code; coders model.** A modeler insulated from implementation
   stops caring about its limits.
3. **A change to the code is a change to the model** — ripple it back through
   the language, the docs, and the team's understanding.
4. **The Ubiquitous Language is binding.** No developer dialect, no per-team
   translation inside a context. An awkward term is a signal to fix the model,
   then rename the classes and modules to match.
5. **Isolate the domain layer.** Domain objects don't display themselves, store
   themselves, or coordinate application tasks.
6. **Every model has a context, and the context is explicit.** Beyond one team,
   name the Bounded Contexts and map their relationships.

## Choosing a building block

| Question | Answer |
|---|---|
| Thread of identity and continuity across states, independent of its attributes? | **Entity** |
| We care only *what* it is, never *which* one? | **Value Object** (immutable) |
| Significant domain operation belonging to no single object, and stateless? | **Service** |
| Cluster of objects that must change together under a shared invariant? | **Aggregate**, one Entity as root |
| Construction complex, or creating one object requires creating several? | **Factory** |
| Client needs to find pre-existing instances of an Aggregate root? | **Repository** |
| Model too big to discuss as a whole? | **Modules** |
| Yes/no business rule bloating an object? | **Specification** |
| Invariant buried inside a method? | Extract a **Constraint** |

## Working the Ubiquitous Language

Built, not declared. Mine expert conversation for the word that makes the model
click, and let vocabulary shifts move the model — once the air-traffic team saw
they tracked *flights* rather than *aircraft*, the root of the model changed. If
an expert can't follow the language, the model is wrong. Prefer many small
diagrams with prose over one mega-diagram, keep documents short enough to stay
current, and name Modules and Bounded Contexts from the language too.
