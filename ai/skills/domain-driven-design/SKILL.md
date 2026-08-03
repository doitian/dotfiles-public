---
name: domain-driven-design
description: Apply Domain-Driven Design when modeling or restructuring business logic — building a domain model with domain experts, naming things in a Ubiquitous Language, and shaping code with the DDD building blocks (Entity, Value Object, Service, Module, Aggregate, Factory, Repository) and strategic patterns (Bounded Context, Context Map, Anticorruption Layer, Distillation). Use when asked to design a domain model, review a model, choose between entity/value-object/service, define aggregate boundaries, split a large model across teams, integrate with a legacy or third-party system, or refactor an anemic domain layer.
---

# Domain-Driven Design

DDD is a way of building software whose structure mirrors the business domain
it serves. Its bet: for complex domains, the biggest source of long-term cost
is a mismatch between how the business thinks and how the code is arranged.
Close that gap and the software absorbs change; ignore it and every business
rule change becomes an archaeology exercise.

## When to apply this — and when not to

Apply DDD where the domain is genuinely intricate: rules with exceptions,
vocabulary that domain experts argue about, invariants that span several
objects, logic that outlives any particular UI or datastore.

Do **not** apply it everywhere. Evans is explicit about this pitfall: draw a
context map, decide where you will push for DDD, and stop worrying about the
rest. CRUD screens, reporting shells, thin integration glue, and math-only
computation modules are usually better served by simpler approaches. Forcing
DDD onto them produces ceremony without insight.

Also note the tooling assumption: DDD needs a language that can express a model
directly — objects with state *and* behavior, or an equivalent. Procedural code
where data structures and the functions over them are separated cannot
encapsulate the conceptual connections the model depends on.

## The core loop

DDD is not a phase you finish. It's a loop you stay in:

1. **Talk to domain experts.** They own the knowledge. Architects, analysts and
   developers do not. Ask questions, listen for the nouns and verbs they use
   unprompted, and note the words that make them correct you.
2. **Distill a model.** A model is not a diagram and not the expert's raw
   knowledge — it is a *rigorously organized, selective abstraction* of that
   knowledge. Selectivity is the work: a banking model tracks the customer's
   address, not their eye color. Deciding what to leave out is design.
3. **Name it in the Ubiquitous Language.** Every concept in the model gets one
   agreed term, used in speech, in writing, in diagrams and in code.
4. **Express it in code.** Class names, method names, and module names come
   from the model. If the code cannot express the model, that is feedback about
   the *model*, not just the code.
5. **Refactor toward deeper insight.** New understanding changes the model;
   changed model changes the code; changed code exposes new understanding.

The loop must close. A model handed one-way from analysts to developers gets
abandoned as soon as coding starts, because the analysts could not foresee the
persistence problems, the performance behavior, or the intricacies that only
surface in implementation.

## Non-negotiable rules

**Rule 1 — One model, serving both analysis and design.** Do not maintain a
separate "analysis model" that is analytically correct and a separate design
that is implementable. Pick a model that can be *both*. If a concept can't be
expressed naturally in code, revise the model rather than letting the code
drift away from it.

**Rule 2 — Modelers must code; coders must model.** Anyone contributing to the
model spends time touching the code. Anyone changing the code participates in
model discussions and has contact with domain experts. A modeler insulated from
implementation stops caring about its limits and produces an impractical model.

**Rule 3 — A change to the code is a change to the model.** And it must ripple
back through the language, the documents, and the team's shared understanding.
Silent divergence is how models die.

**Rule 4 — The Ubiquitous Language is binding.** No developer dialect, no
expert jargon, no per-team translation layer inside a context. When a term is
awkward, that is a signal to fix the model — experiment with alternative
expressions, then rename the classes, methods, and modules to match.

**Rule 5 — Isolate the domain layer.** Domain objects do not display
themselves, store themselves, or coordinate application tasks. See
`references/tactical-patterns.md`.

**Rule 6 — Every model has a context, and the context must be explicit.** On
anything larger than a single team, name your Bounded Contexts and map their
relationships. See `references/strategic-patterns.md`.

## Working the Ubiquitous Language

The language is built, not declared. Practical strategies:

- **Mine the conversation.** In discussion with experts, watch for the word that
  makes the model click ("route", "fix", "flight plan"). When a new term earns
  its place, put it in the model immediately.
- **Let the language change the model.** In the book's air-traffic example, once
  the team saw that they were tracking *flights* rather than *aircraft*, the
  root of the model changed. Vocabulary shifts are model shifts.
