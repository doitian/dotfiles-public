# Reviewing a design against DDD

Work through these. Each failure points at a specific remedy.

## Model in the code

- Can a newcomer learn the business by reading the domain layer? If not, the
  model isn't in the code.
- Do class and method names match what experts say out loud? Mismatches are
  Ubiquitous Language failures.
- Is there business logic in UI event handlers, controllers, database scripts,
  or stored procedures? Layering failure.
- Is the model still nouns-as-classes and verbs-as-methods? Shallow is fine at
  the start, permanent shallowness is the failure — see
  `refactoring-toward-insight.md`.

## Building blocks

- Are Entities and Value Objects bags of getters and setters, with all behavior
  in "manager"/"helper"/"service" classes? Anemic domain — behavior belongs with
  the data it governs, and only genuinely object-less operations become Services.
- Is every object an Entity with an ID? Over-identification; it costs
  performance and design clarity. Demote to Value Objects.
- Are Value Objects mutable and shared? A data-integrity bug waiting to happen.
- Can outside code reach inside an Aggregate and mutate it? Broken boundary;
  invariants are unenforceable.
- Are there Repositories for non-root objects? Aggregate encapsulation is being
  bypassed.
- Is SQL or ORM query code scattered through the domain layer? Repository
  failure — the domain is being dragged into infrastructure.

## Boundaries

- Does one term mean two different things in different parts of the system?
  Either unify the model or draw a Bounded Context boundary and name both.
- Is a third-party or legacy model's vocabulary leaking into your domain? You
  need an Anticorruption Layer.
- Can the team point at the Core Domain? If not, distillation hasn't happened
  and the best people are probably working on generic subdomains.

## Pitfalls to call out

- **Analysis paralysis.** Modeling is creative; expect mistakes and iterate.
  Anchor abstract thinking in concrete scenarios.
- **Over-engineering by pattern.** Not a Service for every operation, a Factory
  for every construction, or an Aggregate for every cluster. Each pattern earns
  its place by solving a problem you actually have.
- **Under-engineering out of fear.** Fear of over-engineering also drives teams
  away from thinking deeply. Continuous refactoring without design principles
  produces code that is hard to understand or change.
- **Frozen modules.** Module structure is allowed to evolve. Module refactoring
  costs more than class refactoring; working around a bad module structure costs
  more still.
- **Treating DDD as a solo practice.** It's a team activity built on shared
  language. Applied alone, without expert access, you get the patterns without
  the payoff.
