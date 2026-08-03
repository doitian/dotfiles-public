# Refactoring toward deeper insight

## Two kinds of refactoring

**Technical refactoring** redesigns code without changing behavior, in small
controlled steps, backed by automated tests. It follows known patterns and tool
support makes it cheap.

**Refactoring toward deeper insight** is different in kind. It is motivated by
a new understanding of the *domain* — something becomes clearer, or a
relationship between two elements is discovered — and it changes the model, not
just its expression. It cannot be reduced to patterns or automated. The variety
and complexity of models rules out a mechanistic approach. A good model comes
from deep thinking, insight, experience, and flair.

Both matter. This document is about the second.

## Shallow models and deep models

The standard advice — read the specification, turn nouns into classes and verbs
into methods — is a simplification that yields a **shallow model**. Every model
starts shallow. The failure is staying there.

A **deep model** sloughs off the superficial and captures the essential: the
subtle concerns domain experts actually care about, expressed in a way that
drives a practical design. Software built on one is more in tune with how
experts think and more responsive to users' needs.

Sophisticated domain models are seldom developed except through an iterative
process of refactoring with domain experts closely involved alongside
developers who are genuinely interested in learning the domain.

## Design must be flexible enough to refactor

A stiff design resists refactoring. Code not built with flexibility in mind
fights you: changes that ought to be easy take a long time. Using a proven set
of building blocks plus a consistent language brings enough sanity to the effort
that the real challenge — finding an incisive model — becomes the thing you
spend your time on.

## Breakthroughs

Refactoring proceeds in small steps yielding small improvements. Occasionally a
few changes make an enormous difference: a **Breakthrough**.

The sequence: start with a coarse, shallow model → refine model and design with
deeper domain knowledge → add new concepts and abstractions → refactor → each
refinement adds clarity → clarity creates the conditions for a Breakthrough.

A Breakthrough involves a change in how you *see* the model. It's a source of
great progress, but it has real costs:
- it can imply a large amount of refactoring, consuming time and resources;
- ample refactoring is risky, since it can introduce behavioral changes.

Judge accordingly — but don't refuse the insight because the refactoring looks
expensive.

## Making implicit concepts explicit

The route to a Breakthrough is usually to take a concept that is implicit — used
to explain other concepts already in the model, but never modeled itself — and
make it explicit, with its own class and relationships. If a concept is a domain
concept, it belongs in the model and the design.

Four ways to find them:

**1. Listen to the language.** The Ubiquitous Language accumulates information
about the domain. Key concepts work their way into it as the team learns. Start
looking there.

**2. Examine awkwardness in the design.** A set of relationships that makes the
path of computation hard to follow, or procedures doing something complicated
and hard to understand — these mark where something is missing. When a key
concept is absent, other objects absorb its functionality, fattening up with
behavior that isn't theirs, and clarity suffers. Find the missing concept, make
it explicit, and refactor to something simpler and suppler.

**3. Reconcile contradictions.** When one expert's account contradicts another,
or one requirement seems to contradict another, dig in. Often these aren't real
contradictions but two ways of seeing the same thing, or imprecise explanation.
Resolving them frequently surfaces an important concept — and even when it
doesn't, the clarity is worth having.

**4. Read the domain literature.** Books exist on nearly every domain and carry
deep knowledge. They rarely contain usable models; the information has to be
processed, distilled, and refined. It's still valuable.

## Three concepts especially worth making explicit

### Constraint

A Constraint is a simple way to express an invariant: whatever happens to the
object's data, the invariant holds. Implement it by putting the invariant logic
somewhere it is visible in its own right rather than buried in the flow of a
method.

Concretely: a `Bookshelf` with a `capacity` and a `content` collection must never
exceed capacity. Rather than an inline `if (content.size() + 1 <= capacity)`
inside `add()`, extract a named predicate — `isSpaceAvailable()` — and have
`add()` consult it.

Benefits: the constraint is explicit and easy to read; anyone can see that
`add()` is subject to it; and there is room to grow when the constraint gets
more complex.

### Process

Processes would be procedures in a procedural language. In an object-oriented
model you need an object to carry the behavior. The best way to implement a
process is as a **Service**. If there are several ways to carry out the process,
encapsulate the algorithm in an object and use a **Strategy**.

Not every process should be made explicit. The test: if the Ubiquitous Language
specifically names the process, it is time for an explicit implementation.

### Specification

A Specification tests an object to see whether it satisfies some criteria.

The domain layer holds business rules that apply to Entities and Value Objects,
and those rules normally live on the objects they apply to. But some rules are
yes/no questions answered by combining boolean tests — and those can grow large
enough to bloat the object past its original purpose. "Is this customer eligible
for credit?" involves verifying credentials, checking payment history, and
checking outstanding balances. Attaching all of that to `Customer` as
`isEligible()` is how `Customer` stops being about customers.

The temptation at that point is to push the rule up to the application layer,
because it seems to stretch beyond the domain. That's the wrong move — it's time
for a refactoring instead.

**Encapsulate the rule in its own object, kept in the domain layer.** It carries
boolean methods, each a small test; combined, they answer the original question.
If the rule is not collected into one Specification object, its code ends up
spread across several objects and turns inconsistent.

Uses for a Specification:
- test whether an object fulfills a need or is ready for a purpose;
- select objects from a collection (including as Repository query criteria);
- act as a condition during object creation.

**Compose them.** A single Specification typically checks one simple rule;
several are then combined into a composite expressing the complex rule. A
composite built from `CustomerPaidHisDebtsInThePast` and
`CustomerHasNoOutstandingBalances`, asked `isSatisfiedBy(customer)`, makes the
meaning of "eligible for a refund" obvious from reading the code — and each
simple rule is easy to test on its own.
