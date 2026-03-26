# SkolrMono Agent

# Description

SkolrMono est un monorepo contenant plusieurs services pour une application éducative. Ce dépôt utilise une architecture modulaire pour organiser les différents services et bibliothèques. Skolr.

# Technologies

- Bun
- TypeScript
- Fastify
- PostgreSQL
- Docker
- Nuxt

# Commands

- `bun run dev`: Démarre le serveur en mode développement.
- `bun run build`: Construit le projet pour la production.
- `bun run start`: Démarre le serveur en mode production.

# Restrictions

- **Do not modify the project structure**: The modular architecture must remain intact. Avoid reorganizing directories or files unless explicitly requested.
- **Do not introduce external dependencies**: Only use libraries and tools already specified in the project's dependency management files.
- **Do not hardcode sensitive information**: Avoid embedding API keys, passwords, or other sensitive data directly in the code.
- **Do not bypass existing patterns**: Follow the established design patterns and coding conventions used in the project.
- **Do not use deprecated features**: Ensure that all used features are up-to-date and not deprecated.
- **Do not assume user intent**: Always clarify requirements or ambiguities with the user before making significant changes.
- **Do not ignore diagnostics**: Address errors and warnings promptly, but defer to the user if the issue is unclear or complex.
- **Do not simplify code unnecessarily**: Prioritize correctness and completeness over minimalism.

# Coding Standards

- **Use consistent naming conventions**: Follow the project's naming conventions for variables, functions, and classes.
- **Write clean and readable code**: Use meaningful variable names, proper indentation, and clear comments.
- **Follow best practices**: Adhere to industry best practices for coding, such as error handling and security.
- **Test Driven Development**: Write tests before implementing new features to ensure code quality and reliability.
- **Documentation on swagger**: Ensure that all API endpoints are documented using Swagger. The project gateaway should always have documented on his swagger
- **Use CI/CD**: Implement continuous integration and continuous deployment pipelines to automate testing and deployment processes.
- **Use Jest**: Write unit tests using Jest to ensure code quality and reliability.
- **ESLINT**: Implement to use camelCase, single quote and ';'
- **Knip**: Implement to remove unused dependencies and files
- **Prettier**: Implement to format code automatically
- **Husky**: Implement to run pre-commit hooks to ensure code quality and reliability
- **Secret Management**: Use environment variables to manage sensitive information and secrets.

# Commit Rules 

- **Use semantic commit messages**: Follow the conventional commit format (type(scope): subject) to ensure clarity and consistency.
- **Keep commits small and focused**: Each commit should represent a single logical change.
- **Avoid merge commits**: Prefer rebasing or squashing commits to keep the commit history clean.
- **Document changes**: Include a brief description of the changes in the commit message.
- **Review and lint**: Ensure that the code adheres to the project's coding standards and conventions.