- **Reject terms experts don't recognize.** If a domain expert can't follow the
  model or the language, something is wrong with the model. Conversely,
  developers watch for ambiguity and inconsistency the experts won't notice.
- **Prefer many small diagrams over one big one.** A handful of classes plus
  prose explaining behavior and constraints. One unified mega-diagram is either
  impossible to draw or too cluttered to teach anything.
- **Keep documents short and current.** Long documents go stale before they are
  finished. Hand-drawn sketches communicate "this is provisional", which is
  usually true.
- **Don't rely on code alone.** Code that functionally does the right thing does
  not necessarily *express* the right thing. Diagrams, prose, and speech
  supplement it.
- **Modules and Bounded Contexts get names from the language too.**

## Choosing a building block

| Question | Answer |
|---|---|
| Does it have a thread of identity and continuity across states, independent of its attributes? | **Entity** |
| Do we care only about *what* it is, never *which* one? | **Value Object** (make it immutable) |
| Is it a significant domain operation that belongs to no single object, and is stateless? | **Service** |
| Is it a cluster of objects that must change together under a shared invariant? | **Aggregate**, with one Entity as root |
| Is construction complex, or does creating one object require creating several? | **Factory** |
| Does a client need to find pre-existing instances of an Aggregate root? | **Repository** |
| Is the model too big to discuss as a whole? | **Modules** |
| Is a yes/no business rule bloating an object? | **Specification** |
| Is an invariant buried inside a method? | Extract a **Constraint** |

Full semantics, tradeoffs, and worked guidance: `references/tactical-patterns.md`.

## Refactoring toward deeper insight

Nouns-become-classes / verbs-become-methods gives a shallow model. Shallow is
expected at the start; staying shallow is the failure. Deepening the model is
covered in `references/refactoring-toward-insight.md` — how to spot implicit
concepts, when a Breakthrough is worth its cost, and making Constraint,
Process, and Specification explicit.

## Strategic design

On multi-team or enterprise work, a single unified model is usually not
achievable and often not worth attempting. Divide deliberately into Bounded
Contexts with defined borders and defined relationships. Then choose the right
relationship pattern — Shared Kernel, Customer/Supplier, Conformist,
Anticorruption Layer, Separate Ways, Open Host Service — and distill the Core
Domain out of the supporting mass. See `references/strategic-patterns.md`.

## How to review a design against DDD

Work through these; each failure points at a specific remedy.

- Can a newcomer learn the business by reading the domain layer? If not, the
  model isn't in the code.
- Do the class and method names match what experts say out loud? Mismatches are
  Ubiquitous Language failures.
- Is there business logic in UI event handlers, controllers, database scripts,
  or stored procedures? Layering failure.
- Are Entities and Value Objects bags of getters and setters, with all behavior
  in "manager"/"helper"/"service" classes? Anemic domain — behavior belongs
  with the data it governs, and only genuinely object-less operations become
  Services.
- Is every object an Entity with an ID? Over-identification. It costs
  performance and design clarity; demote to Value Objects.
- Are Value Objects mutable and shared? Data-integrity bug waiting to happen.
- Can outside code reach inside an Aggregate and mutate it? Broken boundary;
  invariants are unenforceable.
- Are there Repositories for non-root objects? Aggregate encapsulation is being
  bypassed.
- Is SQL or ORM query code scattered through the domain layer? Repository
  failure — the domain is being dragged into infrastructure.
- Does one term mean two different things in different parts of the system?
  Either unify the model or draw a Bounded Context boundary and name both.
- Is a third-party or legacy model's vocabulary leaking into your domain? You
  need an Anticorruption Layer.
- Can the team point at the Core Domain? If not, distillation hasn't happened
  and the best people are probably working on generic subdomains.

## Pitfalls

- **Analysis paralysis.** Modeling is creative; expect mistakes and iterate.
  Anchor abstract thinking in concrete scenarios.
- **Over-engineering by pattern.** Don't create a Service for every operation, a
  Factory for every construction, or an Aggregate for every cluster. Each
  pattern earns its place by solving a problem you actually have.
- **Under-engineering out of fear.** Fear of over-engineering also drives teams
  away from thinking deeply. Continuous refactoring without design principles
  produces code that is hard to understand or change.
- **Frozen modules.** Module structure is allowed to evolve. Module refactoring
  costs more than class refactoring, but working around a bad module structure
  costs more still.
- **Treating DDD as a solo practice.** It's a team activity built on shared
  language. Applying it alone, without expert access, gets you the patterns
  without the payoff.
