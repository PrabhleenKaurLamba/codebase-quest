# Codebase Quest

Codebase Quest is an interactive onboarding tool designed to help engineers understand an unfamiliar codebase faster.

## The Problem

Joining a new team often means spending days navigating an unfamiliar repository, figuring out what different parts of the system do, and piecing together how a request flows through the code. Traditional documentation and AI chat can answer individual questions, but they don't provide a structured way to build a mental model of the system.

Codebase Quest turns that onboarding process into a guided experience. Instead of simply asking an AI to summarize a repository, the user explores the codebase through structured challenges that encourage them to understand architecture, dependencies, and execution flow.

## Key Decisions

- **Focused on onboarding rather than generic code review or chat.** The goal is to help someone develop an understanding of the system, not just generate summaries.
- **Kept the MVP intentionally lightweight.** There is no GitHub authentication, database, or unnecessary infrastructure.
- **Used an interactive UI** so the experience feels more like exploring a codebase than reading a long AI-generated document.
- **Used AI where it adds meaningful value**—understanding repository context and generating personalized explanations/challenges—while keeping the core product flow deterministic and easy to understand.
- **Built with Next.js and Vercel's AI tooling**, using the AI SDK for the application-level AI interaction and AI Gateway for model access.

## AI-Assisted Development

I used **OpenAI Codex** during development as a coding partner. Codex helped with implementation, debugging, refactoring, and iterating on parts of the application.

I drove the **product direction and engineering decisions** myself: defining the onboarding problem, deciding what the MVP should include, choosing the interaction model, determining which Vercel products were actually necessary, and reviewing/testing the generated code. I also made the final decisions about UX, scope, and tradeoffs rather than treating AI-generated code as a black box.

The goal was to use AI to accelerate implementation while still maintaining ownership of the architecture and product.
